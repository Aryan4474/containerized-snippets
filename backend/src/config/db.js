const mongoose = require('mongoose');
const config = require('./index');

/**
 * Establishes connection to the MongoDB database.
 * Throws error if connection fails, allowing the caller to handle shutdown.
 */
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(config.mongoUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Setup event listeners for ongoing connection events
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    console.error(`Failed to connect to MongoDB: ${error.message}`);
    // In production, crashing the application is correct because the service cannot function without database access.
    // Docker Compose or Kubernetes will automatically restart the container.
    process.exit(1);
  }
};

module.exports = connectDB;
