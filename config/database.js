// File: config/database.js

const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hms_central',
    password: process.env.DB_PASSWORD || 'shivani',
    port: process.env.DB_PORT || 5432,
    max: 20, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 2000, 
});

// ** PRODUCTION FIX: Explicitly check for initial connection **
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        logger.error('CRITICAL: Failed to connect to the database on startup. Exiting.', err);
        process.exit(1); 
    } else {
        logger.info("Database client connected successfully.");
    }
});

pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client (DB operation failure)', err);
});

// FIX: Export both ways for backward compatibility
module.exports = pool; // Direct export for new services
module.exports.dbPool = pool; // Named export for existing admin routes
module.exports.pool = pool; // Additional named export