/**
 * Маршруты каталога спортивных площадок и проверки доступности.
 */
const express = require('express');
const router = express.Router();
const venueController = require('../controllers/venueController');

router.get('/', venueController.getVenues);
router.get('/:id', venueController.getVenueById);
router.get('/:id/availability', venueController.getVenueAvailability);

module.exports = router;
