const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator'); // ** PRODUCTION FIX 1: Import Validator **
const ChiefWardenService = require('../services/ChiefWardenService');
const { authenticateToken, authorizeRole } = require('../security/middleware/auth');
const logger = require('../config/logger');

// --- Validation Chains for Chief Warden Routes ---

// Validation for UUID parameters (like userId)
const validateUserIdParam = [
    param('userId').exists().withMessage('User ID is required in the path.'),
    param('userId').isUUID().withMessage('User ID must be a valid UUID format.'),
];

// Validation for Hostel ID (assuming it is an integer or UUID based on schema, defaulting to UUID check)
const validateHostelIdParam = [
    param('hostelId').exists().withMessage('Hostel ID is required in the path.'),
    param('hostelId').isUUID().withMessage('Hostel ID must be a valid UUID format.'),
    // Note: If hostelId is an integer, change to .isInt().toInt()
];


// Middleware to check for validation errors and halt execution if present
const checkValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Chief Warden route validation failed:', errors.array());
        return res.status(422).json({ success: false, errors: errors.array() });
    }
    next();
};

// --- Middleware Applied to All Chief Warden Routes ---

// ** PRODUCTION FIX 2: Allow 'admin' role for system oversight **
router.use(authenticateToken, authorizeRole(['chief_warden', 'admin'])); 


/**
 * @route GET /api/chief-warden/pending-approvals
 * @description Retrieves a list of all student applications pending approval.
 * @access Private (Chief Warden / Admin)
 */
router.get('/pending-approvals', async (req, res) => {
    try {
        const applications = await ChiefWardenService.getPendingStudentApprovals();
        res.json({ success: true, applications });
    } catch (error) {
        logger.error('Error fetching pending approvals:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching applications.' });
    }
});

/**
 * @route POST /api/chief-warden/approve-student/:userId
 * @description Approves a student application, completing registration.
 * @access Private (Chief Warden / Admin)
 */
router.post('/approve-student/:userId', validateUserIdParam, checkValidation, async (req, res) => {
    const { userId } = req.params;
    
    try {
        // The service layer handles the core business logic (update user status, assign room, etc.)
        const result = await ChiefWardenService.approveStudent(userId);

        if (result.success) {
            res.json({ success: true, message: 'Student approved and registered successfully.' });
        } else {
            // Use 400 for a bad request/business logic failure (e.g., user not found)
            res.status(400).json(result); 
        }
    } catch (error) {
        logger.error(`Error approving student ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Internal server error during approval process.' });
    }
});


/**
 * @route GET /api/chief-warden/hostel-occupancy/:hostelId
 * @description Retrieves detailed occupancy report for a specific hostel.
 * @access Private (Chief Warden / Admin)
 */
router.get('/hostel-occupancy/:hostelId', validateHostelIdParam, checkValidation, async (req, res) => {
    const { hostelId } = req.params;
    
    try {
        const report = await ChiefWardenService.getHostelOccupancy(hostelId);
        
        // Use 404 if the report object explicitly indicates a missing hostel
        if (report && report.success === false && report.message.includes('not found')) {
            return res.status(404).json(report);
        }
        
        res.json({ success: true, report });
    } catch (error) {
        logger.error(`Error fetching occupancy for hostel ${hostelId}:`, error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching occupancy data.' });
    }
});


module.exports = router;