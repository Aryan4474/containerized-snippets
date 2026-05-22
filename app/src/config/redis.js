const { createClient } = require('redis');
const config = require('./index');

// Create Redis Client instance
const redisClient = createClient({
  url: config.redisUrl
});

// Event listeners for Redis client status
redisClient.on('connect', () => {
  console.log('Redis client connecting...');
});

redisClient.on('ready', () => {
  console.log('Redis client connected and ready!');
});

redisClient.on('error', (err) => {
  console.error(`Redis Client Error: ${err.message}`);
});

redisClient.on('end', () => {
  console.warn('Redis client connection closed.');
});

/**
 * Connects to Redis.
 * Falls back gracefully on failure so the server can still operate using MongoDB directly.
 */
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error(`Failed to initialize Redis connection: ${error.message}`);
    console.warn('Application will proceed in fallback mode (MongoDB direct access only).');
  }
};

module.exports = {
  redisClient,
  connectRedis
};
