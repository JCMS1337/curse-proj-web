/**
 * Middleware проверки прав доступа на основе ролей (RBAC).
 * Допустимые роли: 'teacher', 'school_admin', 'venue_manager', 'admin'.
 */
const { AppError } = require('./errorHandler');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Пользователь не аутентифицирован', 401));
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return next(
        new AppError(
          `Доступ запрещен. Недостаточно прав для выполнения действия (требуется роль: ${allowedRoles.join(' или ')})`,
          403
        )
      );
    }

    next();
  };
}

module.exports = {
  requireRole,
};
