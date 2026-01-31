const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
    required: true,
  },
  route: String,
  method: String,
  statusCode: Number,
  ip: String,
  meta: {
    type: mongoose.Schema.Types.Mixed,
  },
  error: String,
}, {
  timestamps: true,
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
