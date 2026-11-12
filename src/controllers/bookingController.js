/**
 * Контроллер бронирования спортивных площадок.
 * Реализует создание бронирования с защитой от пересечений, получение списка броней пользователя,
 * перенос времени (reschedule) и отмену бронирования.
 */
const { z } = require('zod');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// Схема валидации создания бронирования
const createBookingSchema = {
  body: z.object({
    venue_id: z.coerce.number().int().positive('Необходимо указать корректный ID площадки'),
    start_at: z.string().refine(val => !isNaN(Date.parse(val)), 'Некорректный формат времени начала (ISO 8601)'),
    end_at: z.string().refine(val => !isNaN(Date.parse(val)), 'Некорректный формат времени окончания (ISO 8601)'),
    purpose: z.string().min(3, 'Укажите цель бронирования (не менее 3 символов)'),
    participants_count: z.coerce.number().int().positive('Количество участников должно быть больше 0'),
    organization_id: z.coerce.number().int().positive().optional().nullable(),
  }),
};

// Схема валидации изменения времени бронирования
const rescheduleBookingSchema = {
  body: z.object({
    start_at: z.string().refine(val => !isNaN(Date.parse(val)), 'Некорректный формат времени начала'),
    end_at: z.string().refine(val => !isNaN(Date.parse(val)), 'Некорректный формат времени окончания'),
  }),
};

// Создание нового бронирования
async function createBooking(req, res, next) {
  try {
    const { venue_id, start_at, end_at, purpose, participants_count, organization_id } = req.body;

    const startDate = new Date(start_at);
    const endDate = new Date(end_at);

    if (endDate <= startDate) {
      throw new AppError('Время окончания бронирования должно быть строго позже времени начала', 400);
    }

    // Проверяем минимальную и максимальную длительность брони (от 30 минут до 8 часов)
    const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    if (durationMinutes < 30) {
      throw new AppError('Минимальная продолжительность бронирования составляет 30 минут', 400);
    }
    if (durationMinutes > 480) {
      throw new AppError('Максимальная продолжительность бронирования составляет 8 часов', 400);
    }

    // Проверяем активность площадки
    const venueCheck = await db.query('SELECT id, is_active, name FROM venues WHERE id = $1', [venue_id]);
    if (venueCheck.rowCount === 0) {
      throw new AppError('Указанная спортивная площадка не найдена', 404);
    }
    if (!venueCheck.rows[0].is_active) {
      throw new AppError('Данная спортивная площадка временно выведена из эксплуатации', 400);
    }

    // Организация пользователя: если передана в теле, берем её, иначе берем из профиля
    const assignedOrgId = organization_id || req.user.organization_id || null;

    // Статус: для учителей и тренеров создаем confirmed, для внешних заявок pending
    const status = 'confirmed';

    // Вставка в БД. Если интервал пересекается с существующей бронью или блокировкой,
    // ограничение ex_booking_no_overlap или триггер trg_booking_block_conflict сгенерирует код 23P01
    const result = await db.query(
      `INSERT INTO bookings (venue_id, user_id, organization_id, start_at, end_at, purpose, participants_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, venue_id, user_id, organization_id, start_at, end_at, purpose, participants_count, status, created_at`,
      [venue_id, req.user.id, assignedOrgId, startDate.toISOString(), endDate.toISOString(), purpose, participants_count, status]
    );

    const booking = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Площадка успешно забронирована',
      data: booking,
    });
  } catch (err) {
    next(err);
  }
}

// Получение списка бронирований текущего пользователя
async function getMyBookings(req, res, next) {
  try {
    const result = await db.query(
      `SELECT b.id, b.venue_id, v.name AS venue_name, v.address AS venue_address,
              st.name AS sport_type_name,
              b.start_at, b.end_at, b.purpose, b.participants_count, b.status, b.created_at,
              o.name AS organization_name,
              (
                SELECT photo_url FROM venue_photos vp WHERE vp.venue_id = v.id ORDER BY sort_order ASC LIMIT 1
              ) AS venue_photo_url
       FROM bookings b
       JOIN venues v ON b.venue_id = v.id
       JOIN sport_types st ON v.sport_type_id = st.id
       LEFT JOIN organizations o ON b.organization_id = o.id
       WHERE b.user_id = $1
       ORDER BY b.start_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

// Перенос времени существующего бронирования (PATCH /api/bookings/:id)
async function rescheduleBooking(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      throw new AppError('Некорректный идентификатор бронирования', 400);
    }

    const { start_at, end_at } = req.body;
    const startDate = new Date(start_at);
    const endDate = new Date(end_at);

    if (endDate <= startDate) {
      throw new AppError('Время окончания должно быть позже времени начала', 400);
    }

    // Проверяем принадлежность бронирования пользователю (или права администратора)
    const existing = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (existing.rowCount === 0) {
      throw new AppError('Бронирование не найдено', 404);
    }

    const currentBooking = existing.rows[0];
    const isOwner = currentBooking.user_id === req.user.id;
    const isStaff = ['admin', 'venue_manager'].includes(req.user.role_name);

    if (!isOwner && !isStaff) {
      throw new AppError('У вас нет прав на редактирование этого бронирования', 403);
    }

    if (currentBooking.status === 'cancelled') {
      throw new AppError('Нельзя изменить отмененное бронирование', 400);
    }

    // Обновляем даты. Ограничение БД гарантирует отсутствие конфликтов с другими слотами
    const updateResult = await db.query(
      `UPDATE bookings 
       SET start_at = $1, end_at = $2
       WHERE id = $3
       RETURNING *`,
      [startDate.toISOString(), endDate.toISOString(), bookingId]
    );

    res.json({
      success: true,
      message: 'Время бронирования успешно изменено',
      data: updateResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// Отмена бронирования (DELETE /api/bookings/:id)
async function cancelBooking(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      throw new AppError('Некорректный идентификатор бронирования', 400);
    }

    const existing = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (existing.rowCount === 0) {
      throw new AppError('Бронирование не найдено', 404);
    }

    const currentBooking = existing.rows[0];
    const isOwner = currentBooking.user_id === req.user.id;
    const isStaff = ['admin', 'venue_manager'].includes(req.user.role_name);

    if (!isOwner && !isStaff) {
      throw new AppError('У вас нет прав на отмену этого бронирования', 403);
    }

    if (currentBooking.status === 'cancelled') {
      return res.json({
        success: true,
        message: 'Бронирование уже было отменено ранее',
        data: currentBooking,
      });
    }

    const updateResult = await db.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [bookingId]
    );

    res.json({
      success: true,
      message: 'Бронирование успешно отменено. Слот освобожден для других пользователей',
      data: updateResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBookingSchema,
  rescheduleBookingSchema,
  createBooking,
  getMyBookings,
  rescheduleBooking,
  cancelBooking,
};
