// File: security/middleware/MaintenanceSystem.js

// 1. Complete Maintenance System with automated backup
// 2. Real-time IST time handling
// 3. Data scanning and validation before backup
// 4. Centralized configuration
// 5. FINAL VERSION - Real-time clock and countdown

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const { dbPool } = require('../../config/database');
const logger = require('../../config/logger');

class MaintenanceSystem {
    constructor() {
        // CENTRALIZED CONFIGURATION - Change only here
        this.config = {
            maintenanceStart: '16:21',
            maintenanceEnd: '16:25',
            timezone: 'Asia/Kolkata',
            backupScanEnabled: true,
            dataValidation: true
        };
        
        this.maintenanceMode = false;
        this.developerKey = process.env.DEVELOPER_ACCESS_KEY || "844b48f16eb07f8a91de5d5ee1ce4c08f6076ef82e4714a0796283c24f026692";
        this.backupPool = null;
        this.db = dbPool; 
        this.init();
    }

    async init() {
        if (!this.db) {
            logger.error('FATAL: Main Database Pool (dbPool) is not available. Maintenance tasks will fail.');
        }
        
        await this.initializeBackupDatabase();
        this.startMaintenanceScheduler();
        this.startHealthMonitoring();
        logger.info('Maintenance System Initialized');
        logger.info('Developer maintenance key loaded from secure configuration');
    }

