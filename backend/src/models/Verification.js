const mongoose = require('mongoose');
const crypto = require('crypto');

const verificationSchema = new mongoose.Schema({
  // Reference to report
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IDReport',
    required: true,
  },

  // Claimant information
  claimantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  claimantEmail: String,
  claimantPhone: String,

  // Verification method
  method: {
    type: String,
    enum: ['id_number', 'security_questions', 'phone_otp', 'document_upload'],
    required: true,
  },

  // Verification data
  idNumberProvided: String,
  securityQuestions: [{
    question: String,
    answerProvided: String,
    isCorrect: Boolean,
  }],
  phoneOtp: String,
  phoneOtpExpires: Date,
  documents: [{
    url: String,
    publicId: String,
    documentType: String,
    verified: Boolean,
  }],

  // Verification status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'verified', 'rejected', 'expired'],
    default: 'pending',
  },

  // Security guard verification
  verifiedByGuardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  guardNotes: String,

  // Admin override
  adminOverride: {
    overriddenBy: mongoose.Schema.Types.ObjectId,
    reason: String,
    timestamp: Date,
  },

  // Security
  verificationToken: {
    type: String,
    unique: true,
  },
  tokenExpires: Date,
  attemptCount: {
    type: Number,
    default: 0,
  },
  lastAttempt: Date,

  // Timestamps
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
}, {
  timestamps: true,
});

// Generate verification token
verificationSchema.pre('save', function (next) {
  if (!this.verificationToken) {
    this.verificationToken = crypto.randomBytes(32).toString('hex');
    this.tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

// Methods
verificationSchema.methods.incrementAttempt = function () {
  this.attemptCount += 1;
  this.lastAttempt = new Date();

  if (this.attemptCount >= 5) {
    this.status = 'expired';
  }

  return this.save();
};

verificationSchema.methods.verifyPhoneOtp = function (otp) {
  if (this.method !== 'phone_otp') return false;
  if (!this.phoneOtp) return false;
  if (this.phoneOtpExpires < new Date()) return false;

  const isValid = this.phoneOtp === otp;
  if (isValid) {
    this.status = 'verified';
    this.phoneOtp = undefined;
    this.phoneOtpExpires = undefined;
  }

  return isValid;
};

verificationSchema.methods.checkSecurityQuestions = function (answers) {
  if (this.method !== 'security_questions') return false;

  // For demo: verify if at least 2 answers were provided (not empty)
  // In production, this would compare against real user security data
  const providedCount = Array.isArray(answers)
    ? answers.filter(a => a && a.trim().length > 0).length
    : 0;

  const isVerified = providedCount >= 2;

  if (isVerified) {
    this.status = 'verified';
  }

  return isVerified;
};

// Indexes
verificationSchema.index({ reportId: 1 });
verificationSchema.index({ verificationToken: 1 });
verificationSchema.index({ status: 1, expiresAt: 1 });
verificationSchema.index({ createdAt: -1 });

const Verification = mongoose.model('Verification', verificationSchema);

module.exports = Verification;