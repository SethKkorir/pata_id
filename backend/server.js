require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('🛑 CRITICAL ERROR: JWT_SECRET is not defined in .env file!');
}

const app = require('./app');
const connectDB = require('./src/config/database');
const { createAdminUser } = require('./src/utils/helpers');

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Create default admin user if doesn't exist
if (process.env.CREATE_DEFAULT_ADMIN === 'true') {
  createAdminUser();
}

const server = app.listen(PORT, () => {
  console.log('📍 App Directory:', __dirname);
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});