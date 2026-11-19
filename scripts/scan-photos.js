/**
 * Скрипт сканирования и регистрации пользовательских фотографий спортивных площадок.
 * - Сканирует папку public/img/venues/custom/<id_площадки>/;
 * - Находит файлы изображений (.jpg, .jpeg, .png, .webp);
 * - Регистрирует их в таблице venue_photos первыми (sort_order = 1, 2, ...), перед заглушками;
 * - Повторный запуск безопасен (idempotent): обновляет список без дублирования.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const CUSTOM_DIR = path.join(__dirname, '..', 'public', 'img', 'venues', 'custom');
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

async function scanAndRegister() {
  console.log('========================================================================================');
  console.log('         СКАНИРОВАНИЕ И РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЬСКИХ ФОТО (SportBook)                   ');
  console.log('========================================================================================\n');

  // Убеждаемся, что директория существует
  if (!fs.existsSync(CUSTOM_DIR)) {
    fs.mkdirSync(CUSTOM_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(CUSTOM_DIR, 'README.txt'),
      'Поместите пользовательские фотографии в папки с номерами ID площадок.\nПример: public/img/venues/custom/1/photo1.jpg\nПоддерживаемые форматы: .jpg, .jpeg, .png, .webp\n',
      'utf8'
    );
  }

  try {
    const venuesRes = await db.query('SELECT id, name, sport_type_id FROM venues ORDER BY id ASC');
    const validVenueIds = new Set(venuesRes.rows.map(v => v.id));

    const subdirs = fs.readdirSync(CUSTOM_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d+$/.test(d.name))
      .map(d => parseInt(d.name, 10));

    console.log(`Найдено папок с ID площадок в ${path.relative(path.join(__dirname, '..'), CUSTOM_DIR)}: ${subdirs.length}`);

    if (subdirs.length === 0) {
      console.log('Пользовательских фото пока нет. Стандартные SVG-заглушки активны по умолчанию.');
      console.log('Чтобы добавить реальные фото, создайте папку public/img/venues/custom/<ID_площадки>/ и добавьте изображения.');
      return;
    }

    let registeredCount = 0;

    for (const venueId of subdirs) {
      if (!validVenueIds.has(venueId)) {
        console.warn(`  [ПРЕДУПРЕЖДЕНИЕ] Папка ID ${venueId} не соответствует ни одной площадке в БД. Пропуск.`);
        continue;
      }

      const venueDir = path.join(CUSTOM_DIR, String(venueId));
      const files = fs.readdirSync(venueDir).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ALLOWED_EXTS.includes(ext);
      });

      if (files.length === 0) continue;

      console.log(`Площадка #${venueId}: найдено ${files.length} пользовательских фото: ${files.join(', ')}`);

      // Удаляем старые записи фото этой площадки, которые относились к custom
      await db.query(`DELETE FROM venue_photos WHERE venue_id = $1 AND photo_url LIKE '/img/venues/custom/%'`, [venueId]);

      // Сдвигаем существующие заглушки по sort_order, чтобы пользовательские фото шли первыми
      await db.query(`UPDATE venue_photos SET sort_order = sort_order + 10 WHERE venue_id = $1`, [venueId]);

      // Вставляем пользовательские фото с sort_order 1, 2, ...
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativeUrl = `/img/venues/custom/${venueId}/${file}`;
        const sortOrder = i + 1;
        await db.query(
          `INSERT INTO venue_photos (venue_id, photo_url, sort_order) VALUES ($1, $2, $3)`,
          [venueId, relativeUrl, sortOrder]
        );
        registeredCount++;
      }

      console.log(`  [OK] Зарегистрировано ${files.length} фото для площадки #${venueId} на первых позициях галереи.`);
    }

    console.log(`\nВсего зарегистрировано пользовательских фото: ${registeredCount}`);
  } catch (err) {
    console.error('Ошибка сканирования фото:', err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

scanAndRegister();
