/**
 * HMS Backup Database Setup Script
 * Run: node setup-backup-database.js
 * Creates backup database and tables automatically with COMPLETE schema
 */

require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../config/logger');

async function setupBackupDatabase() {
    const adminPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: 'postgres',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSLMODE === 'require' ? { rejectUnauthorized: false } : false
    });

    try {
        logger.info('Starting backup database setup');

        // Create backup database if not exists
        const dbCheck = await adminPool.query(
            "SELECT 1 FROM pg_database WHERE datname = 'hms_backup'"
        );
        
        if (dbCheck.rows.length === 0) {
            await adminPool.query('CREATE DATABASE hms_backup');
            logger.info('Created backup database hms_backup');
        } else {
            logger.info('Backup database already exists, skipping creation');
        }

        // Connect to backup database and create tables
        const backupPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: 'hms_backup',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            ssl: process.env.DB_SSLMODE === 'require' ? { rejectUnauthorized: false } : false
        });

        try {
            logger.info('Creating backup tables');

            // COMPLETE BACKUP SCHEMA
            const backupSchema = `
                -- 1. ACTUAL DATA BACKUP TABLES
                CREATE TABLE IF NOT EXISTS backup_users (
                    backup_id SERIAL PRIMARY KEY,
                    original_id INTEGER NOT NULL,
                    user_data JSONB NOT NULL,
                    backup_date DATE DEFAULT CURRENT_DATE,
                    scan_status VARCHAR(20) DEFAULT 'pending',
                    validation_errors TEXT[],
                    data_hash VARCHAR(64),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS backup_students (
                    backup_id SERIAL PRIMARY KEY,
                    original_id INTEGER NOT NULL,
                    student_data JSONB NOT NULL,
                    backup_date DATE DEFAULT CURRENT_DATE,
                    scan_status VARCHAR(20) DEFAULT 'pending',
                    validation_errors TEXT[],
                    data_hash VARCHAR(64),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS backup_bookings (
                    backup_id SERIAL PRIMARY KEY,
                    original_id INTEGER NOT NULL,
                    booking_data JSONB NOT NULL,
                    backup_date DATE DEFAULT CURRENT_DATE,
                    scan_status VARCHAR(20) DEFAULT 'pending',
                    validation_errors TEXT[],
                    data_hash VARCHAR(64),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS backup_rooms (
                    backup_id SERIAL PRIMARY KEY,
                    original_id INTEGER NOT NULL,
                    room_data JSONB NOT NULL,
                    backup_date DATE DEFAULT CURRENT_DATE,
                    scan_status VARCHAR(20) DEFAULT 'pending',
                    validation_errors TEXT[],
                    data_hash VARCHAR(64),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS backup_hostels (
                    backup_id SERIAL PRIMARY KEY,
                    original_id INTEGER NOT NULL,
                    hostel_data JSONB NOT NULL,
                    backup_date DATE DEFAULT CURRENT_DATE,
                    scan_status VARCHAR(20) DEFAULT 'pending',
                    validation_errors TEXT[],
                    data_hash VARCHAR(64),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS backup_employees (
                    backup_id SERIAL PRIMARY KEY,
                    original_id INTEGER NOT NULL,
                    employee_data JSONB NOT NULL,
                    backup_date DATE DEFAULT CURRENT_DATE,
                    scan_status VARCHAR(20) DEFAULT 'pending',
                    validation_errors TEXT[],
                    data_hash VARCHAR(64),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- 2. DATA VALIDATION & SECURITY TABLES
                CREATE TABLE IF NOT EXISTS data_validation_logs (
                    id SERIAL PRIMARY KEY,
                    table_name VARCHAR(100) NOT NULL,
                    record_id INTEGER NOT NULL,
                    validation_type VARCHAR(100),
                    passed BOOLEAN DEFAULT FALSE,
                    error_details JSONB,
                    validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS held_data_review (
                    id SERIAL PRIMARY KEY,
                    table_name VARCHAR(100) NOT NULL,
                    original_id INTEGER NOT NULL,
                    data_snapshot JSONB NOT NULL,
                    validation_errors TEXT[] NOT NULL,
                    severity VARCHAR(20) DEFAULT 'medium',
                    reviewed BOOLEAN DEFAULT FALSE,
                    reviewed_by VARCHAR(100),
                    review_notes TEXT,
                    held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    reviewed_at TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS backup_integrity_checks (
                    id SERIAL PRIMARY KEY,
                    backup_date DATE NOT NULL,
                    table_name VARCHAR(100) NOT NULL,
                    total_records INTEGER,
                    validated_records INTEGER,
                    failed_records INTEGER,
                    data_hash_verified BOOLEAN DEFAULT FALSE,
                    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- 3. REPORTING TABLES
                CREATE TABLE IF NOT EXISTS daily_health_reports (
                    id SERIAL PRIMARY KEY,
                    report_date DATE NOT NULL,
                    server_health JSONB,
                    application_health JSONB,
                    database_health JSONB,
                    security_incidents JSONB,
                    backup_health JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS attack_reports (
                    id SERIAL PRIMARY KEY,
                    report_date DATE NOT NULL,
                    total_requests INTEGER,
                    blocked_requests INTEGER,
                    attack_types JSONB,
                    suspicious_ips JSONB,
                    firewall_actions JSONB,
                    data_breach_attempts INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS agent_reports (
                    id SERIAL PRIMARY KEY,
                    report_date DATE NOT NULL,
                    agent_name VARCHAR(100),
                    status VARCHAR(50),
                    uptime INTERVAL,
                    tasks_processed INTEGER,
                    errors INTEGER,
                    performance_metrics JSONB,
                    backup_tasks INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS user_anomaly_reports (
                    id SERIAL PRIMARY KEY,
                    report_date DATE NOT NULL,
                    user_id INTEGER,
                    anomaly_type VARCHAR(100),
                    severity VARCHAR(50),
                    description TEXT,
                    action_taken VARCHAR(100),
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS application_reports (
                    id SERIAL PRIMARY KEY,
                    report_date DATE NOT NULL,
                    total_users INTEGER,
                    active_sessions INTEGER,
                    booking_requests INTEGER,
                    successful_bookings INTEGER,
                    failed_bookings INTEGER,
                    system_load JSONB,
                    response_times JSONB,
                    error_rates JSONB,
                    backup_success_rate DECIMAL(5,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS maintenance_logs (
                    id SERIAL PRIMARY KEY,
                    maintenance_start TIMESTAMP,
                    maintenance_end TIMESTAMP,
                    initiated_by VARCHAR(100),
                    status VARCHAR(50),
                    backup_size VARCHAR(50),
                    affected_services JSONB,
                    data_validated BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS real_time_metrics (
                    id SERIAL PRIMARY KEY,
                    metric_type VARCHAR(100),
                    metric_value JSONB,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                -- 4. BACKUP PERFORMANCE & AUDIT TABLES
                CREATE TABLE IF NOT EXISTS backup_performance (
                    id SERIAL PRIMARY KEY,
                    backup_date DATE NOT NULL,
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    duration_seconds INTEGER,
                    total_records INTEGER,
                    records_per_second DECIMAL(10,2),
                    memory_used_mb INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS data_change_logs (
                    id SERIAL PRIMARY KEY,
                    table_name VARCHAR(100) NOT NULL,
                    record_id INTEGER NOT NULL,
                    operation VARCHAR(10),
                    change_timestamp TIMESTAMP,
                    old_data JSONB,
                    new_data JSONB,
                    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS developer_access_logs (
                    id SERIAL PRIMARY KEY,
                    developer_id VARCHAR(100),
                    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ip_address VARCHAR(45),
                    action_performed VARCHAR(200),
                    access_key_used BOOLEAN DEFAULT TRUE
                );

                -- 5. SECURITY FEATURES
                CREATE TABLE IF NOT EXISTS backup_encryption_keys (
                    id SERIAL PRIMARY KEY,
                    key_name VARCHAR(100) UNIQUE NOT NULL,
                    encrypted_key TEXT NOT NULL,
                    key_type VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                );

                CREATE TABLE IF NOT EXISTS backup_access_logs (
                    id SERIAL PRIMARY KEY,
                    accessed_by VARCHAR(100),
                    access_type VARCHAR(50),
                    table_accessed VARCHAR(100),
                    records_accessed INTEGER,
                    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ip_address VARCHAR(45)
                );
            `;

            await backupPool.query(backupSchema);
            logger.info('Backup tables created successfully');

            // Create indexes
            logger.info('Creating backup indexes');
            await backupPool.query(`
                CREATE INDEX IF NOT EXISTS idx_backup_users_date ON backup_users(backup_date);
                CREATE INDEX IF NOT EXISTS idx_backup_users_status ON backup_users(scan_status);
                CREATE INDEX IF NOT EXISTS idx_backup_students_date ON backup_students(backup_date);
                CREATE INDEX IF NOT EXISTS idx_backup_bookings_date ON backup_bookings(backup_date);
                CREATE INDEX IF NOT EXISTS idx_backup_rooms_date ON backup_rooms(backup_date);
                CREATE INDEX IF NOT EXISTS idx_health_reports_date ON daily_health_reports(report_date);
                CREATE INDEX IF NOT EXISTS idx_attack_reports_date ON attack_reports(report_date);
                CREATE INDEX IF NOT EXISTS idx_agent_reports_date ON agent_reports(report_date);
                CREATE INDEX IF NOT EXISTS idx_anomaly_reports_date ON user_anomaly_reports(report_date);
                CREATE INDEX IF NOT EXISTS idx_app_reports_date ON application_reports(report_date);
                CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON real_time_metrics(timestamp);
            `);
            logger.info('Backup indexes created');

            // Insert default data
            logger.info('Inserting default backup configuration values');
            await backupPool.query(`
                INSERT INTO backup_encryption_keys (key_name, encrypted_key, key_type) 
                VALUES ('default_backup_key', 'encrypted_key_placeholder', 'data_protection')
                ON CONFLICT (key_name) DO NOTHING;

                INSERT INTO maintenance_logs (maintenance_start, initiated_by, status, data_validated)
                VALUES (CURRENT_TIMESTAMP, 'system', 'configured', true)
                ON CONFLICT DO NOTHING;
            `);

            logger.info('Default configuration inserted');

        } finally {
            await backupPool.end();
        }

        logger.info('Backup database setup completed successfully');

    } catch (error) {
        logger.error('Backup database setup error', { error: error.message, stack: error.stack });
        process.exit(1);
    } finally {
        await adminPool.end();
    }
}

// Run setup
setupBackupDatabase();