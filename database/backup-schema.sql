-- COMPLETE Backup Database Schema for HMS Secure Backup
CREATE DATABASE hms_backup;

\c hms_backup;

-- ============================================
-- 1. ACTUAL DATA BACKUP TABLES (MISSING IN PREVIOUS)
-- ============================================

-- Secure user data backup with validation tracking
CREATE TABLE backup_users (
    backup_id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    user_data JSONB NOT NULL,
    backup_date DATE DEFAULT CURRENT_DATE,
    scan_status VARCHAR(20) DEFAULT 'pending',
    validation_errors TEXT[],
    data_hash VARCHAR(64), -- For data integrity verification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student data backup with academic validation
CREATE TABLE backup_students (
    backup_id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    student_data JSONB NOT NULL,
    backup_date DATE DEFAULT CURRENT_DATE,
    scan_status VARCHAR(20) DEFAULT 'pending',
    validation_errors TEXT[],
    data_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking data backup with transaction integrity
CREATE TABLE backup_bookings (
    backup_id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    booking_data JSONB NOT NULL,
    backup_date DATE DEFAULT CURRENT_DATE,
    scan_status VARCHAR(20) DEFAULT 'pending',
    validation_errors TEXT[],
    data_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room data backup with availability tracking
CREATE TABLE backup_rooms (
    backup_id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    room_data JSONB NOT NULL,
    backup_date DATE DEFAULT CURRENT_DATE,
    scan_status VARCHAR(20) DEFAULT 'pending',
    validation_errors TEXT[],
    data_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hostel data backup
CREATE TABLE backup_hostels (
    backup_id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    hostel_data JSONB NOT NULL,
    backup_date DATE DEFAULT CURRENT_DATE,
    scan_status VARCHAR(20) DEFAULT 'pending',
    validation_errors TEXT[],
    data_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee data backup
CREATE TABLE backup_employees (
    backup_id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
    employee_data JSONB NOT NULL,
    backup_date DATE DEFAULT CURRENT_DATE,
    scan_status VARCHAR(20) DEFAULT 'pending',
    validation_errors TEXT[],
    data_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. DATA VALIDATION & SECURITY TABLES (NEW)
-- ============================================

-- Data validation rules and results
CREATE TABLE data_validation_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    validation_type VARCHAR(100),
    passed BOOLEAN DEFAULT FALSE,
    error_details JSONB,
    validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suspicious data held for developer review
CREATE TABLE held_data_review (
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

-- Backup integrity verification
CREATE TABLE backup_integrity_checks (
    id SERIAL PRIMARY KEY,
    backup_date DATE NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    total_records INTEGER,
    validated_records INTEGER,
    failed_records INTEGER,
    data_hash_verified BOOLEAN DEFAULT FALSE,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. REPORTING TABLES (FROM PREVIOUS - UPDATED)
-- ============================================

-- Health reports table
CREATE TABLE daily_health_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    server_health JSONB,
    application_health JSONB,
    database_health JSONB,
    security_incidents JSONB,
    backup_health JSONB, -- NEW: Backup system health
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attack reports table
CREATE TABLE attack_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    total_requests INTEGER,
    blocked_requests INTEGER,
    attack_types JSONB,
    suspicious_ips JSONB,
    firewall_actions JSONB,
    data_breach_attempts INTEGER DEFAULT 0, -- NEW
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent performance reports
CREATE TABLE agent_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    agent_name VARCHAR(100),
    status VARCHAR(50),
    uptime INTERVAL,
    tasks_processed INTEGER,
    errors INTEGER,
    performance_metrics JSONB,
    backup_tasks INTEGER DEFAULT 0, -- NEW
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User anomaly reports
CREATE TABLE user_anomaly_reports (
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

-- Application performance reports
CREATE TABLE application_reports (
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
    backup_success_rate DECIMAL(5,2), -- NEW
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance logs
CREATE TABLE maintenance_logs (
    id SERIAL PRIMARY KEY,
    maintenance_start TIMESTAMP,
    maintenance_end TIMESTAMP,
    initiated_by VARCHAR(100),
    status VARCHAR(50),
    backup_size VARCHAR(50),
    affected_services JSONB,
    data_validated BOOLEAN DEFAULT FALSE, -- NEW
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Real-time monitoring data
CREATE TABLE real_time_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(100),
    metric_value JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. BACKUP PERFORMANCE & AUDIT TABLES (NEW)
-- ============================================

-- Backup performance metrics
CREATE TABLE backup_performance (
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

-- Data change tracking for incremental backups
CREATE TABLE data_change_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    operation VARCHAR(10), -- INSERT, UPDATE, DELETE
    change_timestamp TIMESTAMP,
    old_data JSONB,
    new_data JSONB,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Developer access audit
CREATE TABLE developer_access_logs (
    id SERIAL PRIMARY KEY,
    developer_id VARCHAR(100),
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    action_performed VARCHAR(200),
    access_key_used BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 5. COMPREHENSIVE INDEXES FOR PERFORMANCE
-- ============================================

-- Backup data indexes
CREATE INDEX idx_backup_users_date ON backup_users(backup_date);
CREATE INDEX idx_backup_users_status ON backup_users(scan_status);
CREATE INDEX idx_backup_students_date ON backup_students(backup_date);
CREATE INDEX idx_backup_bookings_date ON backup_bookings(backup_date);
CREATE INDEX idx_backup_rooms_date ON backup_rooms(backup_date);

-- Validation indexes
CREATE INDEX idx_validation_logs_table ON data_validation_logs(table_name);
CREATE INDEX idx_validation_logs_time ON data_validation_logs(validated_at);
CREATE INDEX idx_held_data_reviewed ON held_data_review(reviewed);
CREATE INDEX idx_held_data_severity ON held_data_review(severity);

-- Reporting indexes
CREATE INDEX idx_health_reports_date ON daily_health_reports(report_date);
CREATE INDEX idx_attack_reports_date ON attack_reports(report_date);
CREATE INDEX idx_agent_reports_date ON agent_reports(report_date);
CREATE INDEX idx_anomaly_reports_date ON user_anomaly_reports(report_date);
CREATE INDEX idx_app_reports_date ON application_reports(report_date);
CREATE INDEX idx_metrics_timestamp ON real_time_metrics(timestamp);

-- Performance indexes
CREATE INDEX idx_backup_perf_date ON backup_performance(backup_date);
CREATE INDEX idx_data_changes_table ON data_change_logs(table_name);
CREATE INDEX idx_data_changes_time ON data_change_logs(change_timestamp);
CREATE INDEX idx_dev_access_time ON developer_access_logs(access_time);

-- ============================================
-- 6. SECURITY FEATURES (NEW)
-- ============================================

-- Encrypted backup keys table
CREATE TABLE backup_encryption_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Backup access controls
CREATE TABLE backup_access_logs (
    id SERIAL PRIMARY KEY,
    accessed_by VARCHAR(100),
    access_type VARCHAR(50),
    table_accessed VARCHAR(100),
    records_accessed INTEGER,
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)
);

-- ============================================
-- 7. VIEWS FOR EASY REPORTING (NEW)
-- ============================================

-- Daily backup summary view
CREATE VIEW daily_backup_summary AS
SELECT 
    backup_date,
    (SELECT COUNT(*) FROM backup_users WHERE backup_date = bu.backup_date) as users_backed_up,
    (SELECT COUNT(*) FROM backup_students WHERE backup_date = bu.backup_date) as students_backed_up,
    (SELECT COUNT(*) FROM backup_bookings WHERE backup_date = bu.backup_date) as bookings_backed_up,
    (SELECT COUNT(*) FROM backup_users WHERE backup_date = bu.backup_date AND scan_status = 'invalid') as invalid_users,
    (SELECT COUNT(*) FROM held_data_review WHERE DATE(held_at) = bu.backup_date) as records_held
FROM backup_users bu
GROUP BY backup_date;

-- System health overview view
CREATE VIEW system_health_overview AS
SELECT 
    report_date,
    (server_health->>'cpu_usage')::DECIMAL as cpu_usage,
    (server_health->>'memory_usage')::DECIMAL as memory_usage,
    (database_health->>'total_users')::INTEGER as total_users,
    backup_health->>'status' as backup_status
FROM daily_health_reports;

-- Validation success rate view
CREATE VIEW validation_success_rates AS
SELECT 
    table_name,
    COUNT(*) as total_validations,
    COUNT(CASE WHEN passed = true THEN 1 END) as passed_validations,
    ROUND(COUNT(CASE WHEN passed = true THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM data_validation_logs
GROUP BY table_name;

-- ============================================
-- 8. INITIAL DATA & CONFIGURATION (NEW)
-- ============================================

-- Insert default encryption key
INSERT INTO backup_encryption_keys (key_name, encrypted_key, key_type) 
VALUES ('default_backup_key', 'encrypted_key_placeholder', 'data_protection');

-- Insert initial maintenance configuration
INSERT INTO maintenance_logs (maintenance_start, initiated_by, status, data_validated)
VALUES (CURRENT_TIMESTAMP, 'system', 'configured', true);

-- Create backup user for access control (optional)
-- Note: In production, create dedicated backup user with limited permissions

COMMENT ON DATABASE hms_backup IS 'HMS Central Secure Backup Database - Maintenance System';