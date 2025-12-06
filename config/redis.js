/**
 * HMS-CENTRAL-COPY/config/redis.js
 * * REDIS CLIENT INITIALIZATION
 * * Provides the client instance for High-Frequency Caching (Instant Check)
 */

require('dotenv').config();
const Redis = require('ioredis');
const logger = require('./logger'); // Use the project logger

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null, // Allow no password
    maxRetriesPerRequest: null, // Critical for high-frequency operations
};

const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
    logger.log('✅ Redis Client Connected for Caching & Rate Limiting.');
});

redisClient.on('error', (err) => {
    logger.error('❌ Redis Connection Error:', err);
    // In production, this error should trigger an AI alert or fallback strategy
    // For now, the process will continue, but caching will be disabled.
});

module.exports = redisClient;