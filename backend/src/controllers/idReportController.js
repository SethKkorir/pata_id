const IDReport = require('../models/IDReport');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const EmailService = require('../services/emailService');
const SMSService = require('../services/smsService');
const FileUploadService = require('../services/fileUploadService');

// @desc    Create new ID report
// @route   POST /api/reports
// @access  Public (for finders), Private (for authenticated users)
exports.createReport = async (req, res, next) => {
  try {
    const {
      idType,
      fullName,
      idNumber,
      finderType,
      finderContact,
      finderContactMethod,
      campus,
      building,
      specificLocation,
      gpsCoordinates,
      photos,
      securityNotes,
    } = req.body;

    // Check if ID already reported
    const existingReport = await IDReport.findOne({
      idNumber,
      status: { $in: ['pending', 'verified'] },
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        error: 'This ID has already been reported as found',
      });
    }

    // Prepare report data
    const reportData = {
      idType,
      fullName,
      idNumber,
      finderType,
      finderContact,
      finderContactMethod,
      campus,
      specificLocation,
      building: building || '',
      securityNotes: securityNotes || '',
    };

    // Add GPS coordinates if provided
    if (gpsCoordinates) {
      reportData.gpsCoordinates = gpsCoordinates;
    }

    // Add finder ID if user is authenticated
    if (req.user) {
      reportData.finderId = req.user._id;
    }

    // Create report
    const report = await IDReport.create(reportData);

    // Handle photo uploads if any
    if (req.files && req.files.length > 0) {
      const photoPromises = req.files.map(async (file) => {
        try {
          const uploadResult = await FileUploadService.uploadIDPhoto(
            file.buffer,
            idNumber
          );
          return {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            blurHash: uploadResult.blurHash,
            uploadedAt: new Date(),
          };
        } catch (error) {
          console.error('Photo upload failed:', error);
          return null;
        }
      });

      const uploadedPhotos = (await Promise.all(photoPromises)).filter(
        (photo) => photo !== null
      );

      if (uploadedPhotos.length > 0) {
        report.photos = uploadedPhotos;
        await report.save();
      }
    }

    // Log report creation
    await AuditLog.create({
      action: 'create_report',
      userId: req.user?._id,
      userRole: req.user?.role,
      userEmail: req.user?.email,
      userPhone: req.user?.phone,
      resourceType: 'report',
      resourceId: report._id,
      beforeState: null,
      afterState: {
        reportNumber: report.reportNumber,
        idType: report.idType,
        campus: report.campus,
        status: report.status,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['report_created'],
    });

    // Send confirmation to finder
    try {
      if (finderContactMethod === 'email') {
        await EmailService.sendReportConfirmation(report, {
          finderType,
          firstName: req.user?.firstName || 'Finder',
          finderContact,
        });
      } else if (finderContactMethod === 'phone') {
        await SMSService.sendSMS(
          finderContact,
          `Thank you for reporting the found ID. Report #${report.reportNumber}. We'll notify the owner.`
        );
      }
    } catch (notificationError) {
      console.error('Notification send failed:', notificationError);
      // Don't fail the request if notification fails
    }

    // Notify security guards (if campus security is enabled)
    if (process.env.NOTIFY_SECURITY === 'true') {
      await notifySecurityGuards(report);
    }

    // Try to find and notify owner
    await attemptOwnerNotification(report);

    res.status(201).json({
      success: true,
      data: {
        reportNumber: report.reportNumber,
        id: report._id,
        status: report.status,
        message: 'ID reported successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search for lost IDs
// @route   GET /api/reports/search
// @access  Public
exports.searchReports = async (req, res, next) => {
  try {
    const {
      idType,
      campus,
      name,
      idNumber,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    const query = {};

    // Only show reports that are pending or verified (not claimed/returned to public)
    query.status = { $in: ['pending', 'verified'] };

    if (idType) query.idType = idType;
    if (campus) query.campus = campus;
    if (status) query.status = status;

    // Text search
    if (name) {
      query.fullName = { $regex: name, $options: 'i' };
    }

    // ID number search (partial match)
    if (idNumber) {
      query.maskedIdNumber = { $regex: idNumber, $options: 'i' };
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await IDReport.countDocuments(query);

    // Execute query
    const reports = await IDReport.find(query)
      .select('-idNumber -finderContact -accessLog -photos.url -photos.publicId')
      .sort('-createdAt')
      .skip(startIndex)
      .limit(parseInt(limit));

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: parseInt(page) + 1,
        limit: parseInt(limit),
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: parseInt(page) - 1,
        limit: parseInt(limit),
      };
    }

    // Log search
    await AuditLog.create({
      action: 'view_report',
      userId: req.user?._id,
      userRole: req.user?.role,
      resourceType: 'report',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['search'],
    });

    res.status(200).json({
      success: true,
      count: reports.length,
      pagination,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private (with ownership/role check)
exports.getReport = async (req, res, next) => {
  const reportId = req.params.id;
  const user = req.user;

  console.log(`📖 [GET /api/reports/${reportId}] Access attempt by: ${user ? `${user.firstName} (${user.role})` : 'GUEST'}`);

  try {
    const report = await IDReport.findById(reportId);

    if (!report) {
      console.warn(`❌ Report not found: ${reportId}`);
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    // Check permissions
    const canView = await checkReportPermissions(report, user);
    if (!canView) {
      console.warn(`🔒 Access denied for report ${reportId} to user: ${user?.role || 'GUEST'}`);
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this report',
      });
    }

    // Add access log if user is authenticated
    if (user && user._id) {
      try {
        await report.addAccessLog(user._id, 'view_report');
      } catch (logErr) {
        console.error('⚠️ Could not log access:', logErr.message);
      }
    }

    // Filter sensitive data based on user role
    const filteredReport = filterReportData(report, user);

    console.log(`✅ Report ${reportId} sent successfully`);
    res.status(200).json({
      success: true,
      data: filteredReport,
    });
  } catch (error) {
    console.error('🔥 Critical error in getReport:', error);
    next(error);
  }
};

// @desc    Update report status
// @route   PUT /api/reports/:id
// @access  Private (admin/security guards)
exports.updateReport = async (req, res, next) => {
  try {
    let report = await IDReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    // Check permissions - only admin and security guards can update
    if (!['admin', 'security'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update reports',
      });
    }

    // Log before state
    const beforeState = {
      status: report.status,
      verificationStatus: report.verificationStatus,
      securityGuardId: report.securityGuardId,
    };

    // Update allowed fields
    const updatableFields = [
      'status',
      'verificationStatus',
      'securityGuardId',
      'securityNotes',
      'collectionPoint',
      'collectionNotes',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        report[field] = req.body[field];
      }
    });

    // If security guard is assigning themselves
    if (req.user.role === 'security' && !report.securityGuardId) {
      report.securityGuardId = req.user._id;
    }

    await report.save();

    // Log update
    await AuditLog.create({
      action: 'update_report',
      userId: req.user._id,
      userRole: req.user.role,
      resourceType: 'report',
      resourceId: report._id,
      beforeState,
      afterState: {
        status: report.status,
        verificationStatus: report.verificationStatus,
        securityGuardId: report.securityGuardId,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['report_updated'],
    });

    // Notify owner if status changed to verified
    if (
      beforeState.status !== 'verified' &&
      report.status === 'verified' &&
      report.ownerId
    ) {
      await notifyOwnerOfVerification(report);
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private (admin only)
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await IDReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    // Only admin can delete
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete reports',
      });
    }

    // Delete uploaded photos
    if (report.photos && report.photos.length > 0) {
      const deletePromises = report.photos.map((photo) =>
        FileUploadService.deleteFile(photo.publicId).catch(console.error)
      );
      await Promise.all(deletePromises);
    }

    // Log before deletion
    await AuditLog.create({
      action: 'delete_report',
      userId: req.user._id,
      userRole: req.user.role,
      resourceType: 'report',
      resourceId: report._id,
      beforeState: {
        reportNumber: report.reportNumber,
        idType: report.idType,
        campus: report.campus,
        status: report.status,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['report_deleted'],
      isSensitive: true,
    });

    await report.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reports by user (as finder or owner)
// @route   GET /api/reports/my-reports
// @access  Private
exports.getMyReports = async (req, res, next) => {
  try {
    const { type = 'found' } = req.query; // 'found' or 'lost'

    let query;
    if (type === 'found') {
      query = { finderId: req.user._id };
    } else {
      query = { ownerId: req.user._id };
    }

    const reports = await IDReport.find(query)
      .select('-accessLog')
      .sort('-createdAt')
      .limit(50);

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get statistics
// @route   GET /api/reports/stats
// @access  Private (admin/security)
exports.getStats = async (req, res, next) => {
  try {
    const { campus, startDate, endDate } = req.query;

    const matchStage = {};

    if (campus) {
      matchStage.campus = campus;
    }

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await IDReport.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
          },
          claimed: {
            $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] },
          },
          returned: {
            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] },
          },
          byCampus: {
            $push: {
              campus: '$campus',
              status: '$status',
            },
          },
        },
      },
      {
        $project: {
          total: 1,
          pending: 1,
          verified: 1,
          claimed: 1,
          returned: 1,
          recoveryRate: {
            $multiply: [
              {
                $divide: [
                  { $add: ['$claimed', '$returned'] },
                  '$total',
                ],
              },
              100,
            ],
          },
          byCampus: 1,
        },
      },
    ]);

    // Calculate average recovery time
    const recoveryTimes = await IDReport.aggregate([
      {
        $match: {
          status: 'returned',
          claimedAt: { $exists: true },
          collectedAt: { $exists: true },
        },
      },
      {
        $project: {
          recoveryTime: {
            $divide: [
              { $subtract: ['$collectedAt', '$claimedAt'] },
              1000 * 60 * 60 * 24, // Convert to days
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgRecoveryTime: { $avg: '$recoveryTime' },
        },
      },
    ]);

    const result = {
      ...(stats[0] || {
        total: 0,
        pending: 0,
        verified: 0,
        claimed: 0,
        returned: 0,
        recoveryRate: 0,
        byCampus: [],
      }),
      avgRecoveryTime: recoveryTimes[0]?.avgRecoveryTime || 0,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const notifySecurityGuards = async (report) => {
  try {
    // Find security guards for the campus
    const securityGuards = await User.find({
      role: 'security',
      campus: { $in: [report.campus, 'All Campuses'] },
      'notificationPreferences.sms': true,
    });

    const notificationPromises = securityGuards.map((guard) =>
      SMSService.sendSecurityGuardReportNotification(
        guard.phone,
        report.reportNumber,
        report.specificLocation
      ).catch(console.error)
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Security notification failed:', error);
  }
};

const attemptOwnerNotification = async (report) => {
  try {
    // Try to find owner by ID number
    let owner;
    if (report.idType === 'student') {
      owner = await User.findOne({
        role: 'student',
        studentId: report.idNumber,
      });
    } else if (report.idType === 'staff') {
      owner = await User.findOne({
        role: 'staff',
        staffId: report.idNumber,
      });
    }

    if (owner) {
      report.ownerId = owner._id;
      await report.save();

      // Send notification based on preferences
      if (
        owner.notificationPreferences.email &&
        owner.email
      ) {
        await EmailService.sendIDFoundNotification(report, {
          finderType: report.finderType,
        }, owner);
      }

      if (
        owner.notificationPreferences.sms &&
        owner.phone
      ) {
        await SMSService.sendIDFoundSMS(
          owner.phone,
          report.reportNumber,
          report.campus
        );
      }
    }
  } catch (error) {
    console.error('Owner notification failed:', error);
  }
};

const notifyOwnerOfVerification = async (report) => {
  try {
    const owner = await User.findById(report.ownerId);
    if (!owner) return;

    if (owner.email) {
      await EmailService.sendEmail({
        to: owner.email,
        subject: 'Your ID Verification is Complete',
        template: 'verification-complete',
        context: {
          name: owner.firstName,
          reportNumber: report.reportNumber,
          campus: report.campus,
          collectionPoint: report.collectionPoint || 'Campus Security',
          year: new Date().getFullYear(),
        },
      });
    }
  } catch (error) {
    console.error('Verification notification failed:', error);
  }
};

const checkReportPermissions = async (report, user) => {
  // Allow public access to view basic details of pending/verified reports
  // This is needed for the Claim page to work before login
  if (!user) {
    return ['pending', 'verified'].includes(report.status);
  }

  // Admin can view everything
  if (user.role === 'admin') return true;

  // Security guards can view reports from their campus
  if (user.role === 'security') {
    return user.campus === 'All Campuses' || user.campus === report.campus;
  }

  // Finder can view their own reports
  if (report.finderId && report.finderId.toString() === user._id.toString()) {
    return true;
  }

  // Owner can view their own reports
  if (report.ownerId && report.ownerId.toString() === user._id.toString()) {
    return true;
  }

  // Any authenticated student/staff can view pending/verified reports to verify them
  if (['pending', 'verified'].includes(report.status)) {
    return true;
  }

  return false;
};

const filterReportData = (report, user) => {
  const reportObj = report.toObject();

  // Public/Lest privileged view (Guest, Student, or Staff)
  if (!user || user.role === 'student' || user.role === 'staff') {
    // Check if the user is the finder or owner of this report
    const isFinder = user && report.finderId && report.finderId.toString() === user._id.toString();
    const isOwner = user && report.ownerId && report.ownerId.toString() === user._id.toString();

    // If they aren't the finder or owner, hide sensitive info
    if (!isFinder && !isOwner) {
      delete reportObj.idNumber; // Hide full ID
      delete reportObj.finderContact;
      delete reportObj.finderContactMethod;
      delete reportObj.securityNotes;
      delete reportObj.accessLog;

      // Only show blurred photos/metadata
      if (reportObj.photos) {
        reportObj.photos = reportObj.photos.map(photo => ({
          blurHash: photo.blurHash,
          uploadedAt: photo.uploadedAt,
        }));
      }
    }
  }

  return reportObj;
};
