const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const pasteRoutes = require('./routes/pasteRoutes');

const app = express();

// Connect to Databases
connectDB();
connectRedis();



// ==========================================
// GLOBAL MIDDLEWARES
// ==========================================

// Apply rate limiting to protect all API endpoints
app.use(globalLimiter);

// Enable Cross-Origin Resource Sharing (CORS) so clients on other domains/ports can connect
app.use(cors());

// Parse incoming JSON payloads in request bodies
app.use(express.json());

// Parse URL-encoded payloads (useful for form submissions)
app.use(express.urlencoded({ extended: true }));

// HTTP request logger middleware for development/production logs
const morganFormat = config.env === 'development' ? 'dev' : 'combined';
app.use(morgan(morganFormat));

// ==========================================
// ROUTES
// ==========================================

// Mount Paste API routes
app.use('/api/pastes', pasteRoutes);

// Basic health check route to verify the server status
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Fallback for route-not-found (404)
app.use((req, res, next) => {
  const err = new Error('Resource Not Found');
  err.status = 404;
  next(err);
});

// ==========================================
// GLOBAL ERROR HANDLING MIDDLEWARE
// ==========================================
app.use(errorHandler);

// ==========================================
// SERVER INITIALIZATION
// ==========================================
const server = app.listen(config.port, () => {
  console.log(`========================================`);
  console.log(` Server is running in [${config.env}] mode`);
  console.log(` Port: ${config.port}`);
  console.log(` Base URL: ${config.baseUrl}`);
  console.log(` Health Check: ${config.baseUrl}/health`);
  console.log(`========================================`);
});

// Graceful shutdown logic (critical for production/Docker environments)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    console.log('Http server closed.');
    process.exit(0);
  });
});

module.exports = app; // Export app for testing purposes
