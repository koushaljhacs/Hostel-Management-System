// Complete server.js with maintenance system integration - FINAL VERSION

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const path = require('path');
const logger = require('./config/logger');
const dbPool = require('./config/database');
const MaintenanceSystem = require('./security/middleware/MaintenanceSystem');

// Import routes
const authRoutes = require('./api/authRoutes');
const adminRoutes = require('./api/adminRoutes');
const chiefWardenRoutes = require('./api/chiefWardenRoutes');
const wardenRoutes = require('./api/wardenRoutes');
const studentRoutes = require('./api/studentRoutes');
const bookingRoutes = require('./api/BookingRoutes');
const controlRoutes = require('./api/controlRoutes');
const maintenanceRoutes = require('./api/maintenanceRoutes');

// Import services for registration
const OTPService = require('./distributed-services/registration-service/services/OTPService');
const EmailService = require('./distributed-services/registration-service/services/EmailService');
const ValidationService = require('./distributed-services/registration-service/services/ValidationService');

// --- Initialization ---
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
let server; 

console.log('🚀 ========== SERVER STARTUP INITIATED ==========');
console.log(`📁 Current directory: ${__dirname}`);
console.log(`🌐 NODE_ENV: ${NODE_ENV}`);
console.log(`🔧 PORT: ${PORT}`);

// === CRITICAL SECURITY CHECK FIX (Addresses JWT_SECRET not set error) ===
if (!process.env.JWT_SECRET) {
    if (NODE_ENV === 'production') {
        console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set. Exiting.');
        process.exit(1);
    } else {
        process.env.JWT_SECRET = 'TEMPORARY_DEV_SECRET_DO_NOT_USE_IN_PROD_1234567890_HOSTEL_MS';
        console.warn('⚠️ SECURITY WARNING: JWT_SECRET is not set. Using temporary secret for development.');
    }
}
console.log('✅ JWT_SECRET check passed');

// CRITICAL FIX: CSRF protection definition (needed for staff-login.js)
const csrfProtection = csrf({
    cookie: {
        key: process.env.CSRF_COOKIE_NAME || 'hms_csrf_token',
        httpOnly: true,
        sameSite: 'strict',
        secure: NODE_ENV === 'production'
    }
});
console.log('✅ CSRF protection configured');

// Initialize services
let otpService, emailService, validationService;

// --- Security Middleware Setup ---

// 1. Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"], 
            styleSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "'unsafe-inline'"], 
            // FIX: Enhanced CSP to allow reCAPTCHA
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://www.google.com", "https://www.gstatic.com"], 
            scriptSrcAttr: ["'unsafe-inline'"], 
            // FIX: Add ALL reCAPTCHA API domains to connect-src
            connectSrc: ["'self'", "http://localhost:3000", "https://api.postalpincode.in", "https://www.google.com", "https://www.gstatic.com", "https://recaptcha.google.com", "https://*.google.com"], 
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "https://www.gstatic.com"],
            frameSrc: ["'self'", "https://www.google.com", "https://recaptcha.google.com"]
        },
    },
}));
console.log('✅ Helmet security configured');

// 2. CORS
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(',');
console.log(`🌐 CORS Allowed Origins: ${allowedOrigins.join(', ')}`);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`❌ CORS Blocked: Origin ${origin} not allowed.`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};

app.use(cors(corsOptions));
console.log('✅ CORS configured');

// 3. Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 500,
    message: { success: false, message: "Too many requests, please try again after 15 minutes." },
    standardHeaders: true, legacyHeaders: false,
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, max: 10,
    message: { success: false, message: "Too many authentication attempts, please try again after 5 minutes." },
    standardHeaders: true, legacyHeaders: false,
});
app.use('/api/auth', authLimiter);
console.log('✅ Rate limiting configured');

