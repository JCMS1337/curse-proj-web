/**
 * scripts/fetch-real-photos.js
 * Скрипт поиска и локальной загрузки реальных иллюстративных фотографий спортивных площадок
 * из Wikimedia Commons API со свободными лицензиями (CC0, Public Domain, CC BY, CC BY-SA).
 * 
 * Запуск: npm run photos:fetch
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

const USER_AGENT = 'SportBook/1.0 (educational project; contact support@sportbook.example)';
const MIN_WIDTH = 1000;
const TARGET_CANDIDATES_PER_SPORT = 8;
const MIN_REQUIRED_CANDIDATES = 4;

// Запросы по видам спорта
const SPORT_QUERIES = {
  football: [
    'artificial turf football pitch',
    'outdoor football pitch',
    'mini football pitch',
    'футбольное поле стадион'
  ],
  basketball: [
    'outdoor basketball court',
    'streetball court',
    'public basketball court',
    'outdoor basketball hoop court'
  ],
  volleyball: [
    'sand volleyball court',
    'outdoor sand volleyball courts',
    'outdoor volleyball court',
    'beach volleyball court net'
  ],
  universal: [
    'Multi-Use Games Area',
    'MUGA geograph',
    'cancha de usos multiples',
    'multipurpose court outdoor',
    'ballbinge skole'
  ],
  athletics: [
    'athletics running track',
    'tartan track stadium',
    'running track outdoor',
    'стадион беговая дорожка'
  ]
};

// Проверка разрешенной лицензии (CC0, PD, CC BY, CC BY-SA; без NC, ND, fair use)
function isAllowedLicense(licenseShortName, usageTerms) {
  const lic = (licenseShortName || '').toLowerCase().trim();
  const terms = (usageTerms || '').toLowerCase().trim();
  const combined = `${lic} ${terms}`;

  if (!combined.trim()) return false;

  // Строго запрещенные ограничения
  if (combined.includes('-nc') || combined.includes(' nc') || combined.includes('non-commercial') || combined.includes('noncommercial')) return false;
  if (combined.includes('-nd') || combined.includes(' nd') || combined.includes('no derivatives') || combined.includes('noderivatives')) return false;
  if (combined.includes('fair use') || combined.includes('copyrighted') || combined.includes('all rights reserved')) return false;

  // Разрешенные лицензии
  if (combined.includes('cc0') || combined.includes('public domain') || combined.includes('pd-') || combined.includes('no restrictions')) return true;
  if (combined.includes('cc by-sa') || combined.includes('cc-by-sa') || combined.includes('attribution-sharealike')) return true;
  if (combined.includes('cc by') || combined.includes('cc-by') || combined.includes('attribution')) return true;

  return false;
}

// Очистка HTML тегов и сущностей в поле автора
function cleanAuthor(html) {
  if (!html) return 'Wikimedia Commons contributor';
  let text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
  text = text.replace(/^User:/i, '').trim();
  return text || 'Wikimedia Commons contributor';
}

// Фильтр против чертежей, схем, карт, плакатов и скриншотов
function isSuitableImage(title, categories, extmetadata) {
  const fullText = `${title} ${categories || ''} ${extmetadata?.ObjectName?.value || ''} ${extmetadata?.ImageDescription?.value || ''}`.toLowerCase();
  
  const badKeywords = [
    'logo', 'diagram', 'diagramm', 'scheme', 'schema', 'plan', 'blueprint', 'map', 'drawing',
    'illustration', 'vector', 'svg', 'icon', 'flag', 'poster', 'screenshot', 'coin', 'stamp',
    'coat of arms', 'emblem', 'badge', 'graph', 'chart', 'caricature', 'cartoon', 'portrait', 'close up',
    'fish', 'koi', 'duck', 'dendrocygna', 'market', 'church', 'tram', 'bern', 'cathedral', 'train'
  ];

  for (const kw of badKeywords) {
    if (fullText.includes(kw)) return false;
  }
  return true;
}

// Задержка (пауза между запросами к Wikimedia Commons)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Выполнение HTTPS GET запроса с User-Agent
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

// Скачивание бинарного файла по HTTPS
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
  });
}

async function searchSportPhotos(sportKey, queries) {
  const candidates = [];
  const seenTitles = new Set();

  for (const query of queries) {
    if (candidates.length >= TARGET_CANDIDATES_PER_SPORT) break;

    console.log(`  [Поиск] "${query}" для вида ${sportKey}...`);
    const encodedQuery = encodeURIComponent(query);
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodedQuery}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1200&format=json`;

    try {
      await sleep(1100); // Обязательная пауза >= 1с между запросами
      const data = await fetchJson(apiUrl);
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];

      for (const page of pages) {
        if (candidates.length >= TARGET_CANDIDATES_PER_SPORT) break;

        const title = page.title;
        if (!title || seenTitles.has(title)) continue;
        seenTitles.add(title);

        const info = page.imageinfo?.[0];
        if (!info) continue;

        // Фильтр MIME: только jpeg или png
        const mime = (info.mime || '').toLowerCase();
        if (mime !== 'image/jpeg' && mime !== 'image/png') continue;

        // Фильтр по ширине
        const width = info.width || 0;
        if (width < MIN_WIDTH) continue;

        const extmeta = info.extmetadata || {};
        const licenseShort = extmeta.LicenseShortName?.value || '';
        const usageTerms = extmeta.UsageTerms?.value || '';
        const categories = extmeta.Categories?.value || '';

        // Проверка лицензии
        if (!isAllowedLicense(licenseShort, usageTerms)) continue;

        // Фильтр типа изображения
        if (!isSuitableImage(title, categories, extmeta)) continue;

        // Извлечение атрибутов
        const author = cleanAuthor(extmeta.Artist?.value || '');
        const license = licenseShort || usageTerms || 'CC BY-SA';
        const licenseUrl = extmeta.LicenseUrl?.value || 'https://creativecommons.org/licenses/';
        const sourceUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`;
        const cleanTitle = (extmeta.ObjectName?.value || title.replace(/^File:/i, '')).replace(/_/g, ' ');
        const thumbUrl = info.thumburl || info.url;

        candidates.push({
          sport: sportKey,
          filename: title.replace(/^File:/i, ''),
          author,
          license,
          license_url: licenseUrl,
          source_url: sourceUrl,
          title: cleanTitle,
          thumburl: thumbUrl,
          width,
          height: info.height || 0
        });

        console.log(`    + Кандидат #${candidates.length}: ${cleanTitle.slice(0, 40)} (${license})`);
      }
    } catch (err) {
      console.warn(`    [Ошибка запроса] ${err.message}`);
    }
  }

  return candidates;
}

async function main() {
  console.log('========================================================================================');
  console.log('         ПОИСК И ЗАГРУЗКА РЕАЛЬНЫХ ФОТОГРАФИЙ ПЛОЩАДОК (SportBook)              ');
  console.log('========================================================================================\n');
  console.log(`Источники: Wikimedia Commons API`);
  console.log(`Разрешённые лицензии: CC0, Public Domain, CC BY, CC BY-SA (без NC/ND/fair use)`);
  console.log(`Sharp модуль: ${sharp ? 'Установлен (оптимизация до 1200x900 cover, q80)' : 'Не установлен (сохранение оригиналов)'}\n`);

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const allCandidates = {};
  const sportsWithDeficit = [];

  for (const [sportKey, queries] of Object.entries(SPORT_QUERIES)) {
    console.log(`\nПоиск фото для категории [${sportKey.toUpperCase()}]:`);
    const candidates = await searchSportPhotos(sportKey, queries);
    allCandidates[sportKey] = candidates;

    if (candidates.length < MIN_REQUIRED_CANDIDATES) {
      sportsWithDeficit.push({ sport: sportKey, count: candidates.length });
    }
  }

  // Сохранение таблицы кандидатов в data/photo-candidates.json
  const candidatesFilePath = path.join(dataDir, 'photo-candidates.json');
  fs.writeFileSync(candidatesFilePath, JSON.stringify(allCandidates, null, 2), 'utf-8');
  console.log(`\nКандидаты сохранены в: ${candidatesFilePath}`);

  // Скачивание и сохранение локально в public/img/venues/real/<sport>/<index>.jpg
  console.log('\n--- Скачивание и сохранение изображений в public/img/venues/real/ ---');
  const baseRealDir = path.join(__dirname, '..', 'public', 'img', 'venues', 'real');

  let downloadedCount = 0;
  let skippedCount = 0;

  for (const [sportKey, candidates] of Object.entries(allCandidates)) {
    const sportDir = path.join(baseRealDir, sportKey);
    if (!fs.existsSync(sportDir)) {
      fs.mkdirSync(sportDir, { recursive: true });
    }

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      const targetFileName = `${i + 1}.jpg`;
      const targetFilePath = path.join(sportDir, targetFileName);
      cand.local_path = `/img/venues/real/${sportKey}/${targetFileName}`;

      if (fs.existsSync(targetFilePath)) {
        skippedCount++;
        continue;
      }

      console.log(`  Скачивание [${sportKey}] #${i + 1} (${cand.title.slice(0, 30)})...`);
      try {
        await sleep(1000);
        const buffer = await downloadBuffer(cand.thumburl);

        if (sharp) {
          // Приводим к 1200x900 (cover) и качеству 80
          await sharp(buffer)
            .resize(1200, 900, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 80, mozjpeg: true })
            .toFile(targetFilePath);
        } else {
          fs.writeFileSync(targetFilePath, buffer);
        }
        downloadedCount++;
      } catch (err) {
        console.error(`  [ОШИБКА скачивания ${cand.thumburl}]: ${err.message}`);
      }
    }
  }

  // Обновляем data/photo-candidates.json с local_path
  fs.writeFileSync(candidatesFilePath, JSON.stringify(allCandidates, null, 2), 'utf-8');

  // Форматированный вывод сводной таблицы
  console.log('\n========================================================================================');
  console.log('                          ИТОГОВАЯ ТАБЛИЦА КАНДИДАТОВ                                   ');
  console.log('========================================================================================');
  console.log('Спорт        | # | Название файла (фрагмент)      | Автор (фрагмент)       | Лицензия');
  console.log('-------------+---+--------------------------------+------------------------+------------------');

  for (const [sportKey, candidates] of Object.entries(allCandidates)) {
    candidates.forEach((c, idx) => {
      const sKey = sportKey.padEnd(12);
      const num = String(idx + 1).padEnd(2);
      const title = c.filename.slice(0, 30).padEnd(30);
      const author = c.author.slice(0, 22).padEnd(22);
      const lic = c.license.slice(0, 18);
      console.log(`${sKey}| ${num}| ${title} | ${author} | ${lic}`);
    });
  }
  console.log('-------------+---+--------------------------------+------------------------+------------------\n');

  console.log(`Всего сохранено кандидатов: ${Object.values(allCandidates).reduce((sum, arr) => sum + arr.length, 0)}`);
  console.log(`Скачано новых файлов: ${downloadedCount}, уже существовало: ${skippedCount}`);

  if (sportsWithDeficit.length > 0) {
    console.warn('\n[ВНИМАНИЕ] Для следующих видов спорта найдено менее 4 фото:');
    sportsWithDeficit.forEach(d => console.warn(`  - ${d.sport}: ${d.count} шт.`));
  } else {
    console.log('\n[УСПЕХ] Для всех 5 видов спорта найдено достаточное количество качественных фото (>= 4)!');
  }

  console.log('========================================================================================\n');
}

main().catch(err => {
  console.error('Критическая ошибка:', err);
  process.exit(1);
});
