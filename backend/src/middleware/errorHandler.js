const config = require('../config');

/**
 * Global Error Handling Middleware.
 * Standardizes API error responses and hides sensitive stack traces in production.
 */
const errorHandler = (err, req, res, next) => {
  // Set default values
  let statusCode = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = [];

  // Log error stack for debugging
  console.error(`[Error Handler] Path: ${req.path} | Message: ${message}`);
  if (config.env === 'development') {
    console.error(err.stack);
  }

  // 1. Handle Mongoose Duplicate Key Error (e.g., unique index violation)
  if (err.code === 11000) {
    statusCode = 409; // Conflict
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered. The field '${field}' must be unique.`;
    errors = [{ field, message }];
  }

  // 2. Handle Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400; // Bad Request
    message = 'Database validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // 3. Handle Mongoose CastError (e.g., passing invalid ID formats)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}'`;
    errors = [{ field: err.path, message: `Could not cast value '${err.value}' to type '${err.kind}'` }];
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString(),
      ...(errors.length > 0 && { errors }),
      // Include stack trace only in development
      ...(config.env === 'development' && { stack: err.stack })
    }
  });
};

module.exports = errorHandler;