// --- General Middleware ---
app.use(cookieParser(process.env.COOKIE_SECRET || 'hms-cookie-secret'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('✅ General middleware configured');

// ========== MAINTENANCE ENFORCEMENT ==========

// 1. Static Assets Exemption for Maintenance Page
app.use('/maintenance', express.static(path.join(__dirname, 'web-interfaces/maintenance')));

// 2. Comprehensive Maintenance Enforcement Middleware
const maintenanceEnforcer = (req, res, next) => {
    const isMaintenanceMode = MaintenanceSystem.maintenanceMode;
    
    if (!isMaintenanceMode) {
        return next();
    }

    const allowedDuringMaintenance = [
        '/', 
        '/api/maintenance/status',
        '/api/maintenance/realtime', 
        '/api/maintenance/toggle', 
        '/health', 
        '/favicon.ico',
        '/api/validate-field',
        '/api/register',        
        '/api/send-otp',        
        '/api/verify-otp',
        '/api/auth/login'
    ];

    const isExemptedAPI = allowedDuringMaintenance.some(allowedPath => {
        return req.path.startsWith(allowedPath);
    });

    const isStaticAsset = req.path.startsWith('/admin-console') || 
                          req.path.startsWith('/common/public') || 
                          req.path.startsWith('/css') || 
                          req.path.startsWith('/js') || 
                          req.path.startsWith('/images') ||
                          req.path.startsWith('/assets') ||
                          /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(req.path);

    if (isStaticAsset || isExemptedAPI) {
        return next();
    }

    if (req.path.startsWith('/api/')) {
        console.log(`🚧 MAINTENANCE: API BLOCKED - ${req.path}`);
        return res.status(503).json({ 
            success: false, 
            message: "System under maintenance",
            maintenance_window: `${MaintenanceSystem.config.maintenanceStart} - ${MaintenanceSystem.config.maintenanceEnd} IST`,
            current_time: MaintenanceSystem.getCurrentISTTime()
        });
    }

    if (req.path !== '/') {
        console.log(`🚧 MAINTENANCE: PAGE REDIRECT - ${req.path} to /maintenance`);
        return res.redirect('/maintenance');
    }

    next();
};

// 3. Apply the Enforcer globally
app.use(maintenanceEnforcer);
console.log('✅ Maintenance enforcement configured');

// 4. CSRF token endpoint
app.get('/api/security/csrf-token', csrfProtection, (req, res) => {
    console.log('🛡️ CSRF token requested');
    res.json({
        success: true,
        token: req.csrfToken()
    });
});

// ========== DEBUG MAINTENANCE STATUS ==========
app.get('/debug-maintenance-status', (req, res) => {
    console.log('🔧 Debug maintenance status requested');
    const currentTime = new Date().toLocaleString("en-US", { 
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    res.json({
        maintenanceMode: MaintenanceSystem.maintenanceMode,
        maintenanceWindow: `${MaintenanceSystem.config.maintenanceStart} - ${MaintenanceSystem.config.maintenanceEnd}`,
        currentTimeIST: currentTime,
        isInMaintenanceWindow: MaintenanceSystem.isInMaintenanceWindow(),
        requestPath: req.path,
        timestamp: new Date().toISOString()
    });
});

// ========== STATIC FILE SERVING - GENERAL ==========

console.log('📂 Setting up static file serving...');

// Shared static assets (CSS, JS, Images)
app.use('/css', express.static(path.join(__dirname, 'web-interfaces/homepage/css')));
app.use('/js', express.static(path.join(__dirname, 'web-interfaces/homepage/js')));
app.use('/images', express.static(path.join(__dirname, 'web-interfaces/homepage/images')));
app.use('/assets', express.static(path.join(__dirname, 'web-interfaces/homepage/assets')));

// Team images from admin-console folder for registration page
app.use('/register/images/team', express.static(path.join(__dirname, 'web-interfaces/admin-console')));
app.use('/images/team', express.static(path.join(__dirname, 'web-interfaces/admin-console')));

// Favicon route
app.use('/favicon.ico', express.static(path.join(__dirname, 'web-interfaces/homepage/favicon.ico')));

// Static route for common/public folder
app.use('/common/public', express.static(path.join(__dirname, 'common/public')));

// Main homepage
app.use('/', express.static(path.join(__dirname, 'web-interfaces/homepage'), {
    index: 'index.html'
}));

// Other static routes
app.use('/admin-console', express.static(path.join(__dirname, 'web-interfaces/admin-console')));
app.use('/user', express.static(path.join(__dirname, 'web-interfaces/user-portals')));
app.use('/booking', express.static(path.join(__dirname, 'hostel-booking/client')));

// Registration routes
app.use('/registration', express.static(path.join(__dirname, 'web-interfaces/registration')));
app.use('/register', express.static(path.join(__dirname, 'web-interfaces/registration')));

console.log('✅ Static file serving configured');

// ========== SPECIFIC ROUTE HANDLERS ==========

app.get('/', (req, res) => {
    console.log('🏠 Homepage requested');
    res.sendFile(path.join(__dirname, 'web-interfaces/homepage/index.html'));
});

app.get('/student-login', (req, res) => {
    console.log('🎓 Student login page requested');
    res.sendFile(path.join(__dirname, 'web-interfaces/homepage/login.html'));
});

app.get('/staff-login', (req, res) => {
    console.log('👨‍💼 Staff login page requested');
    res.sendFile(path.join(__dirname, 'web-interfaces/homepage/staff-login.html'));
});

app.get('/admin-dashboard', (req, res) => {
    console.log('⚙️ Admin dashboard requested');
    res.sendFile(path.join(__dirname, 'web-interfaces/admin-console/hostel-admin-dashboard.html'));
});

app.get('/student-dashboard', (req, res) => {
    console.log('📚 Student dashboard requested');
    res.sendFile(path.join(__dirname, 'web-interfaces/user-portals/student.html'));
});

app.get('/warden-dashboard', (req, res) => {
    console.log('🏢 Warden dashboard requested');
    res.sendFile(path.join(__dirname, 'web-interfaces/user-portals/warden.html'));
});

// ========== MAINTENANCE CHECK MIDDLEWARE ==========

const maintenanceCheck = (req, res, next) => {
    if (MaintenanceSystem.maintenanceMode) {
        console.log(`🚧 MAINTENANCE CHECK: Blocking ${req.method} ${req.path}`);
        
        if (req.path.startsWith('/api/')) {
            return res.status(503).json({
                success: false,
                message: 'System under maintenance - Please log out and try again later',
                maintenance_mode: true,
                maintenance_window: `${MaintenanceSystem.config.maintenanceStart} - ${MaintenanceSystem.config.maintenanceEnd} IST`
            });
        }
        
        return res.redirect('/maintenance');
    }
    next();
};

// Apply routes globally
app.use('/api/auth', authRoutes);
app.use('/api/admin', maintenanceCheck, adminRoutes);
app.use('/api/chief-warden', maintenanceCheck, chiefWardenRoutes);
app.use('/api/warden', maintenanceCheck, wardenRoutes.router);
app.use('/api/student', maintenanceCheck, studentRoutes);
app.use('/api/booking', maintenanceCheck, bookingRoutes);
app.use('/api/control', maintenanceCheck, controlRoutes.router);
app.use('/api/maintenance', maintenanceRoutes);

console.log('✅ API routes configured');

// ========== REGISTRATION API ENDPOINTS ==========

const initializeRegistrationServices = () => {
    try {
        console.log('🔄 Initializing registration services...');
        
        // Debug database connection
        console.log(`📊 Database pool available: ${!!dbPool}`);
        console.log(`📊 Database pool type: ${typeof dbPool}`);
        
        validationService = new ValidationService(dbPool); 
        otpService = new OTPService(dbPool);
        emailService = new EmailService(dbPool);
        
        console.log('✅ Registration services initialized:');
        console.log(`   - ValidationService: ${!!validationService}`);
        console.log(`   - OTPService: ${!!otpService}`);
        console.log(`   - EmailService: ${!!emailService}`);
        
    } catch (error) {
        console.error('❌ Failed to initialize registration services:', error);
        throw error;
    }
};

// Enhanced field validation endpoint with debugging
app.post('/api/validate-field', async (req, res) => {
    const { field, value } = req.body;
    console.log(`🔍 Field validation requested: ${field} = ${value}`);
    
    try {
        let result = { valid: true };
        
        if (field === 'email') {
            console.log(`📧 Validating email: ${value}`);
            result = await validationService.checkDuplicateEmail(value); 
        } else if (field === 'rollNo') {
            console.log(`🎫 Validating roll number: ${value}`);
            result = await validationService.checkDuplicateRollNo(value);
        }
        
        console.log(`📊 Validation result for ${field}:`, result);
        
        if (result.validation_failed) {
            console.warn(`⚠️ Validation service failure for ${field}`);
            return res.json({ 
                success: true, 
                valid: true,
                message: result.message,
                serviceError: true
            });
        }
        
        res.json({ 
            success: true, 
            valid: !result.exists, 
            message: result.message 
        });
    } catch (error) {
        console.error(`❌ Field validation error for ${field}:`, error);
        res.json({ 
            success: true, 
            valid: true,
            message: 'Validation service temporarily unavailable',
            serviceError: true
        });
    }
});

// Enhanced OTP endpoint with debugging
app.post('/api/send-otp', async (req, res) => {
    const { email, userName } = req.body;
    console.log(`📨 OTP request for: ${email}, user: ${userName}`);
    
    try {
        if (!otpService || !emailService) {
            console.warn('🔄 Services not initialized, reinitializing...');
            initializeRegistrationServices();
        }
        
        if (!otpService) {
            throw new Error('OTP service not available');
        }
        
        if (!emailService) {
            throw new Error('Email service not available');
        }
        
        console.log(`🔢 Generating OTP for ${email}...`);
        const otp = await otpService.generateOTP(email);
        console.log(`✅ OTP generated: ${otp}`);
        
        console.log(`📤 Sending OTP email to ${email}...`);
        await emailService.sendOTPEmail(email, otp, userName);
        console.log(`✅ OTP email sent successfully to ${email}`);
        
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('❌ OTP sending error:', error);
        
        let errorMessage = 'Failed to send OTP. Please try again.';
        let statusCode = 500;
        
        if (error.message.includes('transporter') || error.message.includes('Email service')) {
            errorMessage = 'Email service temporarily unavailable. Please try again later.';
            console.error('📧 Email service error detected');
        } else if (error.message.includes('database') || error.message.includes('OTP service')) {
            errorMessage = 'Database service temporarily unavailable. Please try again.';
            statusCode = 503;
            console.error('💾 Database service error detected');
        }
        
        res.status(statusCode).json({ 
            success: false, 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    console.log(`🔐 OTP verification for: ${email}, OTP: ${otp}`);
    
    try {
        const result = await otpService.validateOTP(email, otp);
        console.log(`📊 OTP verification result:`, result);
        
        if (result.valid) {
            console.log(`✅ OTP verified successfully for ${email}`);
            res.json({ success: true, message: 'OTP verified successfully' });
        } else {
            console.warn(`❌ OTP verification failed for ${email}: ${result.message}`);
            res.status(400).json({ success: false, error: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('❌ OTP verification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/register', async (req, res) => {
    console.log('📝 Registration request received');
    console.log('📋 Registration data:', JSON.stringify(req.body, null, 2));
    
    try {
        const StudentService = require('./services/StudentService');
        const studentService = new StudentService(dbPool);
        
        console.log('🔄 Processing student registration...');
        const result = await studentService.registerStudent(req.body);
        console.log('✅ Student registration successful');
        
        try {
            console.log('📧 Sending registration confirmation email...');
            await emailService.sendRegistrationConfirmation(req.body);
            console.log('✅ Registration confirmation email sent');
        } catch (emailError) {
            console.warn('⚠️ Registration confirmation email failed:', emailError);
        }
        
        res.json({ success: true, data: result, message: 'Registration successful' });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== DIAGNOSTIC ENDPOINTS ==========

app.get('/api/debug/db-status', async (req, res) => {
    console.log('🔧 Database status check requested');
    try {
        const result = await dbPool.query('SELECT NOW() as current_time, version() as postgres_version');
        const otpTableCheck = await dbPool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'otp_verifications'
            ) as otp_table_exists
        `);
        
        console.log('✅ Database status check passed');
        res.json({
            database: 'connected',
            current_time: result.rows[0].current_time,
            postgres_version: result.rows[0].postgres_version,
            otp_table_exists: otpTableCheck.rows[0].otp_table_exists
        });
    } catch (error) {
        console.error('❌ Database status check failed:', error);
        res.status(503).json({
            database: 'disconnected',
            error: error.message
        });
    }
});

app.get('/api/debug/services', (req, res) => {
    console.log('🔧 Service status check requested');
    res.json({
        validationService: !!validationService,
        otpService: !!otpService,
        emailService: !!emailService,
        database: !!dbPool,
        emailConfig: {
            user: process.env.EMAIL_USER ? 'Set' : 'Not Set',
            host: process.env.EMAIL_HOST || 'Default (smtp.gmail.com)'
        }
    });
});

// ========== HEALTH CHECK ENDPOINT ==========
app.get('/health', async (req, res) => {
    console.log('❤️ Health check requested');
    try {
        await dbPool.query('SELECT 1');
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            maintenance_mode: MaintenanceSystem.maintenanceMode,
            maintenance_window: `${MaintenanceSystem.config.maintenanceStart} - ${MaintenanceSystem.config.maintenanceEnd} IST`,
            current_time_ist: MaintenanceSystem.getCurrentISTTime(),
            database: 'connected',
            environment: NODE_ENV
        });
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ========== VISITOR TRACKING ENDPOINT ==========
app.post('/api/log-visit', async (req, res) => {
    try {
        const { lat, lon, accuracy, page } = req.body;
        const ip = req.ip || req.connection.remoteAddress;
        
        console.log(`👤 Visitor logged: IP=${ip}, Page=${page}, GPS=${lat ? 'Yes' : 'No'}`);
        
        res.json({ success: true, message: 'Visit logged successfully' });
    } catch (error) {
        console.error('❌ Visit logging error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== ERROR HANDLING MIDDLEWARE ==========

app.use((req, res, next) => {
    if (req.path.includes('.') && !req.path.endsWith('/')) {
        console.log(`❌ File not found: ${req.path}`);
        return res.status(404).send('File not found');
    }
    
    const error = new Error(`Not Found: ${req.originalUrl}`);
    error.status = 404;
    console.log(`❌ Route not found: ${req.originalUrl}`);
    next(error);
});

app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        console.warn('❌ CSRF token validation failed', { path: req.originalUrl, ip: req.ip });
        return res.status(403).json({
            success: false,
            message: 'Invalid or missing CSRF token'
        });
    }
    
    const status = err.status || 500;
    
    if (status !== 404 || !req.path.includes('.')) {
        console.error(`❌ HTTP ${status} - ${err.message}: ${req.originalUrl}`);
    }

    res.status(status).json({
        success: false,
        message: err.message,
        error: NODE_ENV === 'production' ? {} : err
    });
});

// ========== STARTUP AND GRACEFUL SHUTDOWN ==========

const startServer = async () => {
    try {
        console.log('🚀 Starting server initialization...');
        
        // Initialize registration services
        initializeRegistrationServices();
        
        // Verify required tables exist
        try {
            console.log('🔍 Verifying database tables...');
            await dbPool.query(`
                CREATE TABLE IF NOT EXISTS otp_verifications (
                    email VARCHAR(255) PRIMARY KEY,
                    otp_code VARCHAR(6) NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    attempts INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('✅ OTP table verified/created');
            
            await dbPool.query(`
                CREATE TABLE IF NOT EXISTS email_logs (
                    id SERIAL PRIMARY KEY,
                    email_address VARCHAR(255) NOT NULL,
                    otp_code VARCHAR(6),
                    message_id VARCHAR(255),
                    email_type VARCHAR(50) NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    error_message TEXT,
                    sent_at TIMESTAMP DEFAULT NOW()
                )
            `);
            console.log('✅ Email logs table verified/created');
            
        } catch (dbError) {
            console.error('❌ Database table verification failed:', dbError);
        }

        server = app.listen(PORT, () => {
            console.log('🎉 ========== SERVER STARTED SUCCESSFULLY ==========');
            console.log(`🌐 Server running on port ${PORT} in **${NODE_ENV}** mode`);
            console.log(`🏠 Homepage: http://localhost:${PORT}/`);
            console.log(`🔧 Debug endpoints:`);
            console.log(`   - http://localhost:${PORT}/api/debug/db-status`);
            console.log(`   - http://localhost:${PORT}/api/debug/services`);
            console.log(`   - http://localhost:${PORT}/health`);
            console.log('================================================');
        });
        
    } catch (error) {
        console.error('💥 FATAL: Failed to start the server components. Exiting.', error);
        process.exit(1);
    }
};

const gracefulShutdown = () => {
    console.log('🛑 Received shutdown signal. Starting graceful shutdown...');

    server.close(async () => {
        console.log('✅ HTTP server closed.');

        try {
            await dbPool.end();
            console.log('✅ PostgreSQL pool closed.');
            console.log('✅ Application shutdown complete. Exiting.');
            process.exit(0);

        } catch (err) {
            console.error('❌ Error during component shutdown. Forcing exit:', err);
            process.exit(1);
        }
    });

    setTimeout(() => {
        console.error('⏰ Graceful shutdown timeout exceeded (10s). Forcing exit.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();

module.exports = app;