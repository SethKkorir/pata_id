const express = require('express');
const multer = require('multer');
const {
  startVerification,
  verifyOTP,
  verifySecurityQuestions,
  verifyIDNumber,
  uploadDocuments,
  securityVerify,
  getVerification,
} = require('../controllers/verificationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  },
});

// All routes require authentication
router.use(protect);

router.post('/start', startVerification);
router.post('/verify-otp', verifyOTP);
router.post('/verify-questions', verifySecurityQuestions);
router.post('/verify-id', verifyIDNumber);
router.post(
  '/upload-documents',
  upload.array('documents', 5), // Max 5 documents
  uploadDocuments
);
router.post('/security-verify', authorize('security'), securityVerify);
router.get('/:id', getVerification);

module.exports = router;