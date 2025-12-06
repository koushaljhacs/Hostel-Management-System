const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const MaintenanceSystem = require('../security/middleware/MaintenanceSystem');
const logger = require('../config/logger');
const { authenticateToken, authorizeRole } = require('../security/middleware/auth');

/**
 * @route GET /api/maintenance/status
 * @description Get current maintenance status with real-time data
 * @access Public (Always accessible even during maintenance)
 */
router.get('/status', (req, res) => {
    try {
        const status = MaintenanceSystem.getRealTimeMaintenanceStatus();
        res.json(status);
    } catch (error) {
        logger.error('Maintenance status endpoint error', { error: error.message, stack: error.stack });
        res.status(500).json({
            maintenanceMode: false,
            error: 'Failed to get maintenance status'
        });
    }
});

/**
 * @route GET /api/maintenance/realtime
 * @description Get real-time clock and countdown data only
 * @access Public
 */
router.get('/realtime', (req, res) => {
    try {
        res.json({
            serverTime: MaintenanceSystem.getRunningServerTime(),
            remainingTime: MaintenanceSystem.getRemainingTime(),
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get real-time data' });
    }
});

/**
 * @route POST /api/maintenance/toggle
 * @description Toggle maintenance mode (Admin only)
 * @access Private
 */
router.post(
    '/toggle',
    authenticateToken,
    authorizeRole(['system_admin', 'admin']),
    body('state')
        .exists().withMessage('state is required')
        .isBoolean().withMessage('state must be a boolean')
        .toBoolean(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Maintenance toggle validation failed', { errors: errors.array(), userId: req.user?.id });
            return res.status(422).json({ success: false, errors: errors.array() });
        }

        const { state } = req.body;

        try {
            if (state === true) {
                await MaintenanceSystem.startMaintenance();
            } else {
                await MaintenanceSystem.endMaintenance();
            }

            res.json({
                success: true,
                maintenanceMode: MaintenanceSystem.maintenanceMode,
                message: `Maintenance mode ${state ? 'enabled' : 'disabled'}`
            });
        } catch (error) {
            logger.error('Failed to toggle maintenance mode', { error: error.message, stack: error.stack, userId: req.user?.id });
            res.status(500).json({
                success: false,
                message: 'Failed to update maintenance mode'
            });
        }
    }
);

module.exports = router;