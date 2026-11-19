/**
 * Контроллер каталога спортивных площадок и проверки доступности слотов.
 */
const { z } = require('zod');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// Получение списка спортивных площадок с фильтрацией и поиском
async function getVenues(req, res, next) {
  try {
    const { 
      sport_type, 
      sport_type_id, 
      bank, 
      district, 
      has_lighting, 
      has_fence, 
      search, 
      is_active,
      limit,
      offset 
    } = req.query;

    let queryText = `
      SELECT v.id, v.name, v.address, v.bank, v.district, v.latitude, v.longitude, 
             v.sport_type_id, st.name AS sport_type, st.name AS sport_type_name,
             v.dimensions, v.surface_type, v.has_lighting, v.has_fence, 
             v.description, v.is_active, v.created_at,
             (
               SELECT photo_url 
               FROM venue_photos 
               WHERE venue_id = v.id 
               ORDER BY sort_order ASC, id ASC 
               LIMIT 1
             ) AS main_photo_url,
             (
               SELECT json_agg(json_build_object('id', vp.id, 'photo_url', vp.photo_url, 'sort_order', vp.sort_order))
               FROM venue_photos vp
               WHERE vp.venue_id = v.id
             ) AS photos,
             (
               SELECT COUNT(*) FROM bookings b WHERE b.venue_id = v.id AND b.status != 'cancelled'
             )::int AS bookings_count
      FROM venues v
      JOIN sport_types st ON v.sport_type_id = st.id
      WHERE 1=1
    `;

    const queryParams = [];

    // Фильтр активности площадки (по умолчанию только активные)
    if (is_active !== undefined && is_active !== 'all') {
      queryParams.push(is_active === 'true' || is_active === true);
      queryText += ` AND v.is_active = $${queryParams.length}`;
    } else if (is_active !== 'all') {
      queryText += ` AND v.is_active = TRUE`;
    }

    // Фильтр по виду спорта (по ID или названию)
    if (sport_type_id) {
      queryParams.push(parseInt(sport_type_id, 10));
      queryText += ` AND v.sport_type_id = $${queryParams.length}`;
    } else if (sport_type) {
      if (!isNaN(parseInt(sport_type, 10))) {
        queryParams.push(parseInt(sport_type, 10));
        queryText += ` AND v.sport_type_id = $${queryParams.length}`;
      } else {
        queryParams.push(sport_type.trim());
        queryText += ` AND st.name ILIKE $${queryParams.length}`;
      }
    }

    // Фильтр по берегу (left / right)
    if (bank && bank.trim() !== '') {
      queryParams.push(bank.trim().toLowerCase());
      queryText += ` AND LOWER(v.bank) = $${queryParams.length}`;
    }

    // Фильтр по району
    if (district && district.trim() !== '') {
      queryParams.push(`%${district.trim()}%`);
      queryText += ` AND v.district ILIKE $${queryParams.length}`;
    }

    // Фильтр по наличию освещения
    if (has_lighting !== undefined && has_lighting !== '') {
      queryParams.push(has_lighting === 'true' || has_lighting === true);
      queryText += ` AND v.has_lighting = $${queryParams.length}`;
    }

    // Фильтр по наличию ограждения
    if (has_fence !== undefined && has_fence !== '') {
      queryParams.push(has_fence === 'true' || has_fence === true);
      queryText += ` AND v.has_fence = $${queryParams.length}`;
    }

    // Поисковая строка по названию или адресу (регистронезависимо)
    if (search && search.trim() !== '') {
      queryParams.push(`%${search.trim()}%`);
      queryText += ` AND (v.name ILIKE $${queryParams.length} OR v.address ILIKE $${queryParams.length} OR v.district ILIKE $${queryParams.length} OR v.description ILIKE $${queryParams.length})`;
    }

    queryText += ` ORDER BY v.id ASC`;

    // Пагинация (limit / offset)
    if (limit && !isNaN(parseInt(limit, 10))) {
      queryParams.push(parseInt(limit, 10));
      queryText += ` LIMIT $${queryParams.length}`;
    }

    if (offset && !isNaN(parseInt(offset, 10))) {
      queryParams.push(parseInt(offset, 10));
      queryText += ` OFFSET $${queryParams.length}`;
    }

    const result = await db.query(queryText, queryParams);

    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

// Получение детальной информации о конкретной площадке (включая фото и инвентарь)
async function getVenueById(req, res, next) {
  try {
    const venueId = parseInt(req.params.id, 10);
    if (isNaN(venueId)) {
      throw new AppError('Некорректный идентификатор площадки', 400);
    }

    const venueRes = await db.query(
      `SELECT v.id, v.name, v.address, v.bank, v.district, v.latitude, v.longitude, 
              v.sport_type_id, st.name AS sport_type, st.name AS sport_type_name, st.description AS sport_type_description,
              v.dimensions, v.surface_type, v.has_lighting, v.has_fence, 
              v.description, v.is_active, v.created_at
       FROM venues v
       JOIN sport_types st ON v.sport_type_id = st.id
       WHERE v.id = $1`,
      [venueId]
    );

    if (venueRes.rowCount === 0) {
      throw new AppError('Спортивная площадка не найдена', 404);
    }

    const venue = venueRes.rows[0];

    // Фотографии площадки
    const photosRes = await db.query(
      `SELECT id, photo_url, sort_order 
       FROM venue_photos 
       WHERE venue_id = $1 
       ORDER BY sort_order ASC, id ASC`,
      [venueId]
    );

    // Оборудование площадки
    const equipmentRes = await db.query(
      `SELECT id, name, quantity, condition 
       FROM venue_equipment 
       WHERE venue_id = $1 
       ORDER BY id ASC`,
      [venueId]
    );

    venue.photos = photosRes.rows;
    venue.equipment = equipmentRes.rows;

    res.json({
      success: true,
      data: venue,
    });
  } catch (err) {
    next(err);
  }
}

// Проверка занятости и доступности интервалов площадки
async function getVenueAvailability(req, res, next) {
  try {
    const venueId = parseInt(req.params.id, 10);
    if (isNaN(venueId)) {
      throw new AppError('Некорректный идентификатор площадки', 400);
    }

    // Диапазон дат: по умолчанию сегодня и следующие 14 дней
    let fromDate = req.query.from ? new Date(req.query.from) : new Date();
    let toDate = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new AppError('Некорректный формат дат (используйте формат ISO или YYYY-MM-DD)', 400);
    }

    if (toDate <= fromDate) {
      throw new AppError('Дата окончания периода должна быть позже даты начала', 400);
    }

    // 1. Получаем активные бронирования
    const bookingsRes = await db.query(
      `SELECT b.id, b.start_at, b.end_at, b.purpose, b.status,
              o.name AS organization_name, u.full_name AS booked_by
       FROM bookings b
       LEFT JOIN organizations o ON b.organization_id = o.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.venue_id = $1 
         AND b.status != 'cancelled'
         AND tstzrange(b.start_at, b.end_at) && tstzrange($2::timestamptz, $3::timestamptz)
       ORDER BY b.start_at ASC`,
      [venueId, fromDate.toISOString(), toDate.toISOString()]
    );

    // 2. Получаем блокировки площадки (ремонт, техобслуживание)
    const blocksRes = await db.query(
      `SELECT vb.id, vb.start_at, vb.end_at, vb.reason, vb.note
       FROM venue_blocks vb
       WHERE vb.venue_id = $1 
         AND tstzrange(vb.start_at, vb.end_at) && tstzrange($2::timestamptz, $3::timestamptz)
       ORDER BY vb.start_at ASC`,
      [venueId, fromDate.toISOString(), toDate.toISOString()]
    );

    res.json({
      success: true,
      data: {
        venue_id: venueId,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        bookings: bookingsRes.rows,
        blocks: blocksRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Получение списка всех видов спорта
async function getSportTypes(req, res, next) {
  try {
    const result = await db.query('SELECT id, name, description FROM sport_types ORDER BY id ASC');
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

// Получение списка районов и берегов Новосибирска
async function getDistricts(req, res, next) {
  try {
    const districts = [
      { name: 'Центральный', bank: 'right' },
      { name: 'Железнодорожный', bank: 'right' },
      { name: 'Заельцовский', bank: 'right' },
      { name: 'Калининский', bank: 'right' },
      { name: 'Дзержинский', bank: 'right' },
      { name: 'Ленинский', bank: 'left' },
      { name: 'Кировский', bank: 'left' },
      { name: 'Советский', bank: 'left' },
      { name: 'Октябрьский', bank: 'left' },
      { name: 'Первомайский', bank: 'left' },
    ];
    res.json({
      success: true,
      data: districts,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVenues,
  getVenueById,
  getVenueAvailability,
  getSportTypes,
  getDistricts,
};
