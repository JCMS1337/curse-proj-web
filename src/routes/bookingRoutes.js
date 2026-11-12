/**
 * Маршруты бронирования площадок (требуют обязательной аутентификации).
 */
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', validate(bookingController.createBookingSchema), bookingController.createBooking);
router.get('/my', bookingController.getMyBookings);
router.patch('/:id', validate(bookingController.rescheduleBookingSchema), bookingController.rescheduleBooking);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
