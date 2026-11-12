/**
 * Конфигурация пула подключений к PostgreSQL.
 * Использует переменные окружения из .env и параметры пользователя приложения.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'sport_booking',
  user: process.env.DB_USER || 'sport_booking_user',
  password: process.env.DB_PASSWORD || 'sport_booking_pass_2026',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB Pool Error] Непредвиденная ошибка в пуле подключений:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
