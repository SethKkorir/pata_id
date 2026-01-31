const { validationResult } = require('express-validator');
const { body, param, query } = require('express-validator');

// Validation error handler
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Custom validators
exports.customValidators = {
  isEmailOrPhone: value => {
    if (!value) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s-]{10,}$/;

    return emailRegex.test(value) || phoneRegex.test(value);
  },

  isStrongPassword: value => {
    if (!value) return false;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    return value.length >= 8 && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  },

  isValidIdNumber: (value, { req }) => {
    if (!value) return false;

    // Student ID validation
    if (req.body.idType === 'student') {
      return /^[A-Z]{3}\d{6}$/.test(value); // Example: STD202300456
    }

    // Staff ID validation
    if (req.body.idType === 'staff') {
      return /^[A-Z]{3}\d{5}$/.test(value); // Example: STF12345
    }

    return true;
  },

  isCampusLocation: value => {
    const validCampuses = ['Athi River', 'Nairobi', 'Mombasa'];
    return validCampuses.includes(value);
  },
};

// Validation chains for different routes
exports.authValidation = {
  register: [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('role').isIn(['student', 'staff', 'security']).withMessage('Invalid role'),

    // Student/staff specific
    // Required email
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email address is required')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),

    body('studentId')
      .if(body('role').equals('student'))
      .trim()
      .notEmpty()
      .withMessage('Student ID is required'),

    body('staffId')
      .if(body('role').equals('staff'))
      .trim()
      .notEmpty()
      .withMessage('Staff ID is required'),

    // Security guard specific
    body('phone')
      .if(body('role').equals('security'))
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^\+?[\d\s-]{10,}$/)
      .withMessage('Please provide a valid phone number'),

    body('guardId')
      .if(body('role').equals('security'))
      .trim()
      .notEmpty()
      .withMessage('Guard ID is required'),

    // Password
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),

    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],

  login: [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Email, phone or ID number is required'),

    body('password').notEmpty().withMessage('Password is required'),
    body('role').optional().isIn(['student', 'staff', 'security', 'admin']).withMessage('Invalid role'),
  ],
};

exports.reportValidation = {
  create: [
    body('idType').isIn(['student', 'staff']).withMessage('Invalid ID type'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('idNumber').trim().notEmpty().withMessage('ID number is required'),

    body('finderType').isIn(['student', 'staff', 'security', 'public']).withMessage('Invalid finder type'),
    body('finderContact').trim().notEmpty().withMessage('Finder contact is required'),
    body('finderContactMethod').isIn(['email', 'phone']).withMessage('Invalid contact method'),

    body('campus').custom(this.customValidators.isCampusLocation).withMessage('Invalid campus'),
    body('specificLocation').trim().notEmpty().withMessage('Specific location is required'),
  ],

  update: [
    param('id').isMongoId().withMessage('Invalid report ID'),
    body('status')
      .optional()
      .isIn(['pending', 'verified', 'claimed', 'returned', 'archived'])
      .withMessage('Invalid status'),
  ],

  search: [
    query('idType').optional().isIn(['student', 'staff']).withMessage('Invalid ID type'),
    query('campus').optional().custom(this.customValidators.isCampusLocation).withMessage('Invalid campus'),
    query('name').optional().trim(),
    query('idNumber').optional().trim(),
    query('status').optional().isIn(['pending', 'verified', 'claimed', 'returned']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
};

exports.userValidation = {
  updateProfile: [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().trim().matches(/^\+?[\d\s-]{10,}$/),
    body('campus').optional().isIn(['Athi River', 'Nairobi', 'Mombasa', 'All Campuses']),
    body('notificationPreferences.email').optional().isBoolean(),
    body('notificationPreferences.sms').optional().isBoolean(),
    body('notificationPreferences.push').optional().isBoolean(),
  ],

  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .custom(this.customValidators.isStrongPassword)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match'),
  ],
};