/**
 * Скрипт первоначальной инициализации базы данных и пользователя PostgreSQL.
 * Выполняется от имени суперпользователя postgres (указанного в .env).
 */
require('dotenv').config();
const { Client } = require('pg');

async function initDatabaseAndUser() {
  const superuserClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.PG_SUPERUSER || 'postgres',
    password: process.env.PG_SUPERUSER_PASSWORD || '12345',
    database: 'postgres',
  });

  const appDb = process.env.DB_NAME || 'sport_booking';
  const appUser = process.env.DB_USER || 'sport_booking_user';
  const appPass = process.env.DB_PASSWORD || 'sport_booking_pass_2026';

  try {
    console.log('Подключение к PostgreSQL от имени суперпользователя...');
    await superuserClient.connect();
    console.log('Успешное подключение к серверу PostgreSQL.');

    // 1. Проверяем наличие пользователя приложения
    const userRes = await superuserClient.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`,
      [appUser]
    );

    if (userRes.rowCount === 0) {
      console.log(`Создание пользователя приложения: ${appUser}...`);
      // rolname и пароль задаются безопасным экранированием
      await superuserClient.query(
        `CREATE ROLE ${appUser} WITH LOGIN PASSWORD '${appPass.replace(/'/g, "''")}';`
      );
      console.log(`Пользователь ${appUser} успешно создан.`);
    } else {
      console.log(`Пользователь ${appUser} уже существует, обновление пароля...`);
      await superuserClient.query(
        `ALTER ROLE ${appUser} WITH LOGIN PASSWORD '${appPass.replace(/'/g, "''")}';`
      );
    }

    // 2. Проверяем наличие базы данных приложения
    const dbRes = await superuserClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [appDb]
    );

    if (dbRes.rowCount === 0) {
      console.log(`Создание базы данных: ${appDb}...`);
      await superuserClient.query(
        `CREATE DATABASE ${appDb} OWNER ${appUser} ENCODING 'UTF8';`
      );
      console.log(`База данных ${appDb} успешно создана.`);
    } else {
      console.log(`База данных ${appDb} уже существует.`);
    }

    // 3. Выдача прав пользователю
    await superuserClient.query(`GRANT ALL PRIVILEGES ON DATABASE ${appDb} TO ${appUser};`);

    console.log('Инициализация БД и пользователя успешно завершена.');
  } catch (error) {
    console.error('Ошибка при инициализации БД и пользователя:', error.message);
    process.exit(1);
  } finally {
    await superuserClient.end();
  }
}

initDatabaseAndUser();
