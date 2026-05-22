const rateLimit = require('express-rate-limit');
const config = require('../config');

// General API rate limiter (applied globally to all endpoints)
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // default 15 minutes (900000ms)
  max: config.rateLimit.max, // default 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// Strict rate limiter for paste creation (POST /api/pastes) to prevent spamming
const createPasteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 paste creation requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many pastes created from this IP. Please wait 15 minutes before creating more.'
  }
});

module.exports = {
  globalLimiter,
  createPasteLimiter
};
