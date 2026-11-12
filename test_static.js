/**
 * Скрипт проверки раздачи клиентских страниц и статических ресурсов Express сервером (Этап 3).
 */
const http = require('http');
const app = require('./server');

const PORT = 3002;
const server = app.listen(PORT);

const urls = [
  '/',
  '/index.html',
  '/venues.html',
  '/venue.html?id=1',
  '/login.html',
  '/cabinet.html',
  '/admin.html',
  '/css/styles.css',
  '/js/api.js',
  '/js/venues.js',
  '/js/venue-detail.js',
  '/js/auth.js',
  '/js/cabinet.js',
  '/js/admin.js',
];

async function checkUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${url}`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          size: body.length,
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('==================================================');
  console.log('    ПРОВЕРКА РАЗДАЧИ СТРАНИЦ И СТАТИКИ (ЭТАП 3)   ');
  console.log('==================================================\n');

  try {
    for (const url of urls) {
      const res = await checkUrl(url);
      const isOk = res.status === 200;
      console.log(`  [${isOk ? 'OK 200' : 'FAIL ' + res.status}] ${url.padEnd(25)} (${res.size} байт, ${res.contentType})`);
      if (!isOk) {
        throw new Error(`Страница ${url} вернула статус ${res.status}`);
      }
    }
    console.log('\n==================================================');
    console.log('   ВСЕ СТРАНИЦЫ И РЕСУРСЫ ДОСТУПНЫ БЕЗ ОШИБОК!    ');
    console.log('==================================================');
  } catch (err) {
    console.error('Ошибка проверки статики:', err);
    process.exit(1);
  } finally {
    server.close();
    const db = require('./src/config/db');
    await db.pool.end();
    process.exit(0);
  }
}

run();
