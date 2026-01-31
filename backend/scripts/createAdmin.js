const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

dotenv.config({ path: '../.env' });

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pataid');
        console.log('Connected to MongoDB');

        const adminEmail = 'admin@pataid.com';
        const adminPassword = 'adminpassword';

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('Admin user already exists');
            // Update password just in case
            const salt = await bcrypt.genSalt(10);
            existingAdmin.password = await bcrypt.hash(adminPassword, salt);
            existingAdmin.role = 'admin'; // Ensure role is admin
            await existingAdmin.save();
            console.log('Admin password updated to: ' + adminPassword);
        } else {
            // Create new admin
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);

            await User.create({
                firstName: 'System',
                lastName: 'Admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                phone: '+254700000000',
                campus: 'All Campuses',
                isVerified: true
            });
            console.log('Admin user created successfully');
            console.log('Email:', adminEmail);
            console.log('Password:', adminPassword);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createAdmin();
