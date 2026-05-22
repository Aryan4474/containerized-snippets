const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the root directory (.env is 3 levels up from this folder)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  env: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pastebin-db',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // Default 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100 // Default 100 requests
  }
};
