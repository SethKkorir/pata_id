const mongoose = require('mongoose');

const idReportSchema = new mongoose.Schema({
  // Report Identification
  reportNumber: {
    type: String,
    unique: true,
    required: true,
  },

  // Found ID Details
  idType: {
    type: String,
    enum: ['student', 'staff'],
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  idNumber: {
    type: String,
    required: true,
  },
  maskedIdNumber: {
    type: String,
    required: true,
  },

  // Finder Information
  finderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  finderType: {
    type: String,
    enum: ['student', 'staff', 'security', 'public'],
    required: true,
  },
  finderContact: {
    type: String,
    required: true,
  },
  finderContactMethod: {
    type: String,
    enum: ['email', 'phone'],
    required: true,
  },

  // Location Details
  campus: {
    type: String,
    enum: ['Athi River', 'Nairobi', 'Mombasa'],
    required: true,
  },
  building: String,
  specificLocation: {
    type: String,
    required: true,
  },
  gpsCoordinates: {
    lat: Number,
    lng: Number,
  },

  // Photo Evidence
  photos: [{
    url: String,
    publicId: String,
    blurHash: String,
    uploadedAt: Date,
  }],

  // Status Tracking
  status: {
    type: String,
    enum: ['pending', 'verified', 'claimed', 'returned', 'archived'],
    default: 'pending',
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending_verification', 'verified', 'failed'],
    default: 'unverified',
  },

  // Owner Information (filled when claimed)
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  claimedAt: Date,
  claimedMethod: {
    type: String,
    enum: ['id_verification', 'security_questions', 'phone_verification', 'document_upload'],
  },

  // Security Guard Handling
  securityGuardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  securityNotes: String,

  // Collection Details
  collectionPoint: {
    type: String,
    enum: ['campus_security', 'student_affairs', 'reception', 'other'],
  },
  collectionNotes: String,
  collectedAt: Date,

  // Privacy & Security
  isSensitive: {
    type: Boolean,
    default: false,
  },
  lastAccessed: Date,
  accessLog: [{
    userId: mongoose.Schema.Types.ObjectId,
    accessedAt: Date,
    action: String,
  }],

  // Timestamps
  foundAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Generate report number before validation
idReportSchema.pre('validate', async function (next) {
  if (!this.reportNumber) {
    const prefix = this.idType === 'student' ? 'STU' : 'STA';
    const count = await this.constructor.countDocuments();
    this.reportNumber = `${prefix}${(count + 1).toString().padStart(6, '0')}`;
  }

  // Mask ID number for display
  if (this.idNumber && !this.maskedIdNumber) {
    const visibleDigits = 4;
    const masked = '*'.repeat(Math.max(0, this.idNumber.length - visibleDigits)) +
      this.idNumber.slice(-visibleDigits);
    this.maskedIdNumber = masked;
  }

  next();
});

// Methods
idReportSchema.methods.addAccessLog = function (userId, action) {
  this.accessLog.push({
    userId,
    accessedAt: new Date(),
    action,
  });
  this.lastAccessed = new Date();
  return this.save();
};

idReportSchema.methods.updateStatus = async function (newStatus, updatedBy) {
  const oldStatus = this.status;
  this.status = newStatus;

  if (newStatus === 'claimed') {
    this.claimedAt = new Date();
  } else if (newStatus === 'returned') {
    this.collectedAt = new Date();
  }

  await this.addAccessLog(updatedBy, `Status changed from ${oldStatus} to ${newStatus}`);
  return this.save();
};

// Indexes for efficient queries
idReportSchema.index({ status: 1, campus: 1 });
idReportSchema.index({ maskedIdNumber: 1 });
idReportSchema.index({ fullName: 'text', reportNumber: 'text' });
idReportSchema.index({ finderId: 1 });
idReportSchema.index({ ownerId: 1 });
idReportSchema.index({ createdAt: -1 });

const IDReport = mongoose.model('IDReport', idReportSchema);

module.exports = IDReport;