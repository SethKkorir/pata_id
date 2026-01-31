const crypto = require('crypto');
const Verification = require('../models/Verification');
const IDReport = require('../models/IDReport');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const EmailService = require('../services/emailService');
const SMSService = require('../services/smsService');
const FileUploadService = require('../services/fileUploadService');

// @desc    Start claim verification process
// @route   POST /api/verifications/start
// @access  Private (for ID owners)
exports.startVerification = async (req, res, next) => {
  try {
    const { reportId, method } = req.body;
    const userId = req.user._id;

    // Map frontend method names to backend if needed
    const mappedMethod = method === 'phone_verification' ? 'phone_otp' : method;

    // Get the report
    const report = await IDReport.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    // Check if report can be claimed
    // Allowing pending reports too for flexibility, or you can stick to 'verified'
    if (!['pending', 'verified'].includes(report.status)) {
      return res.status(400).json({
        success: false,
        error: 'This report is not ready for claim',
      });
    }

    // Check if user already has a pending verification
    const existingVerification = await Verification.findOne({
      reportId,
      claimantId: userId,
      status: { $in: ['pending', 'in_progress'] },
    });

    if (existingVerification) {
      return res.status(200).json({
        success: true,
        data: {
          verificationId: existingVerification._id,
          method: existingVerification.method,
          status: existingVerification.status,
          expiresAt: existingVerification.expiresAt,
        },
      });
    }

    // Create verification record
    const verificationData = {
      reportId,
      claimantId: userId,
      method: mappedMethod,
      status: 'pending',
    };

    // Add method-specific data
    if (mappedMethod === 'phone_otp') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      verificationData.phoneOtp = otp;
      verificationData.phoneOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Send OTP via SMS
      try {
        await SMSService.sendClaimVerificationSMS(req.user.phone, otp);
      } catch (err) {
        console.error('SMS send failed', err);
        // Continue for now if SMS fails in dev
      }
    } else if (mappedMethod === 'security_questions') {
      // Generate security questions
      verificationData.securityQuestions = [
        {
          question: "What is your mother's maiden name?",
          answerProvided: '',
          isCorrect: false,
        },
        {
          question: "What was your first pet's name?",
          answerProvided: '',
          isCorrect: false,
        },
        {
          question: "What elementary school did you attend?",
          answerProvided: '',
          isCorrect: false,
        },
      ];
    } else if (mappedMethod === 'id_number') {
      // No extra data needed for start, but we will check it in a separate step or here
      verificationData.status = 'in_progress';
    }

    const verification = await Verification.create(verificationData);

    // Send email notification for other methods
    if (mappedMethod !== 'phone_otp' && req.user.email) {
      try {
        await EmailService.sendClaimVerificationEmail(verification, req.user);
      } catch (err) {
        console.error('Email send failed', err);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        verificationId: verification._id,
        method: verification.method,
        status: verification.status,
        expiresAt: verification.expiresAt,
        ...(mappedMethod === 'phone_otp' && { message: 'OTP sent to your phone' }),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify ID number directly
// @route   POST /api/verifications/verify-id
// @access  Private
exports.verifyIDNumber = async (req, res, next) => {
  try {
    const { verificationId, idNumber } = req.body;

    const verification = await Verification.findById(verificationId);
    if (!verification) return res.status(404).json({ success: false, error: 'Verification not found' });

    const report = await IDReport.findById(verification.reportId);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

    const normalizedInput = idNumber.trim().toUpperCase();
    const normalizedTarget = report.idNumber.trim().toUpperCase();

    if (normalizedTarget !== normalizedInput) {
      return res.status(400).json({ success: false, error: 'Incorrect ID number' });
    }

    // Success
    verification.status = 'verified';
    await verification.save();

    report.status = 'claimed';
    report.ownerId = verification.claimantId;
    report.claimedMethod = 'id_verification';
    await report.save();

    res.status(200).json({
      success: true,
      data: { message: 'Verification successful', reportId: report._id }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP for phone verification
// @route   POST /api/verifications/verify-otp
// @access  Private
exports.verifyOTP = async (req, res, next) => {
  try {
    const { verificationId, otp } = req.body;

    const verification = await Verification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification not found',
      });
    }

    // Check if verification is still valid
    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Verification is no longer valid',
      });
    }

    // Check attempt count
    if (verification.attemptCount >= 5) {
      verification.status = 'expired';
      await verification.save();

      return res.status(400).json({
        success: false,
        error: 'Too many attempts. Verification expired',
      });
    }

    // Verify OTP
    const isValid = verification.verifyPhoneOtp(otp);
    await verification.incrementAttempt();

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP',
        attemptsRemaining: 5 - verification.attemptCount,
      });
    }

    // Update report status
    const report = await IDReport.findById(verification.reportId);
    report.status = 'claimed';
    report.ownerId = verification.claimantId;
    report.claimedMethod = 'phone_verification';
    await report.save();

    // Notify security guard
    await notifySecurityGuardOfClaim(report);

    // Log successful verification
    await AuditLog.create({
      action: 'claim_report',
      userId: verification.claimantId,
      userRole: req.user.role,
      resourceType: 'verification',
      resourceId: verification._id,
      beforeState: { status: 'pending' },
      afterState: { status: 'verified' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['verification_success', 'phone_otp'],
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Verification successful',
        reportId: report._id,
        reportNumber: report.reportNumber,
        nextStep: 'contact_finder',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify security questions
// @route   POST /api/verifications/verify-questions
// @access  Private
exports.verifySecurityQuestions = async (req, res, next) => {
  try {
    const { verificationId, answers } = req.body;

    const verification = await Verification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification not found',
      });
    }

    // Check if verification is still valid
    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Verification is no longer valid',
      });
    }

    // Check attempt count
    if (verification.attemptCount >= 5) {
      verification.status = 'expired';
      await verification.save();

      return res.status(400).json({
        success: false,
        error: 'Too many attempts. Verification expired',
      });
    }

    // Verify answers (in production, compare with stored answers)
    // For demo, we'll accept any non-empty answers
    const isValid = verification.checkSecurityQuestions(answers);
    await verification.incrementAttempt();

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Incorrect answers',
        attemptsRemaining: 5 - verification.attemptCount,
      });
    }

    // Update report status
    const report = await IDReport.findById(verification.reportId);
    report.status = 'claimed';
    report.ownerId = verification.claimantId;
    report.claimedMethod = 'security_questions';
    await report.save();

    // Notify security guard
    await notifySecurityGuardOfClaim(report);

    // Log successful verification
    await AuditLog.create({
      action: 'claim_report',
      userId: verification.claimantId,
      userRole: req.user.role,
      resourceType: 'verification',
      resourceId: verification._id,
      beforeState: { status: 'pending' },
      afterState: { status: 'verified' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['verification_success', 'security_questions'],
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Verification successful',
        reportId: report._id,
        reportNumber: report.reportNumber,
        nextStep: 'contact_finder',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload verification documents
// @route   POST /api/verifications/upload-documents
// @access  Private
exports.uploadDocuments = async (req, res, next) => {
  try {
    const { verificationId, documentType } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    const verification = await Verification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification not found',
      });
    }

    // Validate files
    req.files.forEach((file) => {
      FileUploadService.validateFile(file);
    });

    // Upload documents
    const uploadPromises = req.files.map(async (file) => {
      const uploadResult = await FileUploadService.uploadVerificationDocument(
        file.buffer,
        documentType,
        verification.claimantId
      );

      return {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        documentType,
        verified: false,
      };
    });

    const uploadedDocuments = await Promise.all(uploadPromises);

    // Add documents to verification
    verification.documents = verification.documents || [];
    verification.documents.push(...uploadedDocuments);
    verification.status = 'in_progress';
    await verification.save();

    // Notify security guard for manual verification
    await notifySecurityGuardOfDocumentUpload(verification);

    // Log document upload
    await AuditLog.create({
      action: 'verify_report',
      userId: verification.claimantId,
      userRole: req.user.role,
      resourceType: 'verification',
      resourceId: verification._id,
      beforeState: { status: 'pending' },
      afterState: {
        status: 'in_progress',
        documentCount: uploadedDocuments.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['document_uploaded'],
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Documents uploaded successfully',
        verificationId: verification._id,
        status: verification.status,
        nextStep: 'wait_for_security_verification',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Security guard verifies documents
// @route   POST /api/verifications/security-verify
// @access  Private (security guards only)
exports.securityVerify = async (req, res, next) => {
  try {
    const { verificationId, isApproved, notes } = req.body;

    if (req.user.role !== 'security') {
      return res.status(403).json({
        success: false,
        error: 'Only security guards can perform this action',
      });
    }

    const verification = await Verification.findById(verificationId);
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification not found',
      });
    }

    if (verification.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Verification is not in progress',
      });
    }

    // Update verification
    verification.status = isApproved ? 'verified' : 'rejected';
    verification.verifiedByGuardId = req.user._id;
    verification.guardNotes = notes;

    // Mark documents as verified
    if (verification.documents) {
      verification.documents.forEach(doc => {
        doc.verified = isApproved;
      });
    }

    await verification.save();

    // If approved, update report
    if (isApproved) {
      const report = await IDReport.findById(verification.reportId);
      report.status = 'claimed';
      report.ownerId = verification.claimantId;
      report.claimedMethod = 'document_upload';
      report.securityGuardId = req.user._id;
      await report.save();

      // Notify owner
      await notifyOwnerOfVerification(report);
    }

    // Log security verification
    await AuditLog.create({
      action: 'verify_report',
      userId: req.user._id,
      userRole: req.user.role,
      resourceType: 'verification',
      resourceId: verification._id,
      beforeState: { status: 'in_progress' },
      afterState: {
        status: verification.status,
        verifiedByGuardId: req.user._id,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      tags: ['security_verification', isApproved ? 'approved' : 'rejected'],
    });

    res.status(200).json({
      success: true,
      data: {
        message: isApproved
          ? 'Verification approved'
          : 'Verification rejected',
        verificationId: verification._id,
        reportId: verification.reportId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get verification status
// @route   GET /api/verifications/:id
// @access  Private
exports.getVerification = async (req, res, next) => {
  try {
    const verification = await Verification.findById(req.params.id)
      .populate('reportId', 'reportNumber campus status')
      .populate('verifiedByGuardId', 'firstName lastName phone');

    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Verification not found',
      });
    }

    // Check permissions
    const canView = await checkVerificationPermissions(verification, req.user);
    if (!canView) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this verification',
      });
    }

    // Filter sensitive data
    const filteredVerification = filterVerificationData(verification, req.user);

    res.status(200).json({
      success: true,
      data: filteredVerification,
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const notifySecurityGuardOfClaim = async (report) => {
  try {
    if (report.securityGuardId) {
      const guard = await User.findById(report.securityGuardId);
      if (guard && guard.phone) {
        await SMSService.sendSMS(
          guard.phone,
          `Report #${report.reportNumber} has been claimed. Please prepare for collection.`
        );
      }
    }
  } catch (error) {
    console.error('Security guard notification failed:', error);
  }
};

const notifySecurityGuardOfDocumentUpload = async (verification) => {
  try {
    const report = await IDReport.findById(verification.reportId);
    if (report.securityGuardId) {
      const guard = await User.findById(report.securityGuardId);
      if (guard && guard.phone) {
        await SMSService.sendSMS(
          guard.phone,
          `New document upload for verification ${verification._id}. Please review.`
        );
      }
    }
  } catch (error) {
    console.error('Security guard notification failed:', error);
  }
};

const notifyOwnerOfVerification = async (report) => {
  try {
    const owner = await User.findById(report.ownerId);
    if (owner && owner.email) {
      await EmailService.sendEmail({
        to: owner.email,
        subject: 'Your ID Claim Has Been Verified',
        template: 'claim-verified',
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
    console.error('Owner notification failed:', error);
  }
};

const checkVerificationPermissions = async (verification, user) => {
  if (!user) return false;

  // Admin can view everything
  if (user.role === 'admin') return true;

  // Security guards can view verifications for their campus
  if (user.role === 'security') {
    const report = await IDReport.findById(verification.reportId);
    return user.campus === 'All Campuses' || user.campus === report.campus;
  }

  // Claimant can view their own verification
  if (verification.claimantId.toString() === user._id.toString()) {
    return true;
  }

  // Security guard who verified it can view
  if (
    verification.verifiedByGuardId &&
    verification.verifiedByGuardId.toString() === user._id.toString()
  ) {
    return true;
  }

  return false;
};

const filterVerificationData = (verification, user) => {
  const verificationObj = verification.toObject();

  // Remove sensitive data based on role
  if (user.role !== 'admin' && user.role !== 'security') {
    delete verificationObj.securityQuestions;
    delete verificationObj.phoneOtp;
    delete verificationObj.phoneOtpExpires;

    if (verificationObj.documents) {
      verificationObj.documents = verificationObj.documents.map(doc => ({
        documentType: doc.documentType,
        uploadedAt: doc.uploadedAt,
        verified: doc.verified,
      }));
    }
  }

  return verificationObj;
};