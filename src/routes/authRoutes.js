/**
 * Маршруты авторизации и профиля пользователя.
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

router.post('/register', validate(authController.registerSchema), authController.register);
router.post('/login', validate(authController.loginSchema), authController.login);
router.get('/me', authenticate, authController.getMe);
router.get('/dictionaries', authController.getDictionaries);

module.exports = router;
