const User = require('../models/User');
const IDReport = require('../models/IDReport');
const AuditLog = require('../models/AuditLog');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
    try {
        const fieldsToUpdate = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            campus: req.body.campus,
            department: req.body.department,
        };

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach(
            (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
        );

        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true,
            runValidators: true,
        });

        // Log update
        await AuditLog.create({
            action: 'update_user',
            userId: req.user.id,
            userRole: req.user.role,
            resourceType: 'user',
            resourceId: req.user.id,
            ipAddress: req.ip,
            endpoint: req.originalUrl,
            method: req.method,
        });

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        if (!(await user.comparePassword(currentPassword))) {
            return res.status(401).json({
                success: false,
                error: 'Invalid current password',
            });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get reports created by user
// @route   GET /api/users/reports
// @access  Private
exports.getMyReports = async (req, res, next) => {
    try {
        const reports = await IDReport.find({ finderId: req.user.id }).sort(
            '-createdAt'
        );

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.user.id);

        // Log deletion
        await AuditLog.create({
            action: 'delete_user',
            userId: req.user.id,
            userRole: req.user.role,
            resourceType: 'user',
            resourceId: req.user.id,
            ipAddress: req.ip,
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
