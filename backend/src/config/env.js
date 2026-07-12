require('dotenv').config();

const env = {
  PORT: Number(process.env.PORT || 5000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/klogubizz',
  JWT_SECRET: process.env.JWT_SECRET || 'local_dev_access_secret_change_me_now',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'local_dev_refresh_secret_change_me_now',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200',
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || 'superadmin@klogubizz.local',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  FROM_EMAIL: process.env.FROM_EMAIL || 'invoices@klogubizz.local',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'local_webhook_secret'
};

module.exports = { env };
