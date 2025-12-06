// File: api/authRoutes.js

const express = require('express');
const router = express.Router();
const CentralAuthService = require('../services/CentralAuthService');
const logger = require('../config/logger');
const { body, validationResult } = require('express-validator');
// CRITICAL FIX: MaintenanceMiddleware is NOT needed here. 
// The strict API blocking is now handled by the global maintenanceEnforcer in server.js.
// const MaintenanceMiddleware = require('../security/middleware/MaintenanceMiddleware');

// Validation middleware for login
const validateLogin = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 5, max: 50 }).withMessage('Username must be between 5 and 50 characters')
        .escape(), // Basic sanitization
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

/**
 * @route POST /api/auth/login
 * @description Authenticate user and return JWT token (with added validation)
 * @access Public
 */
router.post('/login', 
    // CRITICAL FIX: REMOVED MaintenanceMiddleware. 
    // This endpoint now relies on the maintenanceEnforcer in server.js
    // which blocks ALL non-exempt /api/ calls during maintenance with a 503, 
    // preventing any successful login or token issuance.
    validateLogin, 
    async (req, res) => {
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Validation failed for login attempt:', errors.array());
        return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        const authData = await CentralAuthService.authenticateUser(username, password);

        if (authData) {
            res.json({ 
                success: true, 
                token: authData.token, 
                role_id: authData.roleId, 
                message: 'Login successful.' 
            });
        } else {
            // Invalid credentials or account not found
            res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

    } catch (error) {
        logger.error(`Error during login for user ${username}:`, error);
        res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    }
});

/**
 * @route POST /api/auth/logout
 * @description Invalidate token (if session based) or just return success
 * @access Public
 */
router.post('/logout', (req, res) => {
    // In a JWT setup, client handles token deletion. 
    res.json({ success: true, message: 'Logout simulated successfully.' });
});

module.exports = router;