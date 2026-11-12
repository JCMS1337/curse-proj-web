/**
 * Контроллер аутентификации и профиля пользователя.
 * Обрабатывает регистрацию, вход в систему, получение текущего профиля и словарей.
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// Схемы валидации Zod
const registerSchema = {
  body: z.object({
    email: z.string().email('Некорректный формат email адреса'),
    password: z.string().min(6, 'Пароль должен содержать не менее 6 символов'),
    full_name: z.string().min(2, 'ФИО должно содержать не менее 2 символов'),
    phone: z.string().optional().nullable(),
    role_id: z.coerce.number().int().positive().optional(),
    organization_id: z.coerce.number().int().positive().optional().nullable(),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().email('Некорректный формат email адреса'),
    password: z.string().min(1, 'Пароль обязателен для ввода'),
  }),
};

// Генерация JWT токена
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name,
    },
    process.env.JWT_SECRET || 'super_secret_jwt_key_sport_booking_2026_coursework',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Регистрация нового пользователя
async function register(req, res, next) {
  try {
    const { email, password, full_name, phone, role_id, organization_id } = req.body;

    // Проверяем, существует ли пользователь с таким email
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      throw new AppError('Пользователь с таким email уже зарегистрирован в системе', 409);
    }

    // Если роль не указана явно, по умолчанию назначаем роль "teacher" (id: 1)
    let assignedRoleId = role_id;
    if (!assignedRoleId) {
      const defaultRole = await db.query("SELECT id FROM roles WHERE name = 'teacher'");
      assignedRoleId = defaultRole.rows[0]?.id || 1;
    }

    // Хэширование пароля через bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertResult = await db.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role_id, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, phone, role_id, organization_id, created_at`,
      [email, passwordHash, full_name, phone || null, assignedRoleId, organization_id || null]
    );

    const newUser = insertResult.rows[0];

    // Добираем имя роли и имя организации
    const enriched = await db.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.role_id, r.name AS role_name, 
              u.organization_id, o.name AS organization_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [newUser.id]
    );

    const userData = enriched.rows[0];
    const token = generateToken(userData);

    res.status(201).json({
      success: true,
      message: 'Регистрация успешно завершена',
      data: {
        user: userData,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Вход в систему (логин)
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.phone, u.role_id, r.name AS role_name, 
              u.organization_id, o.name AS organization_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      throw new AppError('Неверный адрес электронной почты или пароль', 401);
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Неверный адрес электронной почты или пароль', 401);
    }

    delete user.password_hash;
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Успешный вход в систему',
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Получение профиля текущего пользователя
async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Справочники для форм регистрации (организации и доступные роли)
async function getDictionaries(req, res, next) {
  try {
    const [rolesRes, orgsRes, sportsRes] = await Promise.all([
      db.query('SELECT id, name, description FROM roles ORDER BY id ASC'),
      db.query('SELECT id, name, address, phone FROM organizations ORDER BY name ASC'),
      db.query('SELECT id, name, description FROM sport_types ORDER BY name ASC'),
    ]);

    res.json({
      success: true,
      data: {
        roles: rolesRes.rows,
        organizations: orgsRes.rows,
        sport_types: sportsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerSchema,
  loginSchema,
  register,
  login,
  getMe,
  getDictionaries,
};
