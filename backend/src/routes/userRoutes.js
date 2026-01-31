const express = require('express');
const {
  getProfile,
  updateProfile,
  changePassword,
  getMyReports,
  deleteAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate, userValidation } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', userValidation.updateProfile, validate, updateProfile);
router.put('/password', userValidation.changePassword, validate, changePassword);
router.get('/reports', getMyReports);
router.delete('/account', deleteAccount);

module.exports = router;