/**
 * HMS-CENTRAL-COPY/database/setup-database.js
 * * Database Setup Script for the Distributed Database Cluster.
 * * Executes the schema.sql to create all tables and insert initial roles.
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

// Load database configuration from the environment variables
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'hms_central',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSLMODE === 'require' ? { rejectUnauthorized: false } : false
};

async function setupDatabase() {
    // Note: The pool here is local to the script and distinct from the running server's pool.
    const pool = new Pool(dbConfig);

    try {
        logger.info('🚀 Starting database setup...');
        logger.info(`📊 Connecting to database: ${dbConfig.database}@${dbConfig.host}`);

        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema (creates tables, indexes, functions, and inserts roles)
        logger.info('📝 Creating tables, indexes, and inserting default roles...');
        await pool.query(schema);
        logger.info('✅ Database schema created successfully!');

        // Verify key tables (for IT Admin oversight)
        logger.info('🔍 Verifying core tables...');
        const tables = [
            'roles', 'users', 'students', 'blocked_ips', 'activity_logs',
            'email_logs', 'otp_verifications', 'hostels', 'bookings',
            'system_status', 'data_sync_log'
        ];

        for (const table of tables) {
            const result = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [table]);

            if (result.rows[0].exists) {
                logger.info(`  ✅ Table '${table}' exists`);
            } else {
                logger.warn(`  ⚠️  Table '${table}' not found`);
            }
        }
        
        // Insert initial system status for Maintenance Middleware
        logger.info('⚙️  Setting up initial system status...');
        await pool.query(`
            INSERT INTO system_status (status_key, status_value) 
            VALUES ('maintenance_mode', 'false')
            ON CONFLICT (status_key) DO UPDATE SET status_value = 'false';
        `);

        logger.info('✅ Database setup completed successfully! The Distributed Cluster is ready.');

    } catch (error) {
        logger.error('❌ Database setup error:', error.message);
        logger.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run setup
setupDatabase();