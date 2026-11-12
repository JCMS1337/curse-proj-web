/**
 * Маршруты администратора и управляющего спортивными объектами.
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

// Доступ разрешен только администраторам и управляющим объектами
router.use(authenticate, requireRole('admin', 'venue_manager'));

// Площадки
router.get('/venues', adminController.getAdminVenues);
router.post('/venues', adminController.createVenue);
router.put('/venues/:id', adminController.updateVenue);
router.delete('/venues/:id', adminController.deleteVenue);

// Пользователи (только системный администратор)
router.get('/users', requireRole('admin'), adminController.getUsers);

// Бронирования
router.get('/bookings', adminController.getAllBookings);
router.patch('/bookings/:id/status', adminController.updateBookingStatus);

// Блокировки площадок (ремонт / мероприятия)
router.get('/blocks', adminController.getAllBlocks);
router.post('/blocks', adminController.createBlock);
router.delete('/blocks/:id', adminController.deleteBlock);

module.exports = router;
