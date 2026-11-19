/**
 * Скрипт автоматизированного тестирования REST API SportBook.
 * Проверяет эндпоинты, авторизацию, фильтрацию по берегам/районам/видам спорта,
 * разграничение прав и аппаратную обработку конфликтов 409.
 */
process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('./server');

let server;
const PORT = 3001; // Тестовый порт

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : null;
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log('        ТЕСТИРОВАНИЕ REST API SPORTBOOK          ');
  console.log('==================================================\n');

  server = app.listen(PORT);

  try {
    // 1. Health check
    console.log('1. Проверка эндпоинта /api/health...');
    const health = await request({ path: '/api/health', method: 'GET' });
    console.log(`   Статус: ${health.status}, Сервис: ${health.data.service}`);
    if (health.data.service !== 'SportBook') {
      throw new Error(`Ожидался сервис "SportBook", получено "${health.data.service}"`);
    }

    // 2. Справочник видов спорта
    console.log('\n2. Проверка справочника видов спорта (/api/sport-types)...');
    const sportTypesRes = await request({ path: '/api/sport-types', method: 'GET' });
    const sportTypes = sportTypesRes.data.data || [];
    console.log(`   Статус: ${sportTypesRes.status}, видов спорта: ${sportTypes.length}`);
    const stNames = sportTypes.map(s => s.name);
    console.log(`   Виды спорта в БД: ${stNames.join(', ')}`);
    if (!stNames.includes('Легкая атлетика')) {
      throw new Error('Вид спорта "Легкая атлетика" не найден в /api/sport-types');
    }

    // 3. Аутентификация
    console.log('\n3. Проверка авторизации...');
    const invalidLogin = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: 'teacher@school22.ru', password: 'wrongpassword' }
    );
    console.log(`   Попытка входа с неверным паролем: статус ${invalidLogin.status} (ожидаем 401: "${invalidLogin.data.error}")`);

    const teacherLogin = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: 'teacher@school22.ru', password: 'password123' }
    );
    const teacherToken = teacherLogin.data.data.token;
    console.log(`   Успешный вход учителя: статус ${teacherLogin.status}, роль: ${teacherLogin.data.data.user.role_name}`);

    const adminLogin = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: 'sysadmin@booking.nsk.ru', password: 'password123' }
    );
    const adminToken = adminLogin.data.data.token;
    console.log(`   Успешный вход администратора: статус ${adminLogin.status}, роль: ${adminLogin.data.data.user.role_name}`);

    // 4. Профиль пользователя (/api/auth/me)
    console.log('\n4. Проверка получения профиля (/api/auth/me)...');
    const meRes = await request({
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    console.log(`   Пользователь: ${meRes.data.data.user.full_name}, Организация: ${meRes.data.data.user.organization_name}`);

    // 5. Каталог площадок и фильтры (берег, район, вид спорта, лимит)
    console.log('\n5. Проверка каталога площадок и фильтров (/api/venues)...');
    const venuesRes = await request({ path: '/api/venues', method: 'GET' });
    console.log(`   Всего площадок в каталоге: ${venuesRes.data.count}`);

    const leftBankRes = await request({ path: '/api/venues?bank=left', method: 'GET' });
    console.log(`   Площадок на левом берегу: ${leftBankRes.data.count} (ожидаем 10)`);
    if (leftBankRes.data.count !== 10) {
      throw new Error(`Ожидалось 10 площадок на левом берегу, получено ${leftBankRes.data.count}`);
    }

    const rightBankRes = await request({ path: '/api/venues?bank=right', method: 'GET' });
    console.log(`   Площадок на правом берегу: ${rightBankRes.data.count} (ожидаем 20)`);
    if (rightBankRes.data.count !== 20) {
      throw new Error(`Ожидалось 20 площадок на правом берегу, получено ${rightBankRes.data.count}`);
    }

    const athleticsRes = await request({ path: '/api/venues?sport_type_id=5', method: 'GET' });
    console.log(`   Площадок с видом "Легкая атлетика": ${athleticsRes.data.count} (ожидаем 6)`);

    const limit3Res = await request({ path: '/api/venues?sport_type_id=1&limit=3', method: 'GET' });
    console.log(`   Запрос с limit=3: возвращено карточек ${limit3Res.data.data.length} (ожидаем 3)`);
    if (limit3Res.data.data.length !== 3) {
      throw new Error(`Ожидалось 3 карточки при limit=3, получено ${limit3Res.data.data.length}`);
    }

    const districtRes = await request({ path: `/api/venues?district=${encodeURIComponent('Центральный')}`, method: 'GET' });
    console.log(`   Площадок в Центральном районе: ${districtRes.data.count}`);

    const venueDetail = await request({ path: '/api/venues/1', method: 'GET' });
    console.log(`   Детали площадки 1: "${venueDetail.data.data.name}", берег: ${venueDetail.data.data.bank}, район: ${venueDetail.data.data.district}`);
    const vPhotos = venueDetail.data.data.photos || [];
    console.log(`   Фотографий у площадки 1: ${vPhotos.length}, первое фото реальное: ${vPhotos[0]?.is_real}, автор: "${vPhotos[0]?.author}"`);
    if (!vPhotos[0]?.is_real || !vPhotos[0]?.author || !vPhotos[0]?.license) {
      throw new Error('Первое фото площадки 1 должно быть реальным с указанием автора и лицензии!');
    }

    const creditsRes = await request({ path: '/api/venues/credits', method: 'GET' });
    console.log(`   Эндпоинт /api/venues/credits: статус ${creditsRes.status}, фото с лицензиями: ${creditsRes.data.count}`);
    if (creditsRes.status !== 200 || !creditsRes.data.data.length) {
      throw new Error('Ошибка получения списка источников фото (/api/venues/credits)');
    }

    // 6. Проверка доступности (/api/venues/:id/availability)
    console.log('\n6. Проверка доступности площадки (/api/venues/1/availability)...');
    const availRes = await request({ path: '/api/venues/1/availability', method: 'GET' });
    console.log(`   Найдено бронирований в периоде: ${availRes.data.data.bookings.length}`);

    // 7. Бронирование и тест конфликта времени (409 Conflict)
    console.log('\n7. Проверка создания бронирования и обработки конфликта (409)...');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const startAt = new Date(futureDate.setHours(10, 0, 0, 0)).toISOString();
    const endAt = new Date(futureDate.setHours(12, 0, 0, 0)).toISOString();

    const newBooking = await request(
      {
        path: '/api/bookings',
        method: 'POST',
        headers: { Authorization: `Bearer ${teacherToken}` },
      },
      {
        venue_id: 1,
        start_at: startAt,
        end_at: endAt,
        purpose: 'Тестовый урок физкультуры по футболу',
        participants_count: 22,
      }
    );
    console.log(`   Создание брони: статус ${newBooking.status}, ID брони: ${newBooking.data.data.id}`);

    // Попытка создать повторную бронь на тот же интервал
    const conflictBooking = await request(
      {
        path: '/api/bookings',
        method: 'POST',
        headers: { Authorization: `Bearer ${teacherToken}` },
      },
      {
        venue_id: 1,
        start_at: startAt,
        end_at: endAt,
        purpose: 'Повторное пересекающееся бронирование',
        participants_count: 18,
      }
    );
    console.log(`   Попытка двойного бронирования: статус ${conflictBooking.status} (ожидаем 409: "${conflictBooking.data.error}")`);
    if (conflictBooking.status !== 409) {
      throw new Error(`Ожидался статус 409, получено ${conflictBooking.status}`);
    }

    // 8. Отмена созданной тестовой брони
    console.log('\n8. Отмена бронирования (DELETE /api/bookings/:id)...');
    const cancelRes = await request({
      path: `/api/bookings/${newBooking.data.data.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    console.log(`   Отмена брони: статус ${cancelRes.status}, новый статус: ${cancelRes.data.data.status}`);

    // 9. Проверка ролевой модели (RBAC)
    console.log('\n9. Проверка разграничения прав доступа (RBAC)...');
    const forbiddenRes = await request({
      path: '/api/admin/users',
      method: 'GET',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    console.log(`   Попытка доступа учителя к /api/admin/users: статус ${forbiddenRes.status} (ожидаем 403: "${forbiddenRes.data.error}")`);

    const adminUsersRes = await request({
      path: '/api/admin/users',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`   Доступ администратора к /api/admin/users: статус ${adminUsersRes.status}, пользователей в системе: ${adminUsersRes.data.data.length}`);

    console.log('\n==================================================');
    console.log('   ВСЕ ТЕСТЫ REST API УСПЕШНО ПРОЙДЕНЫ!');
    console.log('==================================================');
  } catch (err) {
    console.error('Ошибка при тестировании API:', err);
    process.exit(1);
  } finally {
    server.close();
    const db = require('./src/config/db');
    await db.pool.end();
    process.exit(0);
  }
}

runTests();
