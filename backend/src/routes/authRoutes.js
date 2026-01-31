const express = require('express');
const {
  register,
  login,
  verify,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, authValidation } = require('../middleware/validation');

const router = express.Router();

router.post('/register', authValidation.register, validate, register);
router.post('/login', authValidation.login, validate, login);
router.get('/verify/:token', verify);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;