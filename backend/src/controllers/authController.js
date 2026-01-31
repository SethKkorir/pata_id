const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const EmailService = require('../services/emailService');
const SMSService = require('../services/smsService');

// Generate JWT Token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'pataid_internal_fallback_secret_dont_use_in_prod';
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ [AUTH] JWT_SECRET is missing from environment. Using fallback secret.');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { email, phone, password, role, studentId, staffId, ...userData } = req.body;

    // Must have at least one identifier: email, phone, or student/staff ID
    if (!email && !phone && !studentId && !staffId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one identifier (Email, Phone, or ID Number)',
      });
    }

    // Check if user exists by any identifier
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
        ...(studentId ? [{ studentId }] : []),
        ...(staffId ? [{ staffId }] : []),
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account already exists with these details',
      });
    }

    // Create user
    const user = await User.create({
      ...userData,
      email: email || null,
      phone: phone || null,
      studentId: studentId || null,
      staffId: staffId || null,
      password,
      role,
      isVerified: true, // Auto-verify for now
      verificationToken: crypto.randomBytes(32).toString('hex'),
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    // Log registration
    await AuditLog.create({
      action: 'create_user',
      userId: user._id,
      userRole: user.role,
      userEmail: user.email,
      userPhone: user.phone,
      resourceType: 'user',
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
    });

    // Send verification based on role
    try {
      if (role === 'security') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationToken = otp;
        await user.save();
        await SMSService.sendSecurityGuardLoginOTP(phone, otp);
      } else {
        // 📧 Restore email verification attempt
        await EmailService.sendVerificationEmail(user, user.verificationToken);
      }
    } catch (msgError) {
      console.error('⚠️ Registration notification failed:', msgError.message);
      // Still letting registration complete if SMTP is broken
    }

    console.log(`✅ User registered successfully: ${user.email || user.phone}`);
    // Send token response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;

    // Validate identifier
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an identifier and password',
      });
    }

    // Find user by identification fields
    let user;
    if (role === 'security') {
      // Security guards specifically log in with phone
      user = await User.findOne({ phone: identifier, role: 'security' });
    } else {
      // Students/staff/admin can log in with Email, Phone, or ID Number
      user = await User.findOne({
        $and: [
          { role: { $in: ['student', 'staff', 'admin'] } },
          {
            $or: [
              { email: identifier },
              { phone: identifier },
              { studentId: identifier },
              { staffId: identifier },
            ],
          },
        ],
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked. Please try again later.',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();

      await AuditLog.create({
        action: 'login',
        userId: user._id,
        userRole: user.role,
        resourceType: 'user',
        resourceId: user._id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        method: req.method,
        tags: ['failed_login'],
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log successful login
    await AuditLog.create({
      action: 'login',
      userId: user._id,
      userRole: user.role,
      resourceType: 'user',
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['successful_login'],
    });

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email/phone
// @route   GET /api/auth/verify/:token
// @access  Public
exports.verify = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find user by verification token
    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
      });
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // Log verification
    await AuditLog.create({
      action: 'verify_report',
      userId: user._id,
      userRole: user.role,
      resourceType: 'user',
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
    });

    res.status(200).json({
      success: true,
      message: 'Account verified successfully',
      data: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -twoFactorSecret')
      .populate('reportsFound', 'reportNumber status createdAt')
      .populate('reportsOwned', 'reportNumber status claimedAt');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // Log logout action
    await AuditLog.create({
      action: 'logout',
      userId: req.user._id,
      userRole: req.user.role,
      resourceType: 'user',
      resourceId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
    });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { identifier } = req.body;

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this email or phone',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send reset email or SMS based on user's preference
    if (user.email) {
      await EmailService.sendPasswordResetEmail(user, resetToken);
    } else if (user.phone) {
      // Send SMS with reset token
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await SMSService.sendSMS(
        user.phone,
        `Password reset requested. Use this token: ${resetToken} or visit: ${resetUrl}`
      );
    }

    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: resetPasswordToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log password reset
    await AuditLog.create({
      action: 'update_user',
      userId: user._id,
      userRole: user.role,
      resourceType: 'user',
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['password_reset'],
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  // Remove sensitive data
  user.password = undefined;
  user.twoFactorSecret = undefined;

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    data: {
      id: user._id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      campus: user.campus,
      isVerified: user.isVerified,
    },
  });
};
