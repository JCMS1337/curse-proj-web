/**
 * scripts/check-photos.js
 * Скрипт проверки фотографий спортивных площадок.
 * - Читает из БД все записи venue_photos;
 * - Проверяет наличие файла на диске в public/;
 * - Запускает локальный тестовый HTTP-сервер и проверяет код 200 и тип image/*;
 * - Выводит форматированную таблицу результатов с указанием типа фото (реальное / SVG);
 * - Проверяет, что у каждой площадки есть минимум 3 фото и не менее 1 реального фото.
 */

process.env.NODE_ENV = 'test';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const db = require('../src/config/db');
const app = require('../server');

const TEST_PORT = 3003;

async function checkUrlHttp(urlPath) {
  return new Promise((resolve) => {
    http.get(`http://localhost:${TEST_PORT}${urlPath}`, (res) => {
      const contentType = res.headers['content-type'] || '';
      const statusCode = res.statusCode;
      let isImage = contentType.startsWith('image/');
      resolve({ statusCode, contentType, isImage });
    }).on('error', (err) => {
      resolve({ statusCode: 500, contentType: '', isImage: false, error: err.message });
    });
  });
}

async function main() {
  console.log('====================================================================================================');
  console.log('                    ДИАГНОСТИКА ФОТОГРАФИЙ СПОРТИВНЫХ ПЛОЩАДОК SPORTBOOK                            ');
  console.log('====================================================================================================\n');

  // Запуск тестового инстанса сервера для проверки отдачи статики
  const server = app.listen(TEST_PORT);

  try {
    const venuesRes = await db.query('SELECT id, name FROM venues ORDER BY id ASC');
    const photosRes = await db.query(`
      SELECT vp.id, vp.venue_id, v.name as venue_name, vp.photo_url, vp.sort_order,
             vp.is_real, vp.author, vp.license, vp.source_url
      FROM venue_photos vp
      JOIN venues v ON vp.venue_id = v.id
      ORDER BY vp.venue_id ASC, vp.sort_order ASC, vp.id ASC
    `);

    const venues = venuesRes.rows;
    const photos = photosRes.rows;

    console.log(`Найдено площадок в БД: ${venues.length}`);
    console.log(`Найдено записей фото в БД: ${photos.length}\n`);

    console.log('ID  | Площадка (первые 30 симв.)       | URL фотографии                      | Тип       | Статус');
    console.log('----+---------------------------------+-------------------------------------+-----------+------------------');

    const photosByVenue = {};
    let okCount = 0;
    let errCount = 0;
    let totalReal = 0;
    let totalSvg = 0;

    for (const p of photos) {
      if (!photosByVenue[p.venue_id]) {
        photosByVenue[p.venue_id] = [];
      }
      photosByVenue[p.venue_id].push(p);

      if (p.is_real) totalReal++;
      else totalSvg++;

      // Проверка на диске
      const cleanPath = p.photo_url.split('?')[0];
      const diskPath = path.join(__dirname, '..', 'public', cleanPath);
      const existsOnDisk = fs.existsSync(diskPath);

      // Проверка по HTTP
      const httpRes = await checkUrlHttp(p.photo_url);

      let status = 'OK';
      if (!existsOnDisk) {
        status = 'НЕТ ФАЙЛА НА ДИСКЕ';
        errCount++;
      } else if (httpRes.statusCode === 404) {
        status = '404 NOT FOUND';
        errCount++;
      } else if (httpRes.statusCode !== 200) {
        status = `HTTP ${httpRes.statusCode}`;
        errCount++;
      } else if (!httpRes.isImage) {
        status = `НЕ ИЗОБРАЖЕНИЕ (${httpRes.contentType})`;
        errCount++;
      } else {
        okCount++;
      }

      const idStr = String(p.venue_id).padEnd(3);
      const nameStr = p.venue_name.slice(0, 31).padEnd(31);
      const urlStr = p.photo_url.padEnd(35);
      const typeStr = p.is_real ? 'Реальное ' : 'SVG-схема';
      console.log(`${idStr} | ${nameStr} | ${urlStr} | ${typeStr} | ${status}`);
    }

    console.log('----+---------------------------------+-------------------------------------+-----------+------------------\n');

    // Проверка наличия минимум 3 фото и минимум 1 реального фото у каждой площадки
    console.log('ПРОВЕРКА КОЛИЧЕСТВА И ТИПА ФОТОГРАФИЙ НА ПЛОЩАДКУ:');
    let venuesWithDeficitTotal = 0;
    let venuesWithDeficitReal = 0;

    for (const v of venues) {
      const vPhotos = photosByVenue[v.id] || [];
      const totalCount = vPhotos.length;
      const realCount = vPhotos.filter(x => x.is_real).length;

      if (totalCount < 3) {
        console.log(`  [ВНИМАНИЕ] Площадка #${v.id} "${v.name}" имеет ${totalCount} фото (требуется >= 3)!`);
        venuesWithDeficitTotal++;
      }
      if (realCount < 1) {
        console.log(`  [ВНИМАНИЕ] Площадка #${v.id} "${v.name}" не имеет реальных фото (требуется >= 1)!`);
        venuesWithDeficitReal++;
      }
    }

    if (venuesWithDeficitTotal === 0 && venuesWithDeficitReal === 0) {
      console.log(`  [УСПЕХ] Все ${venues.length} площадок имеют 3 фото со статусом OK, из них минимум 1 реальное!`);
    } else {
      if (venuesWithDeficitTotal > 0) console.log(`  [ОШИБКА] ${venuesWithDeficitTotal} площадок имеют менее 3 фото.`);
      if (venuesWithDeficitReal > 0) console.log(`  [ОШИБКА] ${venuesWithDeficitReal} площадок не имеют реальных фото.`);
    }

    console.log('\n====================================================================================================');
    console.log(`ИТОГИ: Всего фото: ${photos.length} (Реальных: ${totalReal}, SVG: ${totalSvg}) | Успешно (OK): ${okCount} | С ошибками: ${errCount}`);
    console.log('====================================================================================================\n');

  } catch (err) {
    console.error('Ошибка выполнения проверки фото:', err);
    process.exit(1);
  } finally {
    server.close();
    await db.pool.end();
    process.exit(0);
  }
}

main();
