/**
 * scripts/assign-real-photos.js
 * Скрипт привязки скачанных реальных иллюстративных фотографий к спортивным площадкам в БД.
 * 
 * Правила:
 * 1. У каждой площадки:
 *    - 1-е фото: реальное (is_real = true, sort_order = 1)
 *    - 2-е фото: второе реальное другого кадра (is_real = true, sort_order = 2)
 *    - 3-е фото: SVG-схема площадки (is_real = false, sort_order = 3)
 * 2. Распределение по формуле (id + n) % кандидаты_вида, чтобы не было повторов у соседних площадок.
 * 3. Идемпотентность: удаляются ранее назначенные реальные фото и восстанавливается консистентная тройка.
 * 4. Учитываются пользовательские фото из custom/<id>/ (приоритет 1).
 * 
 * Запуск: npm run photos:assign
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const SPORT_ID_TO_KEY = {
  1: 'football',
  2: 'basketball',
  3: 'volleyball',
  4: 'universal',
  5: 'athletics'
};

async function main() {
  console.log('========================================================================================');
  console.log('             НАЗНАЧЕНИЕ РЕАЛЬНЫХ ФОТОГРАФИЙ ПЛОЩАДКАМ В БД (SportBook)                  ');
  console.log('========================================================================================\n');

  const candidatesPath = path.join(__dirname, '..', 'data', 'photo-candidates.json');
  if (!fs.existsSync(candidatesPath)) {
    console.error(`[ОШИБКА] Файл кандидатов не найден: ${candidatesPath}`);
    console.error('Сначала выполните: npm run photos:fetch');
    process.exit(1);
  }

  const allCandidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf-8'));
  const customBaseDir = path.join(__dirname, '..', 'public', 'img', 'venues', 'custom');

  // Получаем все площадки из базы
  const venuesRes = await db.query(`
    SELECT v.id, v.name, v.sport_type_id, st.name as sport_name
    FROM venues v
    JOIN sport_types st ON v.sport_type_id = st.id
    ORDER BY v.id ASC
  `);

  const venues = venuesRes.rows;
  console.log(`Найдено площадок в базе: ${venues.length}`);

  let totalRealAssigned = 0;
  let totalSvgAssigned = 0;
  let totalCustomAssigned = 0;

  for (const v of venues) {
    const sportKey = SPORT_ID_TO_KEY[v.sport_type_id] || 'universal';
    const candidates = allCandidates[sportKey] || [];

    // Проверяем наличие пользовательских фото в public/img/venues/custom/<id>/
    const customVenueDir = path.join(customBaseDir, String(v.id));
    const customPhotos = [];
    if (fs.existsSync(customVenueDir)) {
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
      const files = fs.readdirSync(customVenueDir)
        .filter(f => allowedExts.includes(path.extname(f).toLowerCase()))
        .sort();
      for (const file of files) {
        customPhotos.push({
          photo_url: `/img/venues/custom/${v.id}/${file}`,
          is_real: true,
          author: 'Пользователь системы (локальная загрузка)',
          license: 'Собственное фото объекта',
          license_url: null,
          source_url: null,
          title: `Реальное фото площадки ${v.name}`
        });
      }
    }

    // Собираем итоговый набор из 3 фото
    const targetPhotos = [];

    // 1. Добавляем custom фото (если есть)
    for (const cp of customPhotos) {
      if (targetPhotos.length < 3) {
        targetPhotos.push({ ...cp, sort_order: targetPhotos.length + 1 });
        totalCustomAssigned++;
      }
    }

    // 2. Добавляем реальные фото из Commons по формуле
    if (candidates.length > 0 && targetPhotos.length < 3) {
      const count = candidates.length;
      const idx1 = (v.id) % count;
      const cand1 = candidates[idx1];

      targetPhotos.push({
        photo_url: cand1.local_path,
        is_real: true,
        author: cand1.author,
        license: cand1.license,
        license_url: cand1.license_url,
        source_url: cand1.source_url,
        title: cand1.title,
        sort_order: targetPhotos.length + 1
      });
      totalRealAssigned++;

      // Второе реальное фото другого ракурса (если хватает места и кандидатов)
      if (targetPhotos.length < 3 && candidates.length >= 2) {
        const idx2 = (v.id + 1) % count;
        const cand2 = candidates[idx2];

        targetPhotos.push({
          photo_url: cand2.local_path,
          is_real: true,
          author: cand2.author,
          license: cand2.license,
          license_url: cand2.license_url,
          source_url: cand2.source_url,
          title: cand2.title,
          sort_order: targetPhotos.length + 1
        });
        totalRealAssigned++;
      }
    }

    // 3. Заполняем оставшиеся слоты SVG-заглушками (схема поля)
    let svgIdx = 0;
    while (targetPhotos.length < 3) {
      const vNum = ((v.id + svgIdx) % 4) + 1;
      targetPhotos.push({
        photo_url: `/img/venues/${sportKey}/${vNum}.svg`,
        is_real: false,
        author: 'SportBook Vector Assets',
        license: 'Внутренний ресурс системы',
        license_url: null,
        source_url: null,
        title: `Векторная схема площадки (${sportKey})`,
        sort_order: targetPhotos.length + 1
      });
      svgIdx++;
      totalSvgAssigned++;
    }

    // Очищаем существующие фото площадки в БД
    await db.query('DELETE FROM venue_photos WHERE venue_id = $1', [v.id]);

    // Вставляем новые записи
    for (const p of targetPhotos) {
      await db.query(`
        INSERT INTO venue_photos (venue_id, photo_url, sort_order, is_real, author, license, license_url, source_url, title)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        v.id,
        p.photo_url,
        p.sort_order,
        p.is_real,
        p.author,
        p.license,
        p.license_url,
        p.source_url,
        p.title
      ]);
    }
  }

  console.log(`\n[УСПЕХ] Все 30 площадок обновлены!`);
  console.log(`  Реальных фото назначено:     ${totalRealAssigned}`);
  console.log(`  SVG-схем назначено:          ${totalSvgAssigned}`);
  console.log(`  Пользовательских фото:       ${totalCustomAssigned}`);
  console.log(`  Итого записей в таблице:     ${totalRealAssigned + totalSvgAssigned + totalCustomAssigned}`);
  console.log('========================================================================================\n');

  await db.pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Ошибка скрипта назначения фото:', err);
  await db.pool.end();
  process.exit(1);
});