    // Initialize Backup Database with automated setup
    async initializeBackupDatabase() {
        try {
            await this.createBackupDatabase();
            
            this.backupPool = new Pool({
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT) || 5432,
                database: 'hms_backup',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD,
                ssl: process.env.DB_SSLMODE === 'require' ? { rejectUnauthorized: false } : false
            });

            await this.createBackupTables();
            logger.info('Backup database system ready');
        } catch (error) {
            logger.error('Backup database initialization failed', { error: error.message, stack: error.stack });
        }
    }

    async createBackupDatabase() {
        const adminPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: 'postgres',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD
        });

        try {
            const result = await adminPool.query(
                "SELECT 1 FROM pg_database WHERE datname = 'hms_backup'"
            );
            
            if (result.rows.length === 0) {
                await adminPool.query('CREATE DATABASE hms_backup');
                logger.info('Created backup database hms_backup');
            }
        } finally {
            await adminPool.end();
        }
    }

    async createBackupTables() {
        const backupSchema = `
            CREATE TABLE IF NOT EXISTS backup_users (
                backup_id SERIAL PRIMARY KEY,
                original_id INTEGER,
                user_data JSONB,
                backup_date DATE DEFAULT CURRENT_DATE,
                scan_status VARCHAR(20) DEFAULT 'pending',
                validation_errors TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS backup_students (
                backup_id SERIAL PRIMARY KEY,
                original_id INTEGER,
                student_data JSONB,
                backup_date DATE DEFAULT CURRENT_DATE,
                scan_status VARCHAR(20) DEFAULT 'pending',
                validation_errors TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS backup_bookings (
                backup_id SERIAL PRIMARY KEY,
                original_id INTEGER,
                booking_data JSONB,
                backup_date DATE DEFAULT CURRENT_DATE,
                scan_status VARCHAR(20) DEFAULT 'pending',
                validation_errors TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS backup_rooms (
                backup_id SERIAL PRIMARY KEY,
                original_id INTEGER,
                room_data JSONB,
                backup_date DATE DEFAULT CURRENT_DATE,
                scan_status VARCHAR(20) DEFAULT 'pending',
                validation_errors TEXT[],
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await this.backupPool.query(backupSchema);
    }

    // REAL-TIME IST TIME HANDLING
    getCurrentISTTime() {
        const now = new Date();
        const istTime = now.toLocaleString("en-US", { 
            timeZone: "Asia/Kolkata",
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        return istTime.replace('AM', '').replace('PM', '').trim();
    }

    getCurrentISTTimeOnly() {
        const now = new Date();
        const istTimeString = now.toLocaleString("en-US", { 
            timeZone: "Asia/Kolkata",
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const timeParts = istTimeString.split(':');
        const hours = timeParts[0].padStart(2, '0');
        const minutes = timeParts[1].padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }

    getCurrentISTDate() {
        const now = new Date();
        return now.toLocaleString("en-US", { 
            timeZone: "Asia/Kolkata",
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    getRunningServerTime() {
        return this.getCurrentISTTime();
    }

    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    isInMaintenanceWindow() {
        const currentTime = this.getCurrentISTTimeOnly();
        const start = this.config.maintenanceStart;
        const end = this.config.maintenanceEnd;
        
        const currentMinutes = this.timeToMinutes(currentTime);
        const startMinutes = this.timeToMinutes(start);
        const endMinutes = this.timeToMinutes(end);
        
        console.log(`🔍 MAINTENANCE DEBUG:`);
        console.log(`   - Current IST Time: ${currentTime}`);
        console.log(`   - Maintenance Window: ${start} to ${end}`);
        console.log(`   - Current Minutes: ${currentMinutes}`);
        console.log(`   - Start Minutes: ${startMinutes}`);
        console.log(`   - End Minutes: ${endMinutes}`);
        
        if (startMinutes > endMinutes) {
            const inWindow = currentMinutes >= startMinutes || currentMinutes < endMinutes;
            console.log(`   - Overnight Window Result: ${inWindow}`);
            return inWindow;
        } else {
            const inWindow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
            console.log(`   - Same-day Window Result: ${inWindow}`);
            return inWindow;
        }
    }

    getRemainingTime() {
        const now = new Date();
        const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        
        let target = new Date(istNow);
        const [targetHour, targetMinute] = this.config.maintenanceEnd.split(':').map(Number);
        target.setHours(targetHour, targetMinute, 0, 0);
        
        const [startHour] = this.config.maintenanceStart.split(':').map(Number);
        
        if (startHour > targetHour) {
            if (istNow.getHours() >= startHour) {
                target.setDate(target.getDate() + 1);
            }
        }
        
        if (istNow.getTime() > target.getTime()) {
            target.setDate(target.getDate() + 1);
        }
        
        const diff = target.getTime() - istNow.getTime();
        
        if (diff <= 0) {
            return {
                hours: '00',
                minutes: '00', 
                seconds: '00',
                formatted: '00:00:00',
                completed: true
            };
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return {
            hours: hours.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0'),
            formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            completed: false
        };
    }

    getRealTimeMaintenanceStatus() {
        const currentIST = this.getCurrentISTTimeOnly();
        const inWindow = this.isInMaintenanceWindow();
        
        console.log(`📊 MAINTENANCE STATUS: Current=${currentIST}, InWindow=${inWindow}, Mode=${this.maintenanceMode}`);
        
        return {
            maintenanceMode: this.maintenanceMode,
            maintenanceWindow: {
                startTime: this.config.maintenanceStart,
                endTime: this.config.maintenanceEnd
            },
            serverTime: this.getRunningServerTime(),
            currentISTTime: currentIST,
            inMaintenanceWindow: inWindow,
            remainingTime: this.getRemainingTime(),
            blockTransactions: this.maintenanceMode,
            estimatedCompletion: this.getEstimatedCompletion()
        };
    }

    // NEW: Maintenance check middleware for protected routes
    maintenanceCheckMiddleware(req, res, next) {
        if (this.maintenanceMode) {
            console.log(`🚧 MAINTENANCE BLOCK: Blocking access to ${req.path} during maintenance`);
            
            // If it's an API request, return JSON error
            if (req.path.startsWith('/api/')) {
                return res.status(503).json({
                    success: false,
                    message: 'System under maintenance - Access blocked',
                    maintenance_mode: true,
                    maintenance_window: `${this.config.maintenanceStart} - ${this.config.maintenanceEnd} IST`
                });
            }
            
            // For page requests, redirect to maintenance page
            return res.redirect('/maintenance');
        }
        next();
    }

    // NEW: Force logout all active users
    async forceLogoutAllUsers() {
        try {
            await this.db.query(`
                UPDATE users 
                SET session_token = NULL,
                    last_logout = CURRENT_TIMESTAMP
                WHERE session_token IS NOT NULL 
                OR last_login > CURRENT_TIMESTAMP - INTERVAL '24 hours'
            `);
            
            logger.info('Force logged out all active users due to maintenance');
            console.log('🔐 FORCE LOGOUT: All active users have been logged out');
        } catch (error) {
            logger.error('Error force logging out users:', error);
            console.error('❌ FORCE LOGOUT ERROR:', error.message);
        }
    }

    startMaintenanceScheduler() {
        setInterval(() => {
            this.checkMaintenanceWindow();
        }, 10000); // Reduced to 10 seconds for faster detection
    }

    async checkMaintenanceWindow() {
        const shouldBeInMaintenance = this.isInMaintenanceWindow();
        console.log(`🔄 MAINTENANCE CHECK: ShouldBe=${shouldBeInMaintenance}, CurrentMode=${this.maintenanceMode}`);
        
        if (shouldBeInMaintenance && !this.maintenanceMode) {
            console.log('🟡 STARTING MAINTENANCE MODE');
            await this.startMaintenance();
        } else if (!shouldBeInMaintenance && this.maintenanceMode) {
            console.log('🟢 ENDING MAINTENANCE MODE');
            await this.endMaintenance();
        }
    }

    async startMaintenance() {
        this.maintenanceMode = true;
        const currentIST = this.getCurrentISTTime();
        logger.warn(`Maintenance mode activated at ${currentIST} IST`);
        console.log(`🚧 MAINTENANCE ACTIVATED at ${currentIST} IST`);
        
        // NEW: Force logout all users when maintenance starts
        await this.forceLogoutAllUsers();
        
        await this.performMaintenanceTasks();
    }

    async endMaintenance() {
        this.maintenanceMode = false;
        const currentIST = this.getCurrentISTTime();
        logger.info(`Maintenance mode deactivated at ${currentIST} IST`);
        console.log(`✅ MAINTENANCE DEACTIVATED at ${currentIST} IST`);
        await this.performPostMaintenanceTasks();
    }

    async performMaintenanceTasks() {
        try {
            logger.info('Starting maintenance tasks');
            await this.performDataBackupWithScanning();
            await this.performSystemHealthCheck();
            await this.generateDailyReports();
            await this.logMaintenanceActivity('started');
        } catch (error) {
            logger.error('Maintenance tasks failed', { error: error.message, stack: error.stack });
        }
    }

    async performPostMaintenanceTasks() {
        logger.info('Performing post-maintenance tasks');
    }

    async performSystemHealthCheck() {
        logger.info('Performing system health check');
    }

    async performDataBackupWithScanning() {
        if (!this.db) {
            logger.error('Cannot perform backup - Main database pool is undefined');
            return;
        }

        logger.info('Starting data backup with scanning');
        
        const tablesToBackup = [
            { name: 'users', pk: 'user_id', table: 'backup_users', column: 'user_data' },
            { name: 'students', pk: 'id', table: 'backup_students', column: 'student_data' },
            { name: 'bookings', pk: 'booking_id', table: 'backup_bookings', column: 'booking_data' },
            { name: 'rooms', pk: 'room_id', table: 'backup_rooms', column: 'room_data' }
        ];

        for (const table of tablesToBackup) {
            await this.backupTableWithScanning(table);
        }
    }

    async backupTableWithScanning(tableConfig) {
        try {
            const mainData = await this.db.query(`SELECT * FROM ${tableConfig.name}`);
            logger.info(`Backing up table ${tableConfig.name}`, { totalRecords: mainData.rows.length });

            for (const row of mainData.rows) {
                const validationResult = await this.validateData(row, tableConfig.name);
                
                if (validationResult.isValid) {
                    await this.backupPool.query(
                        `INSERT INTO ${tableConfig.table} (original_id, ${tableConfig.column}, scan_status) 
                         VALUES ($1, $2, 'valid')`,
                        [row[tableConfig.pk], row]
                    );
                } else {
                    await this.backupPool.query(
                        `INSERT INTO ${tableConfig.table} (original_id, ${tableConfig.column}, scan_status, validation_errors) 
                         VALUES ($1, $2, 'invalid', $3)`,
                        [row[tableConfig.pk], row, validationResult.errors]
                    );
                }
            }

            logger.info(`${tableConfig.name} backup completed`);

        } catch (error) {
            logger.error(`Backup failed for ${tableConfig.name}`, { error: error.message, stack: error.stack });
        }
    }

    async validateData(data, tableName) {
        const errors = [];

        if (data.email && !this.isValidEmail(data.email)) {
            errors.push('Invalid email format');
        }

        if (data.phone_number && !this.isValidPhone(data.phone_number)) {
            errors.push('Invalid phone number');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidPhone(phone) {
        return /^\+?[\d\s-()]{10,}$/.test(phone);
    }

    async generateDailyReports() {
        try {
            const reportDate = this.getCurrentISTDate().split(',')[0];
            const reports = {
                backup_report: await this.generateBackupReport()
            };

            await this.sendDailyReportEmail(reportDate, reports);
            logger.info('Daily reports generated and sent');

        } catch (error) {
            logger.error('Failed to generate daily reports', { error: error.message, stack: error.stack });
        }
    }

    async generateBackupReport() {
        try {
            const result = await this.backupPool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM backup_users WHERE scan_status = 'valid') as valid_users,
                    (SELECT COUNT(*) FROM backup_users WHERE scan_status = 'invalid') as invalid_users,
                    (SELECT COUNT(*) FROM backup_students WHERE scan_status = 'valid') as valid_students,
                    (SELECT COUNT(*) FROM backup_students WHERE scan_status = 'invalid') as invalid_students
            `);
            return result.rows[0];
        } catch (error) {
            return { error: error.message };
        }
    }

    async sendDailyReportEmail(date, reports) {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            logger.warn('Email credentials not configured - skipping daily report email send');
            return;
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const htmlContent = this.generateEmailHTML(date, reports);

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.DEVELOPER_EMAIL,
                subject: `HMS Daily Backup Report - ${date}`,
                html: htmlContent
            });
            logger.info('Daily report email sent to developer');
        } catch (error) {
            logger.error('Failed to send daily report email', { error: error.message, stack: error.stack });
        }
    }

    generateEmailHTML(date, reports) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .report-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
                    .table { width: 100%; border-collapse: collapse; }
                    .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .health-good { color: green; }
                    .health-warning { color: orange; }
                </style>
            </head>
            <body>
                <h1>HMS Daily Backup Report - ${date}</h1>
                <p><strong>Generated at:</strong> ${this.getCurrentISTTime()} IST</p>
                
                <div class="report-section">
                    <h2>💾 Backup Summary</h2>
                    <table class="table">
                        <tr><th>Data Type</th><th>Valid Records</th><th>Invalid Records</th><th>Status</th></tr>
                        <tr><td>Users</td><td>${reports.backup_report?.valid_users || 0}</td><td>${reports.backup_report?.invalid_users || 0}</td><td class="health-good">Completed</td></tr>
                        <tr><td>Students</td><td>${reports.backup_report?.valid_students || 0}</td><td>${reports.backup_report?.invalid_students || 0}</td><td class="health-good">Completed</td></tr>
                    </table>
                </div>

                <p><em>Maintenance Window: ${this.config.maintenanceStart} - ${this.config.maintenanceEnd} IST</em></p>
                <p><em>Report generated automatically by HMS Maintenance System</em></p>
            </body>
            </html>
        `;
    }

    verifyDeveloperAccess(accessKey) {
        return accessKey === this.developerKey;
    }

    maintenanceMiddleware(req, res, next) {
        if (this.maintenanceMode) {
            const developerKey = req.headers['x-developer-key'] || req.query.dev_key;
            
            if (developerKey && this.verifyDeveloperAccess(developerKey)) {
                next();
            } else {
                res.status(503).json({
                    success: false,
                    message: 'System under maintenance',
                    maintenance_window: `${this.config.maintenanceStart} - ${this.config.maintenanceEnd} IST`,
                    current_time: this.getCurrentISTTime(),
                    estimated_completion: this.getEstimatedCompletion()
                });
            }
        } else {
            next();
        }
    }

    getEstimatedCompletion() {
        const now = new Date();
        const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        
        const [endHour, endMinute] = this.config.maintenanceEnd.split(':').map(Number);
        const completion = new Date(istNow);
        completion.setHours(endHour, endMinute, 0, 0);
        
        const [startHour] = this.config.maintenanceStart.split(':').map(Number);
        
        if (startHour > endHour) {
            if (istNow.getHours() >= endHour) {
                completion.setDate(completion.getDate() + 1);
            }
        }
        
        if (completion < istNow) {
            completion.setDate(completion.getDate() + 1);
        }
        
        return completion.toLocaleString("en-US", { 
            timeZone: "Asia/Kolkata",
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        }) + ' IST';
    }

    async logMaintenanceActivity(action) {
        try {
            await this.backupPool.query(
                `INSERT INTO maintenance_logs (maintenance_start, maintenance_end, initiated_by, status, backup_size)
                 VALUES (CURRENT_TIMESTAMP, NULL, 'auto', $1, '0MB')`,
                [action]
            );
        } catch (error) {
            logger.error('Failed to log maintenance activity', { error: error.message, stack: error.stack });
        }
    }

    startHealthMonitoring() {
        setInterval(async () => {
            await this.collectHealthMetrics();
        }, 300000);
    }

    async collectHealthMetrics() {
        try {
            const metrics = {
                timestamp: this.getCurrentISTDate(),
                server: await this.getServerMetrics(),
                database: await this.getDatabaseMetrics()
            };

            await this.backupPool.query(
                'INSERT INTO real_time_metrics (metric_type, metric_value) VALUES ($1, $2)',
                ['health_check', metrics]
            );
        } catch (error) {
            logger.error('Failed to collect health metrics', { error: error.message, stack: error.stack });
        }
    }

    async getServerMetrics() {
        const os = require('os');
        return {
            cpu_usage: os.loadavg()[0].toFixed(2),
            memory_usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
            uptime: Math.floor(os.uptime() / 3600) + ' hours'
        };
    }

    async getDatabaseMetrics() {
        if (!this.db) {
            return { error: 'Main database pool is undefined.' };
        }
        
        try {
            const result = await this.db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM bookings) as total_bookings,
                    (SELECT COUNT(*) FROM students) as total_students
            `);
            return result.rows[0];
        } catch (error) {
            return { error: error.message };
        }
    }
}

module.exports = new MaintenanceSystem();