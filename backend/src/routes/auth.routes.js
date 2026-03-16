const router = require('express').Router();
const { body } = require('express-validator');
const { register, login, refresh, forgotPassword, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number'),
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], login);

router.post('/refresh', refresh);

// Forgot password — sends reset email via Supabase
router.post('/forgot-password', forgotPassword);

router.get('/me', authenticate, getMe);

module.exports = router;