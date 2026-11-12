/**
 * Скрипт наполнения базы данных тестовыми данными (сидирование).
 * Запуск: npm run db:seed
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runSeed() {
  console.log('--- Сидирование тестовыми данными ---');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'sport_booking_user',
    password: process.env.DB_PASSWORD || 'sport_booking_pass_2026',
    database: process.env.DB_NAME || 'sport_booking',
  });

  try {
    await client.connect();
    console.log(`Подключено к базе "${process.env.DB_NAME || 'sport_booking'}" пользователем "${process.env.DB_USER || 'sport_booking_user'}".`);

    const seedSqlPath = path.join(__dirname, 'seed.sql');
    const sql = fs.readFileSync(seedSqlPath, 'utf8');

    console.log('Выполнение seed.sql...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('Тестовые данные успешно загружены в базу данных.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Ошибка при сидировании БД:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
