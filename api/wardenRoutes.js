/**
 * HMS-CENTRAL-COPY/api/wardenRoutes.js
 * Warden operations router – scoped to a single hostel assignment.
 */

const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

let wardenService = null;

function initializeWardenRoutes(serviceInstance) {
    wardenService = serviceInstance;
    logger.info('Warden Routes initialized');
}

async function ensureService(req, res, next) {
    if (!wardenService) {
        return res.status(503).json({ success: false, message: 'Warden service unavailable' });
    }

    next();
}

router.use(ensureService);

router.get('/hostel/overview', async (req, res) => {
    try {
        const hostelId = await wardenService.resolveHostelScope(req.user);
        if (!hostelId) {
            return res.status(403).json({ success: false, message: 'Hostel scope unavailable for this account' });
        }

        const overview = await wardenService.getHostelOverview(hostelId);
        res.json({ success: true, overview });
    } catch (error) {
        logger.error('Warden overview error', { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Failed to load hostel overview' });
    }
});

router.get('/hostel/students', async (req, res) => {
    try {
        const hostelId = await wardenService.resolveHostelScope(req.user);
        if (!hostelId) {
            return res.status(403).json({ success: false, message: 'Hostel scope unavailable for this account' });
        }

        const students = await wardenService.getHostelStudents(hostelId);
        res.json({ success: true, students });
    } catch (error) {
        logger.error('Warden students error', { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Failed to load students' });
    }
});

router.get('/hostel/rooms', async (req, res) => {
    try {
        const hostelId = await wardenService.resolveHostelScope(req.user);
        if (!hostelId) {
            return res.status(403).json({ success: false, message: 'Hostel scope unavailable for this account' });
        }

        const rooms = await wardenService.getRoomStatus(hostelId);
        res.json({ success: true, rooms });
    } catch (error) {
        logger.error('Warden rooms error', { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Failed to load rooms' });
    }
});

router.patch('/rooms/:roomId/status', async (req, res) => {
    const { roomId } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' });
    }

    try {
        const updatedRoom = await wardenService.updateRoomStatus(roomId, status, req.user?.userId);
        res.json({ success: true, room: updatedRoom });
    } catch (error) {
        logger.error('Room status update error', { error: error.message, stack: error.stack, roomId, status });
        res.status(500).json({ success: false, message: error.message || 'Failed to update room status' });
    }
});

router.post('/bookings/:bookingId/check-in', async (req, res) => {
    const { bookingId } = req.params;
    const { checkInDate } = req.body;

    try {
        const booking = await wardenService.confirmCheckIn(bookingId, req.user?.userId, checkInDate);
        res.json({ success: true, booking });
    } catch (error) {
        logger.error('Booking check-in error', { error: error.message, stack: error.stack, bookingId });
        res.status(500).json({ success: false, message: error.message || 'Failed to confirm check-in' });
    }
});

module.exports = { router, initializeWardenRoutes };



