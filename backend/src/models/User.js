const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Identification
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Allow null for security guards
  },
  phone: {
    type: String,
    trim: true,
    sparse: true, // Allow null for students/staff
  },
  
  // User Info
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Role-based fields
  role: {
    type: String,
    enum: ['student', 'staff', 'security', 'admin'],
    required: true,
  },
  
  // Student/Staff specific
  studentId: {
    type: String,
    sparse: true,
  },
  staffId: {
    type: String,
    sparse: true,
  },
  campus: {
    type: String,
    enum: ['Athi River', 'Nairobi', 'Mombasa', 'All Campuses'],
    default: 'Athi River',
  },
  department: {
    type: String,
    trim: true,
  },
  
  // Security Guard specific
  guardId: {
    type: String,
    sparse: true,
  },
  securityCompany: {
    type: String,
    trim: true,
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening', 'Night', 'Flexible'],
  },
  
  // Authentication
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
  },
  
  // Security
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: String,
  
  // Timestamps
  lastLogin: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtuals
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('reportsFound', {
  ref: 'IDReport',
  localField: '_id',
  foreignField: 'finderId',
});

userSchema.virtual('reportsOwned', {
  ref: 'IDReport',
  localField: '_id',
  foreignField: 'ownerId',
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 }; // 15 minutes
  }
  
  return await this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;