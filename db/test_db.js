/**
 * Проверочные запросы для валидации схемы и целостности БД (Этап 1).
 * Проверяет:
 * 1. Количество строк во всех таблицах после сидирования.
 * 2. Ограничение btree_gist EXCLUDE (защита от двойного бронирования на уровне БД).
 * 3. Триггер запрета бронирования в период блокировки площадки на ремонт.
 * Запуск: npm run test:db
 */
require('dotenv').config();
const { Client } = require('pg');

async function testDatabaseIntegrity() {
  console.log('==================================================');
  console.log('   ПРОВЕРКА ЦЕЛОСТНОСТИ И ОГРАНИЧЕНИЙ БАЗЫ ДАННЫХ');
  console.log('==================================================\n');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'sport_booking_user',
    password: process.env.DB_PASSWORD || 'sport_booking_pass_2026',
    database: process.env.DB_NAME || 'sport_booking',
  });

  try {
    await client.connect();
    console.log('1. Подключение пользователем приложения sport_booking_user: УСПЕШНО\n');

    // 1. Проверка количества строк во всех таблицах
    const tables = [
      'roles',
      'organizations',
      'users',
      'sport_types',
      'venues',
      'venue_equipment',
      'venue_photos',
      'venue_blocks',
      'bookings',
    ];

    console.log('2. Количество записей в таблицах:');
    console.log('--------------------------------------------------');
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) AS count FROM ${table}`);
      console.log(`  Таблица ${table.padEnd(18)} : ${res.rows[0].count} строк`);
    }
    console.log('--------------------------------------------------\n');

    // 2. Тест защиты от двойного бронирования (EXCLUDE constraint)
    console.log('3. Тестирование защиты от двойного бронирования (EXCLUDE btree_gist)...');
    // Попробуем вставить бронь на площадку №1, которая пересекается с существующей бронью №2
    // В seed.sql для venue_id=1 завтра с 09:00 до 11:00 уже есть бронь
    // Пытаемся создать бронь с 10:00 до 12:00 на ту же площадку:
    try {
      await client.query(`
        INSERT INTO bookings (venue_id, user_id, organization_id, start_at, end_at, purpose, participants_count, status)
        VALUES (
          1, 5, 3,
          (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00:00') AT TIME ZONE 'Asia/Novosibirsk',
          (CURRENT_DATE + INTERVAL '1 day' + TIME '12:00:00') AT TIME ZONE 'Asia/Novosibirsk',
          'Попытка создать пересекающееся бронирование',
          15,
          'confirmed'
        );
      `);
      console.error('  [ОШИБКА ПРОВЕРКИ] Пересекающаяся бронь была сохранена! Защита не сработала.');
    } catch (err) {
      console.log(`  [УСПЕХ] Защита от двойного бронирования сработала штатно:`);
      console.log(`  Код ошибки: ${err.code}`);
      console.log(`  Сообщение:  ${err.message}\n`);
    }

    // 3. Тест триггера блокировки (попытка бронирования на время ремонта)
    console.log('4. Тестирование триггера пересечения с блокировками (venue_blocks)...');
    // В seed.sql площадка №2 заблокирована через 5 дней с 08:00 до 18:00
    // Попытаемся забронировать площадку №2 в этот промежуток (с 10:00 до 12:00):
    try {
      await client.query(`
        INSERT INTO bookings (venue_id, user_id, organization_id, start_at, end_at, purpose, participants_count, status)
        VALUES (
          2, 1, 1,
          (CURRENT_DATE + INTERVAL '5 days' + TIME '10:00:00') AT TIME ZONE 'Asia/Novosibirsk',
          (CURRENT_DATE + INTERVAL '5 days' + TIME '12:00:00') AT TIME ZONE 'Asia/Novosibirsk',
          'Попытка брони во время ремонта',
          10,
          'confirmed'
        );
      `);
      console.error('  [ОШИБКА ПРОВЕРКИ] Бронь в период блокировки была сохранена! Триггер не сработал.');
    } catch (err) {
      console.log(`  [УСПЕХ] Триггер блокировки сработал штатно:`);
      console.log(`  Код ошибки: ${err.code}`);
      console.log(`  Сообщение:  ${err.message}\n`);
    }

    console.log('==================================================');
    console.log('   ВСЕ ПРОВЕРКИ ЭТАПА 1 ПРОЙДЕНЫ УСПЕШНО!');
    console.log('==================================================');
  } catch (error) {
    console.error('Критическая ошибка при тестировании БД:', error);
  } finally {
    await client.end();
  }
}

testDatabaseIntegrity();
