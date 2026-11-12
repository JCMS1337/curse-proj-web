/**
 * Централизованный обработчик ошибок Express.
 * Формирует унифицированный JSON-ответ с понятными сообщениями на русском языке.
 * Предотвращает утечку конфиденциальных данных и паролей.
 */
class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function errorHandler(err, req, res, next) {
  // Логирование ошибки в консоль сервера без конфиденциальных данных
  const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${err.message}`;
  if (err.statusCode && err.statusCode < 500) {
    console.warn(logMessage);
  } else {
    console.error(logMessage, err.stack);
  }

  // 1. Ошибки валидации Zod
  if (err.name === 'ZodError') {
    const errorMessages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return res.status(400).json({
      success: false,
      error: 'Ошибка валидации входных данных',
      details: errorMessages,
    });
  }

  // 2. Ошибки базы данных PostgreSQL
  if (err.code) {
    // 23P01: Нарушение EXCLUDE (двойное бронирование) или триггера блокировки
    if (err.code === '23P01') {
      return res.status(409).json({
        success: false,
        error: 'Конфликт времени: выбранный интервал уже занят другим бронированием или площадка находится на техобслуживании/ремонте',
        details: err.message,
      });
    }

    // 23505: Нарушение уникальности (например, email пользователя)
    if (err.code === '23505') {
      let field = 'записи';
      if (err.detail && err.detail.includes('email')) field = 'пользователя с таким email';
      return res.status(409).json({
        success: false,
        error: `Конфликт данных: запись ${field} уже существует в системе`,
      });
    }

    // 23503: Нарушение внешнего ключа
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Указан несуществующий связанный объект (площадка, организация или пользователь)',
      });
    }

    // 23514: Нарушение CHECK ограничения
    if (err.code === '23514') {
      return res.status(400).json({
        success: false,
        error: 'Нарушение ограничений корректности данных (например, дата окончания должна быть позже даты начала)',
      });
    }
  }

  // 3. Пользовательские прикладные ошибки (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details || undefined,
    });
  }

  // 4. Ошибки авторизации JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Недействительный токен авторизации',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Срок действия токена авторизации истек. Пожалуйста, выполните вход повторно',
    });
  }

  // 5. Непредвиденные внутренние ошибки сервера (500)
  return res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера. Пожалуйста, повторите попытку позже',
  });
}

module.exports = {
  AppError,
  errorHandler,
};
