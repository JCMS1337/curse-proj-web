/**
 * Контроллер административной панели.
 * Управление площадками, пользователями, всеми бронированиями и сервисными блокировками.
 */
const { z } = require('zod');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// 1. Управление площадками (CRUD)
async function getAdminVenues(req, res, next) {
  try {
    const result = await db.query(`
      SELECT v.*, st.name AS sport_type_name,
             (SELECT COUNT(*) FROM bookings b WHERE b.venue_id = v.id)::int AS total_bookings,
             (SELECT COUNT(*) FROM bookings b WHERE b.venue_id = v.id AND b.status = 'confirmed' AND b.end_at > NOW())::int AS active_bookings
      FROM venues v
      JOIN sport_types st ON v.sport_type_id = st.id
      ORDER BY v.id ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function createVenue(req, res, next) {
  try {
    const {
      name, address, bank, district, latitude, longitude, sport_type_id,
      dimensions, surface_type, has_lighting, has_fence,
      description, is_active, photos, equipment
    } = req.body;

    if (!name || !address || latitude === undefined || longitude === undefined || !sport_type_id) {
      throw new AppError('Заполните обязательные поля: название, адрес, координаты и вид спорта', 400);
    }

    const assignedBank = (bank === 'left' || bank === 'right') ? bank : 'right';

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const venueRes = await client.query(
        `INSERT INTO venues (name, address, bank, district, latitude, longitude, sport_type_id, dimensions, surface_type, has_lighting, has_fence, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          name, address, assignedBank, district || null, latitude, longitude, sport_type_id,
          dimensions || null, surface_type || null,
          !!has_lighting, !!has_fence, description || null,
          is_active !== undefined ? !!is_active : true
        ]
      );

      const venue = venueRes.rows[0];

      // Добавление фото
      if (Array.isArray(photos) && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const photoUrl = typeof photos[i] === 'string' ? photos[i] : photos[i].photo_url;
          if (photoUrl) {
            await client.query(
              `INSERT INTO venue_photos (venue_id, photo_url, sort_order) VALUES ($1, $2, $3)`,
              [venue.id, photoUrl, i + 1]
            );
          }
        }
      }

      // Добавление инвентаря
      if (Array.isArray(equipment) && equipment.length > 0) {
        for (const item of equipment) {
          if (item.name) {
            await client.query(
              `INSERT INTO venue_equipment (venue_id, name, quantity, condition) VALUES ($1, $2, $3, $4)`,
              [venue.id, item.name, item.quantity || 1, item.condition || 'Хорошее']
            );
          }
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Спортивная площадка успешно создана',
        data: venue,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

async function updateVenue(req, res, next) {
  try {
    const venueId = parseInt(req.params.id, 10);
    if (isNaN(venueId)) throw new AppError('Некорректный ID площадки', 400);

    const {
      name, address, bank, district, latitude, longitude, sport_type_id,
      dimensions, surface_type, has_lighting, has_fence,
      description, is_active
    } = req.body;

    const result = await db.query(
      `UPDATE venues
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           bank = COALESCE($3, bank),
           district = COALESCE($4, district),
           latitude = COALESCE($5, latitude),
           longitude = COALESCE($6, longitude),
           sport_type_id = COALESCE($7, sport_type_id),
           dimensions = COALESCE($8, dimensions),
           surface_type = COALESCE($9, surface_type),
           has_lighting = COALESCE($10, has_lighting),
           has_fence = COALESCE($11, has_fence),
           description = COALESCE($12, description),
           is_active = COALESCE($13, is_active)
       WHERE id = $14
       RETURNING *`,
      [name, address, bank, district, latitude, longitude, sport_type_id, dimensions, surface_type, has_lighting, has_fence, description, is_active, venueId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Площадка не найдена', 404);
    }

    res.json({
      success: true,
      message: 'Информация о площадке обновлена',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

async function deleteVenue(req, res, next) {
  try {
    const venueId = parseInt(req.params.id, 10);
    if (isNaN(venueId)) throw new AppError('Некорректный ID площадки', 400);

    // Мягкое удаление (деактивация)
    const result = await db.query(
      `UPDATE venues SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [venueId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Площадка не найдена', 404);
    }

    res.json({
      success: true,
      message: 'Площадка деактивирована и скрыта из публичного каталога',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 2. Управление пользователями
async function getUsers(req, res, next) {
  try {
    const result = await db.query(`
      SELECT u.id, u.email, u.full_name, u.phone, u.role_id, r.name AS role_name,
             u.organization_id, o.name AS organization_name, u.created_at,
             (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id)::int AS bookings_count
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      ORDER BY u.id ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

// 3. Управление всеми бронированиями
async function getAllBookings(req, res, next) {
  try {
    const { status, venue_id } = req.query;

    let queryText = `
      SELECT b.id, b.venue_id, v.name AS venue_name, v.address AS venue_address,
             st.name AS sport_type_name,
             b.user_id, u.full_name AS user_full_name, u.email AS user_email, u.phone AS user_phone,
             b.organization_id, o.name AS organization_name,
             b.start_at, b.end_at, b.purpose, b.participants_count, b.status, b.created_at
      FROM bookings b
      JOIN venues v ON b.venue_id = v.id
      JOIN sport_types st ON v.sport_type_id = st.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN organizations o ON b.organization_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      queryText += ` AND b.status = $${params.length}`;
    }

    if (venue_id) {
      params.push(parseInt(venue_id, 10));
      queryText += ` AND b.venue_id = $${params.length}`;
    }

    queryText += ` ORDER BY b.start_at DESC`;

    const result = await db.query(queryText, params);

    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function updateBookingStatus(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      throw new AppError('Некорректный статус бронирования (допустимо: pending, confirmed, cancelled)', 400);
    }

    const result = await db.query(
      `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, bookingId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Бронирование не найдено', 404);
    }

    res.json({
      success: true,
      message: `Статус бронирования успешно изменен на "${status}"`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 4. Управление блокировками площадок (ремонт / мероприятия)
async function getAllBlocks(req, res, next) {
  try {
    const result = await db.query(`
      SELECT vb.*, v.name AS venue_name, v.address AS venue_address
      FROM venue_blocks vb
      JOIN venues v ON vb.venue_id = v.id
      ORDER BY vb.start_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function createBlock(req, res, next) {
  try {
    const { venue_id, start_at, end_at, reason, note } = req.body;

    if (!venue_id || !start_at || !end_at || !reason) {
      throw new AppError('Заполните обязательные поля: площадка, время начала и окончания, причина блокировки', 400);
    }

    const startDate = new Date(start_at);
    const endDate = new Date(end_at);

    if (endDate <= startDate) {
      throw new AppError('Время окончания блокировки должно быть строго позже времени начала', 400);
    }

    // Вставка блокировки. При наличии активных броней триггер trg_block_booking_conflict сгенерирует 23P01
    const result = await db.query(
      `INSERT INTO venue_blocks (venue_id, start_at, end_at, reason, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [venue_id, startDate.toISOString(), endDate.toISOString(), reason, note || null]
    );

    res.status(201).json({
      success: true,
      message: 'Площадка успешно заблокирована на указанный период',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

async function deleteBlock(req, res, next) {
  try {
    const blockId = parseInt(req.params.id, 10);
    if (isNaN(blockId)) throw new AppError('Некорректный ID блокировки', 400);

    const result = await db.query(`DELETE FROM venue_blocks WHERE id = $1 RETURNING *`, [blockId]);
    if (result.rowCount === 0) {
      throw new AppError('Блокировка не найдена', 404);
    }

    res.json({
      success: true,
      message: 'Блокировка снята. Площадка снова доступна для бронирования',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  getUsers,
  getAllBookings,
  updateBookingStatus,
  getAllBlocks,
  createBlock,
  deleteBlock,
};
