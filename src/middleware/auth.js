/**
 * Middleware аутентификации пользователей по JWT токену.
 * Извлекает токен из заголовка Authorization (Bearer <token>),
 * верифицирует его и помещает данные пользователя в req.user.
 */
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { AppError } = require('./errorHandler');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Требуется авторизация. Пожалуйста, выполните вход в систему', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_sport_booking_2026_coursework');

    // Получаем актуальные данные пользователя из БД
    const result = await db.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.role_id, r.name AS role_name, 
              u.organization_id, o.name AS organization_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Пользователь с данным токеном больше не существует', 401);
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// Опциональная аутентификация (если токен есть - считываем, если нет - пропускаем как гостя)
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_sport_booking_2026_coursework');
      const result = await db.query(
        `SELECT u.id, u.email, u.full_name, u.phone, u.role_id, r.name AS role_name, 
                u.organization_id, o.name AS organization_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.id = $1`,
        [decoded.userId]
      );
      if (result.rowCount > 0) {
        req.user = result.rows[0];
      }
    }
    next();
  } catch (err) {
    // В опциональном режиме игнорируем ошибку и продолжаем как гость
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate,
};
