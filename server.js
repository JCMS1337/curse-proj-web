/**
 * Главный файл сервера Express приложения SportBook
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

// Импорт маршрутов и контроллеров
const authRoutes = require('./src/routes/authRoutes');
const venueRoutes = require('./src/routes/venueRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const venueController = require('./src/controllers/venueController');

// Импорт централизованного обработчика ошибок
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Базовые middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздача статических файлов веб-сайта из папки public/
app.use(express.static(path.join(__dirname, 'public')));

// Проверка работоспособности сервиса (health-check)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SportBook',
  });
});

// Подключение API маршрутов
app.get('/api/sport-types', venueController.getSportTypes);
app.get('/sport-types', venueController.getSportTypes);
app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Перенаправление неизвестных маршрутов API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Запрашиваемый эндпоинт API не найден',
  });
});

// Централизованная обработка ошибок
app.use(errorHandler);

// Запуск сервера
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, HOST, () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const networkIps = [];

    for (const ifaceName of Object.keys(networkInterfaces)) {
      for (const iface of networkInterfaces[ifaceName]) {
        // Отбираем только внешние IPv4 адреса
        if (iface.family === 'IPv4' && !iface.internal) {
          networkIps.push({ iface: ifaceName, address: iface.address });
        }
      }
    }

    console.log('===============================================================');
    console.log('                 СЕРВЕР SportBook ЗАПУЩЕН                      ');
    console.log('===============================================================');
    console.log(`  Локальный доступ (на этом компьютере):`);
    console.log(`  -> http://localhost:${PORT}`);
    console.log('');
    if (networkIps.length > 0) {
      console.log(`  Доступ по локальной сети (телефон, планшет, другой ПК):`);
      networkIps.forEach(net => {
        console.log(`  -> http://${net.address}:${PORT}  (${net.iface})`);
      });
      console.log('');
    }
    console.log(`  REST API доступно по префиксу: http://localhost:${PORT}/api`);
    console.log('===============================================================');
    console.log('  Для остановки сервера нажмите Ctrl + C');
    console.log('===============================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('\n===============================================================');
      console.error(` [ОШИБКА] Порт ${PORT} уже занят другим процессом!`);
      console.error(` Скорее всего, сервер уже запущен в фоновом режиме или в другом окне.`);
      console.error(` Закройте предыдущее окно терминала или завершите процесс node.`);
      console.error('===============================================================\n');
      process.exit(1);
    } else {
      console.error('Критическая ошибка запуска сервера:', err.message);
      process.exit(1);
    }
  });
}

module.exports = app;
