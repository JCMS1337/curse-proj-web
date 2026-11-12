/**
 * Главный файл сервера Express курсового проекта
 * «Кроссплатформенное приложение для бронирования муниципальных спортивных площадок»
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

// Импорт маршрутов
const authRoutes = require('./src/routes/authRoutes');
const venueRoutes = require('./src/routes/venueRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

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
    service: 'Муниципальный сервис бронирования спортивных площадок',
  });
});

// Подключение API маршрутов
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
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('==================================================');
    console.log(` Сервер запущен и принимает запросы на http://localhost:${PORT}`);
    console.log(` API доступно по префиксу: http://localhost:${PORT}/api`);
    console.log(` Веб-сайт доступен по адресу: http://localhost:${PORT}`);
    console.log('==================================================');
  });
}

module.exports = app;
