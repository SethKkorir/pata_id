const User = require('../models/User');
const IDReport = require('../models/IDReport');
const Verification = require('../models/Verification');
const AuditLog = require('../models/AuditLog');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (admin only)
exports.getDashboard = async (req, res, next) => {
  try {
    // Recent reports (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReports = await IDReport.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 7 },
    ]);

    // User statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    // Campus statistics
    const campusStats = await IDReport.aggregate([
      {
        $group: {
          _id: '$campus',
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          claimed: {
            $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] },
          },
          returned: {
            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] },
          },
        },
      },
    ]);

    // Recent activity from audit logs
    const recentActivity = await AuditLog.find()
      .sort('-createdAt')
      .limit(10)
      .populate('userId', 'firstName lastName email role')
      .select('action createdAt userRole resourceType resourceId');

    // Verification statistics
    const verificationStats = await Verification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Pending security approvals
    const pendingApprovals = await Verification.countDocuments({
      status: 'in_progress',
      method: 'document_upload',
    });

    res.status(200).json({
      success: true,
      data: {
        recentReports,
        userStats,
        campusStats,
        recentActivity,
        verificationStats,
        pendingApprovals,
        summary: {
          totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0),
          totalReports: campusStats.reduce((sum, stat) => sum + stat.total, 0),
          activeVerifications: verificationStats.reduce(
            (sum, stat) => stat._id !== 'expired' && stat._id !== 'rejected' ? sum + stat.count : sum,
            0
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with filtering
// @route   GET /api/admin/users
// @access  Private (admin only)
exports.getUsers = async (req, res, next) => {
  try {
    const {
      role,
      campus,
      isVerified,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (role) query.role = role;
    if (campus) query.campus = campus;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';

    // Search
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { staffId: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const total = await User.countDocuments(query);

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const users = await User.find(query)
      .select('-password -twoFactorSecret -verificationToken -passwordResetToken')
      .sort(sort)
      .skip(startIndex)
      .limit(parseInt(limit));

    // Get user statistics
    const userStats = users.map(async (user) => {
      const [reportsFound, reportsOwned] = await Promise.all([
        IDReport.countDocuments({ finderId: user._id }),
        IDReport.countDocuments({ ownerId: user._id }),
      ]);

      return {
        ...user.toObject(),
        reportsFound,
        reportsOwned,
      };
    });

    const usersWithStats = await Promise.all(userStats);

    // Pagination result
    const pagination = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    };

    if (startIndex + users.length < total) {
      pagination.next = {
        page: parseInt(page) + 1,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: parseInt(page) - 1,
      };
    }

    res.status(200).json({
      success: true,
      count: users.length,
      pagination,
      data: usersWithStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (admin only)
// @route   PUT /api/admin/users/:id
// @access  Private (admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Log before state
    const beforeState = {
      role: user.role,
      campus: user.campus,
      isVerified: user.isVerified,
    };

    // Update allowed fields
    const updatableFields = [
      'role',
      'campus',
      'department',
      'isVerified',
      'notificationPreferences',
      'securityCompany',
      'shift',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    // Log update
    await AuditLog.create({
      action: 'update_user',
      userId: req.user._id,
      userRole: req.user.role,
      resourceType: 'user',
      resourceId: user._id,
      beforeState,
      afterState: {
        role: user.role,
        campus: user.campus,
        isVerified: user.isVerified,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['admin_update'],
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private (admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if user has any active reports
    const activeReports = await IDReport.countDocuments({
      $or: [
        { finderId: user._id, status: { $in: ['pending', 'verified'] } },
        { ownerId: user._id, status: { $in: ['pending', 'verified', 'claimed'] } },
      ],
    });

    if (activeReports > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete user with ${activeReports} active reports. Please transfer or close reports first.`,
      });
    }

    // Log before deletion
    await AuditLog.create({
      action: 'delete_user',
      userId: req.user._id,
      userRole: req.user.role,
      resourceType: 'user',
      resourceId: user._id,
      beforeState: {
        email: user.email,
        phone: user.phone,
        role: user.role,
        campus: user.campus,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['user_deleted'],
      isSensitive: true,
    });

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (admin only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      action,
      resourceType,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    // Build query
    const query = {};

    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (userId) query.userId = userId;

    // Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const total = await AuditLog.countDocuments(query);

    // Execute query
    const logs = await AuditLog.find(query)
      .populate('userId', 'firstName lastName email role')
      .sort('-createdAt')
      .skip(startIndex)
      .limit(parseInt(limit))
      .lean();

    // Remove sensitive data from logs
    const filteredLogs = logs.map(log => {
      const logCopy = { ...log };
      
      // Remove sensitive fields
      if (logCopy.beforeState) {
        delete logCopy.beforeState.password;
        delete logCopy.beforeState.twoFactorSecret;
      }
      
      if (logCopy.afterState) {
        delete logCopy.afterState.password;
        delete logCopy.afterState.twoFactorSecret;
      }
      
      return logCopy;
    });

    // Pagination result
    const pagination = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    };

    if (startIndex + logs.length < total) {
      pagination.next = {
        page: parseInt(page) + 1,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: parseInt(page) - 1,
      };
    }

    res.status(200).json({
      success: true,
      count: logs.length,
      pagination,
      data: filteredLogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export data
// @route   GET /api/admin/export
// @access  Private (admin only)
exports.exportData = async (req, res, next) => {
  try {
    const { type, format = 'json', startDate, endDate } = req.query;

    if (!['reports', 'users', 'verifications', 'audit'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export type',
      });
    }

    // Build query for date range
    const query = {};
    if (startDate || endDate) {
      const dateField = type === 'users' ? 'createdAt' : 'createdAt';
      query[dateField] = {};
      if (startDate) query[dateField].$gte = new Date(startDate);
      if (endDate) query[dateField].$lte = new Date(endDate);
    }

    let data;
    switch (type) {
      case 'reports':
        data = await IDReport.find(query)
          .populate('finderId', 'firstName lastName email phone')
          .populate('ownerId', 'firstName lastName email phone')
          .populate('securityGuardId', 'firstName lastName phone')
          .select('-accessLog -photos.publicId')
          .lean();
        break;

      case 'users':
        data = await User.find(query)
          .select('-password -twoFactorSecret -verificationToken -passwordResetToken')
          .lean();
        break;

      case 'verifications':
        data = await Verification.find(query)
          .populate('reportId', 'reportNumber campus')
          .populate('claimantId', 'firstName lastName email phone')
          .populate('verifiedByGuardId', 'firstName lastName phone')
          .lean();
        break;

      case 'audit':
        data = await AuditLog.find(query)
          .populate('userId', 'firstName lastName email role')
          .lean();
        
        // Remove sensitive data
        data = data.map(log => {
          const logCopy = { ...log };
          delete logCopy.beforeState;
          delete logCopy.afterState;
          return logCopy;
        });
        break;
    }

    // Log export
    await AuditLog.create({
      action: 'export_data',
      userId: req.user._id,
      userRole: req.user.role,
      resourceType: type,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['data_export', format],
    });

    if (format === 'csv') {
      // Convert to CSV (simplified)
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-export-${Date.now()}.csv`);
      return res.send(csv);
    }

    // Default to JSON
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to convert to CSV
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(item => 
    Object.values(item)
      .map(val => 
        typeof val === 'object' ? JSON.stringify(val).replace(/"/g, '""') : 
        val === null || val === undefined ? '' : 
        String(val).replace(/"/g, '""')
      )
      .map(val => `"${val}"`)
      .join(',')
  );

  return [headers, ...rows].join('\n');
};