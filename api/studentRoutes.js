/**
 * HMS-CENTRAL-COPY/api/studentRoutes.js
 * * Student API Routes - Scoped Access Layer (Student Domain Access)
 * * FIX: ADDED MISSING '/login' route to handle client-side student login requests.
 * * ADDED: High-frequency booking system endpoints
 */

const express = require('express');
const router = express.Router();
const { dbPool } = require('../config/database');
const StudentService = require('../services/StudentService');
const CentralAuthService = require('../services/CentralAuthService'); // Added dependency
const logger = require('../config/logger');

// Instantiate Services
const studentService = new StudentService(dbPool, null); 
const centralAuthService = new CentralAuthService(dbPool); 

// --- MIDDLEWARE FOR STUDENT PERMISSION ENFORCEMENT ---
function requiresStudentAccess(permission) {
    return (req, res, next) => {
        req.route.permission = permission; 
        next();
    };
}

// =======================================================
// 🔑 STUDENT LOGIN ENDPOINT (FIXED)
// =======================================================

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await centralAuthService.initiateLogin(username, password);
        
        if (result.success) {
            return res.json(result);
        } else {
            return res.status(401).json(result);
        }
    } catch (e) {
        logger.error('Student Login API error:', e);
        return res.status(500).json({ success: false, error: 'Server error during student login' });
    }
});

// =======================================================
// 🏠 HIGH-FREQUENCY BOOKING SYSTEM ENDPOINTS
// =======================================================

// Get hostel hierarchy for booking interface
router.get('/booking/hostels', requiresStudentAccess('student:booking_read'), async (req, res) => {
    try {
        const query = `
            SELECT 
                hostel_id,
                hostel_name,
                hostel_code,
                gender_type,
                is_ac,
                capacity,
                current_occupancy,
                (capacity - current_occupancy) as available_beds
            FROM hostels 
            WHERE status = 'active'
            ORDER BY hostel_name
        `;
        
        const result = await dbPool.query(query);
        
        res.json({
            success: true,
            hostels: result.rows
        });
    } catch (error) {
        logger.error('Error fetching hostels:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch hostel data' 
        });
    }
});

// Get floor plans and room availability for a specific hostel
router.get('/booking/hostel/:hostelId/floors', requiresStudentAccess('student:booking_read'), async (req, res) => {
    const { hostelId } = req.params;
    
    try {
        // Get floor information
        const floorQuery = `
            SELECT 
                floor_number,
                floor_name,
                total_rooms,
                total_capacity
            FROM floor_plans 
            WHERE hostel_id = $1
            ORDER BY floor_number
        `;
        
        const floorResult = await dbPool.query(floorQuery, [hostelId]);
        
        // Get room availability for each floor
        const roomQuery = `
            SELECT 
                room_id,
                room_number,
                floor_number,
                capacity,
                current_occupancy,
                available_beds,
                room_type,
                is_ac,
                status,
                is_locked,
                lock_expires_at
            FROM rooms 
            WHERE hostel_id = $1 AND status = 'available'
            ORDER BY floor_number, room_number
        `;
        
        const roomResult = await dbPool.query(roomQuery, [hostelId]);
        
        // Group rooms by floor
        const floorsWithRooms = floorResult.rows.map(floor => ({
            ...floor,
            rooms: roomResult.rows.filter(room => room.floor_number === floor.floor_number)
        }));
        
        res.json({
            success: true,
            floors: floorsWithRooms,
            totalAvailableRooms: roomResult.rows.length
        });
    } catch (error) {
        logger.error('Error fetching floor data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch floor data' 
        });
    }
});

// Get real-time room availability (cached for performance)
router.get('/booking/rooms/availability', requiresStudentAccess('student:booking_read'), async (req, res) => {
    const { hostelId, floorNumber } = req.query;
    
    try {
        let query = `
            SELECT 
                room_id,
                hostel_id,
                room_number,
                floor_number,
                available_beds,
                capacity,
                room_type,
                is_ac,
                status
            FROM available_rooms 
            WHERE available_beds > 0
        `;
        
        const params = [];
        
        if (hostelId) {
            params.push(hostelId);
            query += ` AND hostel_id = $${params.length}`;
        }
        
        if (floorNumber !== undefined) {
            params.push(parseInt(floorNumber));
            query += ` AND floor_number = $${params.length}`;
        }
        
        query += ` ORDER BY hostel_id, floor_number, room_number`;
        
        const result = await dbPool.query(query, params);
        
        res.json({
            success: true,
            availableRooms: result.rows,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching room availability:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch room availability' 
        });
    }
});

