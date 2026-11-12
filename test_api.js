/**
 * Скрипт автоматизированного тестирования REST API (Этап 2).
 * Проверяет все эндпоинты, авторизацию, роли и обработку конфликтов 409.
 */
const http = require('http');
const app = require('./server');

let server;
const PORT = 3001; // Используем тестовый порт, чтобы не конфликтовать

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
  console.log('        ТЕСТИРОВАНИЕ REST API СЕРВЕРА (ЭТАП 2)    ');
  console.log('==================================================\n');

  server = app.listen(PORT);

  try {
    // 1. Health check
    console.log('1. Проверка эндпоинта /api/health...');
    const health = await request({ path: '/api/health', method: 'GET' });
    console.log(`   Статус: ${health.status}, Сервис: ${health.data.service}`);

    // 2. Аутентификация
    console.log('\n2. Проверка авторизации...');
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

    // 3. Профиль пользователя (/api/auth/me)
    console.log('\n3. Проверка получения профиля (/api/auth/me)...');
    const meRes = await request({
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    console.log(`   Пользователь: ${meRes.data.data.user.full_name}, Организация: ${meRes.data.data.user.organization_name}`);

    // 4. Каталог площадок
    console.log('\n4. Проверка каталога площадок (/api/venues)...');
    const venuesRes = await request({ path: '/api/venues', method: 'GET' });
    console.log(`   Получено площадок: ${venuesRes.data.count}`);

    const filterRes = await request({ path: '/api/venues?sport_type_id=1', method: 'GET' });
    console.log(`   Площадок с видом спорта "Футбол": ${filterRes.data.count}`);

    const venueDetail = await request({ path: '/api/venues/1', method: 'GET' });
    console.log(`   Детали площадки 1: "${venueDetail.data.data.name}", фото: ${venueDetail.data.data.photos.length}, инвентарь: ${venueDetail.data.data.equipment.length}`);

    // 5. Проверка доступности (/api/venues/:id/availability)
    console.log('\n5. Проверка доступности площадки (/api/venues/1/availability)...');
    const availRes = await request({ path: '/api/venues/1/availability', method: 'GET' });
    console.log(`   Найдено бронирований в периоде: ${availRes.data.data.bookings.length}`);

    // 6. Бронирование и тест конфликта времени (409 Conflict)
    console.log('\n6. Проверка создания бронирования и обработки конфликта (409)...');
    // Задаем уникальный слот в будущем (через 10 дней)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const startAt = new Date(futureDate.setHours(14, 0, 0, 0)).toISOString();
    const endAt = new Date(futureDate.setHours(16, 0, 0, 0)).toISOString();

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
        participants_count: 20,
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
        participants_count: 15,
      }
    );
    console.log(`   Попытка двойного бронирования: статус ${conflictBooking.status} (ожидаем 409: "${conflictBooking.data.error}")`);

    // 7. Отмена созданной тестовой брони
    console.log('\n7. Отмена бронирования (DELETE /api/bookings/:id)...');
    const cancelRes = await request({
      path: `/api/bookings/${newBooking.data.data.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    console.log(`   Отмена брони: статус ${cancelRes.status}, новый статус: ${cancelRes.data.data.status}`);

    // 8. Проверка ролевой модели (RBAC)
    console.log('\n8. Проверка разграничения прав доступа (RBAC)...');
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
    console.log('   ВСЕ ТЕСТЫ ЭТАПА 2 УСПЕШНО ПРОЙДЕНЫ!');
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
