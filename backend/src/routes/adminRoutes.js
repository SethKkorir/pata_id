const express = require('express');
const {
  getDashboard,
  getUsers,
  updateUser,
  deleteUser,
  getAuditLogs,
  exportData,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin access
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/audit-logs', getAuditLogs);
router.get('/export', exportData);

module.exports = router;