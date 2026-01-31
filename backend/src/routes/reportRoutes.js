const express = require('express');
const multer = require('multer');
const {
  createReport,
  searchReports,
  getReport,
  updateReport,
  deleteReport,
  getMyReports,
  getStats,
} = require('../controllers/idReportController');
const { protect, authorize, setUser } = require('../middleware/auth');
const { validate, reportValidation } = require('../middleware/validation');

const router = express.Router();
console.log('📦 Report Routes Module Loaded');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  },
});

// PUBLIC ROUTES (No protect middleware)
// These routes are accessible even when not logged in
router.get('/search', setUser, reportValidation.search, validate, searchReports);
router.get('/:id', setUser, getReport);
router.post(
  '/',
  setUser,
  upload.array('photos', 3),
  reportValidation.create,
  validate,
  createReport
);

// PROTECTED ROUTES (Requiring authentication)
// These routes always require a valid JWT token
router.get('/my-reports', protect, getMyReports);
router.get('/stats', protect, authorize('admin', 'security'), getStats);

router.put(
  '/:id',
  protect,
  authorize('admin', 'security'),
  reportValidation.update,
  validate,
  updateReport
);

router.delete('/:id', protect, authorize('admin'), deleteReport);

module.exports = router;