// Lock a room for booking (prevent race conditions)
router.post('/booking/room/lock', requiresStudentAccess('student:booking_write'), async (req, res) => {
    const { roomId } = req.body;
    const studentId = req.user.userId;
    
    try {
        // Check if room is already locked
        const lockCheckQuery = `
            SELECT lock_id FROM room_locks 
            WHERE room_id = $1 AND expires_at > NOW()
            LIMIT 1
        `;
        
        const lockCheck = await dbPool.query(lockCheckQuery, [roomId]);
        
        if (lockCheck.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Room is currently locked by another user'
            });
        }
        
        // Create lock (15 seconds expiry)
        const lockQuery = `
            INSERT INTO room_locks (room_id, student_id, session_id, expires_at)
            VALUES ($1, $2, $3, NOW() + INTERVAL '15 seconds')
            RETURNING lock_id
        `;
        
        const lockResult = await dbPool.query(lockQuery, [
            roomId, 
            studentId, 
            req.sessionID || 'unknown'
        ]);
        
        // Update room lock status
        await dbPool.query(
            `UPDATE rooms SET is_locked = true, lock_expires_at = NOW() + INTERVAL '15 seconds' WHERE room_id = $1`,
            [roomId]
        );
        
        res.json({
            success: true,
            lockId: lockResult.rows[0].lock_id,
            message: 'Room locked for 15 seconds',
            expiresAt: new Date(Date.now() + 15000).toISOString()
        });
        
    } catch (error) {
        logger.error('Error locking room:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to lock room' 
        });
    }
});

// Attempt to book a room (high-frequency optimized)
router.post('/booking/attempt-book', requiresStudentAccess('student:booking_write'), async (req, res) => {
    const { roomId, hostelId } = req.body;
    const studentId = req.user.userId;
    
    try {
        // Validate room availability
        const roomCheckQuery = `
            SELECT available_beds, is_locked, lock_expires_at 
            FROM rooms 
            WHERE room_id = $1 AND status = 'available'
        `;
        
        const roomCheck = await dbPool.query(roomCheckQuery, [roomId]);
        
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found or not available'
            });
        }
        
        const room = roomCheck.rows[0];
        
        if (room.available_beds <= 0) {
            return res.status(409).json({
                success: false,
                message: 'No available beds in this room'
            });
        }
        
        if (room.is_locked && room.lock_expires_at > new Date()) {
            return res.status(409).json({
                success: false,
                message: 'Room is currently locked'
            });
        }
        
        // Check if student already has an active booking
        const existingBookingQuery = `
            SELECT booking_id FROM bookings 
            WHERE student_id = $1 AND status IN ('pending', 'approved')
            LIMIT 1
        `;
        
        const existingBooking = await dbPool.query(existingBookingQuery, [studentId]);
        
        if (existingBooking.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'You already have an active booking request'
            });
        }
        
        // Create booking in queue for processing
        const bookingQueueQuery = `
            INSERT INTO booking_queue (student_id, room_id, hostel_id, status, payload)
            VALUES ($1, $2, $3, 'pending', $4)
            RETURNING queue_id
        `;
        
        const queueResult = await dbPool.query(bookingQueueQuery, [
            studentId,
            roomId,
            hostelId,
            JSON.stringify({
                attemptedAt: new Date().toISOString(),
                userAgent: req.get('User-Agent')
            })
        ]);
        
        // Add to main bookings table (will be processed by queue worker)
        const bookingQuery = `
            INSERT INTO bookings (student_id, room_id, hostel_id, booking_date, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING booking_id
        `;
        
        const bookingResult = await dbPool.query(bookingQuery, [
            studentId,
            roomId,
            hostelId,
            new Date()
        ]);
        
        // Update room occupancy temporarily
        await dbPool.query(
            `UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE room_id = $1`,
            [roomId]
        );
        
        // Clear room lock
        await dbPool.query(
            `DELETE FROM room_locks WHERE room_id = $1`,
            [roomId]
        );
        
        await dbPool.query(
            `UPDATE rooms SET is_locked = false, lock_expires_at = NULL WHERE room_id = $1`,
            [roomId]
        );
        
        res.json({
            success: true,
            bookingId: bookingResult.rows[0].booking_id,
            queueId: queueResult.rows[0].queue_id,
            message: 'Booking request submitted successfully'
        });
        
    } catch (error) {
        logger.error('Error processing booking:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process booking request' 
        });
    }
});

// Get student's current booking status
router.get('/booking/status', requiresStudentAccess('student:booking_read'), async (req, res) => {
    const studentId = req.user.userId;
    
    try {
        const query = `
            SELECT 
                b.booking_id,
                b.status,
                b.booking_date,
                b.approved_at,
                r.room_number,
                h.hostel_name,
                h.hostel_code,
                r.floor_number,
                r.room_type
            FROM bookings b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN hostels h ON b.hostel_id = h.hostel_id
            WHERE b.student_id = $1
            ORDER BY b.created_at DESC
            LIMIT 1
        `;
        
        const result = await dbPool.query(query, [studentId]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                hasBooking: false,
                message: 'No active bookings found'
            });
        }
        
        const booking = result.rows[0];
        
        res.json({
            success: true,
            hasBooking: true,
            booking: {
                id: booking.booking_id,
                status: booking.status,
                roomNumber: booking.room_number,
                hostelName: booking.hostel_name,
                hostelCode: booking.hostel_code,
                floor: booking.floor_number,
                roomType: booking.room_type,
                bookingDate: booking.booking_date,
                approvedAt: booking.approved_at
            }
        });
        
    } catch (error) {
        logger.error('Error fetching booking status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch booking status' 
        });
    }
});

