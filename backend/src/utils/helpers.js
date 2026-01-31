const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Create default admin user
exports.createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const adminData = {
        firstName: 'Admin',
        lastName: 'User',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@pataid.com',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',
        role: 'admin',
        campus: 'All Campuses',
        isVerified: true,
      };

      await User.create(adminData);
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Generate random string
exports.generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Format phone number
exports.formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a Kenyan number
  if (digits.length === 9 && digits.startsWith('7')) {
    return `+254${digits}`;
  }
  
  if (digits.length === 10 && digits.startsWith('07')) {
    return `+254${digits.substring(1)}`;
  }
  
  // Return as is if already in international format
  if (digits.length > 10 && digits.startsWith('254')) {
    return `+${digits}`;
  }
  
  return phone;
};

// Calculate recovery rate
exports.calculateRecoveryRate = (total, recovered) => {
  if (total === 0) return 0;
  return Math.round((recovered / total) * 100);
};

// Generate report number
exports.generateReportNumber = (idType, count) => {
  const prefix = idType === 'student' ? 'STU' : 'STA';
  const year = new Date().getFullYear().toString().slice(-2);
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}${year}${sequence}`;
};

// Mask sensitive data
exports.maskData = (data, visibleChars = 4) => {
  if (!data) return '';
  
  const str = String(data);
  if (str.length <= visibleChars) return '*'.repeat(str.length);
  
  const maskedLength = str.length - visibleChars;
  return '*'.repeat(maskedLength) + str.slice(-visibleChars);
};

// Validate email domain
exports.isUniversityEmail = (email) => {
  if (!email) return false;
  
  const universityDomains = [
    'university.ac.ke',
    'student.university.ac.ke',
    'staff.university.ac.ke',
  ];
  
  const domain = email.split('@')[1];
  return universityDomains.includes(domain);
};