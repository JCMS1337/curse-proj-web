/**
 * Скрипт применения миграций базы данных.
 * Запуск: npm run db:migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigrations() {
  console.log('--- Применение миграций PostgreSQL ---');

  // Для создания расширений (btree_gist) и раздачи прав используем суперпользователя или пользователя БД
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.PG_SUPERUSER || 'postgres',
    password: process.env.PG_SUPERUSER_PASSWORD || '12345',
    database: process.env.DB_NAME || 'sport_booking',
  });

  try {
    await client.connect();
    console.log(`Подключено к базе данных "${process.env.DB_NAME || 'sport_booking'}".`);

    const isFresh = process.argv.includes('--fresh');
    if (isFresh) {
      console.log('Сброс схемы (--fresh): удаление таблиц...');
      await client.query(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO sport_booking_user;
        GRANT ALL ON SCHEMA public TO public;
      `);
      console.log('Схема public пересоздана.');
    }

    // Таблица для хранения истории примененных миграций
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const checkRes = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (checkRes.rowCount === 0) {
        console.log(`Применение миграции: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`Миграция ${file} успешно выполнена.`);
      } else {
        console.log(`Миграция ${file} уже была применена ранее.`);
      }
    }

    console.log('Все миграции успешно применены.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Ошибка при выполнении миграции:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