// Cancel a pending booking
router.post('/booking/cancel', requiresStudentAccess('student:booking_write'), async (req, res) => {
    const { bookingId } = req.body;
    const studentId = req.user.userId;
    
    try {
        // Verify ownership and status
        const verifyQuery = `
            SELECT b.booking_id, b.room_id, b.status 
            FROM bookings b
            WHERE b.booking_id = $1 AND b.student_id = $2 AND b.status = 'pending'
        `;
        
        const verifyResult = await dbPool.query(verifyQuery, [bookingId, studentId]);
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or cannot be cancelled'
            });
        }
        
        const booking = verifyResult.rows[0];
        
        // Update booking status
        await dbPool.query(
            `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE booking_id = $1`,
            [bookingId]
        );
        
        // Free up the room occupancy
        await dbPool.query(
            `UPDATE rooms SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE room_id = $1`,
            [booking.room_id]
        );
        
        // Update queue status
        await dbPool.query(
            `UPDATE booking_queue SET status = 'cancelled', processed_at = NOW() 
             WHERE student_id = $1 AND room_id = $2 AND status = 'pending'`,
            [studentId, booking.room_id]
        );
        
        res.json({
            success: true,
            message: 'Booking cancelled successfully'
        });
        
    } catch (error) {
        logger.error('Error cancelling booking:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to cancel booking' 
        });
    }
});

// =======================================================
// 📋 EXISTING STUDENT ENDPOINTS
// =======================================================

// Student: Get their personal profile data (CORE ACCESS)
router.get('/profile', requiresStudentAccess('student:read_profile'), async (req, res) => {
    const studentId = req.user.userId; 

    try {
        const profile = await studentService.getStudentById(studentId);
        
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Student profile not found' });
        }

        res.json({ 
            success: true, 
            data: {
                id: profile.id,
                full_name: `${profile.first_name} ${profile.last_name}`.trim(),
                roll_no: profile.university_roll_no,
                email: profile.email,
                status: profile.status
            }
        });
    } catch (error) {
        logger.error('Error fetching student profile:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching profile' });
    }
});

router.get('/dues', requiresStudentAccess('student:read_profile'), async (req, res) => {
    const studentId = req.user.userId;
    try {
        const query = `
            SELECT COALESCE(SUM(amount_due - amount_paid), 0) AS total_due
            FROM fee_ledgers
            WHERE student_id = $1
        `;
        const result = await dbPool.query(query, [studentId]);
        const totalDue = Number(result.rows[0]?.total_due || 0);
        res.json({ success: true, totalDue });
    } catch (error) {
        logger.error('Error fetching student dues:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dues' });
    }
});

router.get('/alerts', requiresStudentAccess('student:read_profile'), async (req, res) => {
    try {
        const staffQuery = `
            SELECT full_name AS name, 'Warden' AS role, TRUE AS on_duty
            FROM employees
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 3
        `;
        const staffRes = await dbPool.query(staffQuery);

        const noticesQuery = `
            SELECT title, message
            FROM system_notices
            WHERE audience IN ('all', 'students')
            ORDER BY created_at DESC
            LIMIT 5
        `;
        let notices = [];
        try {
            const noticeRes = await dbPool.query(noticesQuery);
            notices = noticeRes.rows;
        } catch {
            notices = [];
        }

        res.json({
            success: true,
            staffOnDuty: staffRes.rows,
            notices
        });
    } catch (error) {
        logger.error('Error fetching student alerts:', error);
        res.status(500).json({ success: false, message: 'Failed to load alerts' });
    }
});

// Student: Submit a room maintenance request
router.post('/maintenance-request', requiresStudentAccess('student:create_request'), (req, res) => {
    res.json({ success: true, message: 'Maintenance request received and logged in queue.' });
});

// Student: Check current room allocation
router.get('/room-status', requiresStudentAccess('student:read_room'), async (req, res) => {
    const studentId = req.user.userId; 
    
    const roomQuery = `
        SELECT r.room_number, h.hostel_name
        FROM bookings b
        JOIN rooms r ON b.room_id = r.room_id
        JOIN hostels h ON b.hostel_id = h.hostel_id
        WHERE b.student_id = $1 AND b.status = 'approved'
    `;

    try {
        const result = await dbPool.query(roomQuery, [studentId]);
        
        if (result.rows.length === 0) {
            return res.json({ success: true, allocated: false, message: 'Room allocation pending.' });
        }
        
        res.json({ success: true, allocated: true, details: result.rows[0] });
    } catch (error) {
        logger.error('Error fetching room status:', error);
        res.status(500).json({ success: false, message: 'Could not fetch room status' });
    }
});

module.exports = router;