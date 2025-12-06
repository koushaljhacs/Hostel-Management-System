/**
 * HOSTEL BOOKING MODULE - API ROUTES
 * Path: HMS-CENTRAL-COPY/hostel-booking/server/routes.js
 * * PRODUCTION READY VERSION: DEV MODE BYPASSES DELETED.
 */

const express = require('express');
const router = express.Router();
const { dbPool } = require('../../config/database'); 
const redisClient = require('../../config/redis'); 
const logger = require('../../config/logger');
const { authenticateToken } = require('../../security/middleware/auth');
const BookingGuard = require('../security/BookingGuard');
const BookingTransaction = require('../transactions/BookingTransaction');
const OTPService = require('../../distributed-services/registration-service/services/OTPService');
const PostgresBus = require('../../ai-engine/core/PostgresBus');

const otpService = new OTPService(dbPool);
const aiBus = new PostgresBus({ channelPrefix: 'ai_booking' });
const publishAiEvent = (channel, payload = {}) => {
    aiBus.safePublish(channel, {
        source: 'hostel-booking',
        timestamp: new Date().toISOString(),
        ...payload
    });
};

// Utility for fetching data and caching it
const crypto = require('crypto');

const CACHE_TTL_SECONDS = 15; // seconds
const OTP_TICKET_TTL_MS = 5 * 60 * 1000;
const verifiedOtpTickets = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [ticket, data] of verifiedOtpTickets.entries()) {
        if (data.expiresAt <= now) {
            verifiedOtpTickets.delete(ticket);
        }
    }
}, 60000).unref();

const setCacheValue = async (key, payload) => {
    try {
        await redisClient.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(payload));
    } catch (err) {
        logger.warn('Redis cache write skipped', { key, error: err.message });
    }
};

const getCacheValue = async (key) => {
    try {
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    } catch (err) {
        logger.warn('Redis cache read skipped', { key, error: err.message });
        return null;
    }
};

router.use(authenticateToken);

const getUserIdFromRequest = (req) => {
    if (!req.user || !req.user.id) {
        return null;
    }
    return parseInt(req.user.id, 10);
};

const fetchStudentByUserId = async (userId) => {
    const query = `
        SELECT 
            s.id,
            s.user_id,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.gender,
            s.email,
            s.status
        FROM students s
        WHERE s.user_id = $1
        LIMIT 1
    `;
    const result = await dbPool.query(query, [userId]);
    return result.rows[0];
};

// ============================================================================
// 1. GET FULL STUDENT PROFILE (PRODUCTION PATH ONLY)
// ============================================================================
// Apply the authentication middleware
router.get('/profile', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const profileQuery = `
            SELECT 
                s.id as student_id,
                s.first_name || ' ' || COALESCE(s.middle_name || ' ', '') || s.last_name as "fullName",
                s.university_roll_no as "rollNo",
                s.course || ' - ' || s.branch as "courseBranch",
                TO_CHAR(s.date_of_birth, 'DD Mon YYYY') as "dob",
                s.gender,
                COALESCE(s.guardian_name, 'Not Provided') as "guardianName",
                s.email,
                s.status,
                CASE WHEN s.status = 'active' THEN true ELSE false END as eligibility
            FROM students s
            WHERE s.user_id = $1
        `;
        const result = await dbPool.query(profileQuery, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ fullName: 'Profile Not Linked', status: 'Error', eligibility: false });
        }

        res.json(result.rows[0]);

    } catch (error) {
        logger.error("Profile Fetch Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const parseBooleanParam = (value) => {
    if (typeof value === 'undefined' || value === null) {
        return null;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    const normalized = value.toString().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
        return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
        return false;
    }
    return null;
};

router.get('/availability', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const seater = parseInt(req.query.seater, 10);
        if (!seater || Number.isNaN(seater)) {
            return res.status(400).json({ success: false, message: 'Parameter "seater" is required.' });
        }

        const isAC = parseBooleanParam(req.query.isAC);
        if (req.query.isAC && isAC === null) {
            return res.status(400).json({ success: false, message: 'Parameter "isAC" must be boolean.' });
        }

        let gender = req.query.gender;
        if (!gender) {
            const student = await fetchStudentByUserId(userId);
            if (!student) {
                return res.status(403).json({ success: false, message: 'Student profile not linked.' });
            }
            gender = student.gender || 'male';
        }

        const genderNormalized = gender.toString().toUpperCase();
        const cacheKey = `booking:availability:${genderNormalized}:${seater}:${isAC === null ? 'any' : isAC ? 'ac' : 'nonac'}`;
        const cached = await getCacheValue(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const availabilityQuery = `
            SELECT 
                h.hostel_id,
                h.hostel_name,
                h.hostel_code,
                h.gender_type,
                h.capacity,
                h.current_occupancy,
                COUNT(r.room_id) FILTER (WHERE r.status = 'available' AND r.available_beds > 0) AS rooms_available,
                COALESCE(SUM(CASE WHEN r.status = 'available' THEN r.available_beds ELSE 0 END), 0) AS beds_left,
                BOOL_OR(r.is_ac) AS ac_support
            FROM hostels h
            JOIN rooms r ON r.hostel_id = h.hostel_id
            WHERE h.status = 'active'
              AND h.gender_type = $1
              AND r.capacity = $2
              AND r.available_beds > 0
              AND r.status = 'available'
              AND ($3::BOOLEAN IS NULL OR r.is_ac = $3::BOOLEAN)
            GROUP BY h.hostel_id, h.hostel_name, h.hostel_code, h.gender_type, h.capacity, h.current_occupancy
            ORDER BY h.hostel_name;
        `;

        const { rows } = await dbPool.query(availabilityQuery, [genderNormalized, seater, isAC]);
        const payload = {
            success: true,
            filters: {
                gender: genderNormalized,
                seater,
                isAC
            },
            hostels: rows.map((row) => ({
                hostelId: row.hostel_id,
                hostelName: row.hostel_name,
                hostelCode: row.hostel_code,
                gender: row.gender_type,
                capacity: Number(row.capacity),
                currentOccupancy: Number(row.current_occupancy),
                roomsAvailable: Number(row.rooms_available),
                bedsLeft: Number(row.beds_left),
                acSupport: row.ac_support
            }))
        };

        await setCacheValue(cacheKey, payload);
        publishAiEvent('performance_events', {
            event: 'booking_availability_lookup',
            userId,
            filters: payload.filters,
            hostelsDiscovered: payload.hostels.length
        });
        res.json(payload);
    } catch (error) {
        logger.error('GET /availability error', { error: error.message });
        publishAiEvent('error_events', {
            event: 'booking_availability_failure',
            message: error.message,
            userId
        });
        res.status(500).json({ success: false, message: 'Failed to load availability.' });
    }
});

router.get('/hostels/:hostelId/rooms', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const hostelId = parseInt(req.params.hostelId, 10);
        if (!hostelId || Number.isNaN(hostelId)) {
            return res.status(400).json({ success: false, message: 'Invalid hostel identifier.' });
        }

        const seater = req.query.seater ? parseInt(req.query.seater, 10) : null;
        if (req.query.seater && (Number.isNaN(seater) || seater <= 0)) {
            return res.status(400).json({ success: false, message: 'Parameter "seater" must be numeric.' });
        }

        const isAC = parseBooleanParam(req.query.isAC);
        if (req.query.isAC && isAC === null) {
            return res.status(400).json({ success: false, message: 'Parameter "isAC" must be boolean.' });
        }

        const cacheKey = `booking:rooms:${hostelId}:${seater || 'any'}:${isAC === null ? 'any' : isAC ? 'ac' : 'nonac'}`;
        const cached = await getCacheValue(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const hostelInfoRes = await dbPool.query(
            'SELECT hostel_id, hostel_name, hostel_code FROM hostels WHERE hostel_id = $1',
            [hostelId]
        );
        if (hostelInfoRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Hostel not found.' });
        }

        const roomsQuery = `
            SELECT 
                room_id,
                room_number,
                floor_number,
                capacity,
                is_ac,
                available_beds,
                current_occupancy
            FROM rooms
            WHERE hostel_id = $1
              AND status = 'available'
              AND available_beds > 0
              AND ($2::INT IS NULL OR capacity = $2::INT)
              AND ($3::BOOLEAN IS NULL OR is_ac = $3::BOOLEAN)
            ORDER BY floor_number, room_number;
        `;

        const roomsResult = await dbPool.query(roomsQuery, [hostelId, seater, isAC]);
        const floors = roomsResult.rows.reduce((acc, room) => {
            const key = `Floor ${room.floor_number}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push({
                roomId: room.room_id,
                roomNumber: room.room_number,
                capacity: room.capacity,
                availableBeds: room.available_beds,
                isAC: room.is_ac,
                currentOccupancy: room.current_occupancy
            });
            return acc;
        }, {});

        const payload = {
            success: true,
            hostel: hostelInfoRes.rows[0],
            rooms: roomsResult.rows.map((room) => ({
                roomId: room.room_id,
                roomNumber: room.room_number,
                floorNumber: room.floor_number,
                capacity: room.capacity,
                availableBeds: room.available_beds,
                isAC: room.is_ac,
                currentOccupancy: room.current_occupancy
            })),
            floors
        };

        await setCacheValue(cacheKey, payload);
        publishAiEvent('user_behavior', {
            event: 'booking_rooms_loaded',
            userId,
            hostelId,
            rooms: payload.rooms.length
        });
        res.json(payload);
    } catch (error) {
        logger.error('GET /hostels/:hostelId/rooms error', { error: error.message });
        publishAiEvent('error_events', {
            event: 'booking_rooms_failure',
            message: error.message,
            userId,
            hostelId: req.params.hostelId
        });
        res.status(500).json({ success: false, message: 'Failed to load rooms.' });
    }
});

router.post('/otp/send', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const student = await fetchStudentByUserId(userId);
        if (!student || !student.email) {
            return res.status(400).json({ success: false, message: 'Student email not available.' });
        }

        await otpService.generateOTP(student.email);
        publishAiEvent('security_events', {
            event: 'booking_otp_sent',
            userId,
            channel: 'email'
        });
        res.json({ success: true, message: 'OTP sent to registered email.' });
    } catch (error) {
        logger.error('POST /otp/send error', { error: error.message });
        publishAiEvent('error_events', {
            event: 'booking_otp_send_failure',
            message: error.message,
            userId
        });
        res.status(500).json({ success: false, message: 'Unable to send OTP.' });
    }
});

router.post('/otp/verify', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const { otp } = req.body;
        if (!otp) {
            return res.status(400).json({ success: false, message: 'OTP code is required.' });
        }

        const student = await fetchStudentByUserId(userId);
        if (!student || !student.email) {
            return res.status(400).json({ success: false, message: 'Student email not available.' });
        }

        const verification = await otpService.validateOTP(student.email, otp);
        if (!verification.valid) {
            publishAiEvent('security_events', {
                event: 'booking_otp_invalid',
                userId,
                reason: verification.message || 'invalid_code'
            });
            return res.status(400).json({ success: false, message: verification.message || 'Invalid OTP.' });
        }

        const ticket = crypto.randomBytes(24).toString('hex');
        verifiedOtpTickets.set(ticket, {
            userId,
            expiresAt: Date.now() + OTP_TICKET_TTL_MS
        });

        publishAiEvent('security_events', {
            event: 'booking_otp_verified',
            userId
        });

        res.json({ success: true, ticket });
    } catch (error) {
        logger.error('POST /otp/verify error', { error: error.message });
        publishAiEvent('error_events', {
            event: 'booking_otp_verify_failure',
            message: error.message,
            userId
        });
        res.status(500).json({ success: false, message: 'Unable to verify OTP.' });
    }
});

// ============================================================================
// 3. BOOKING ENDPOINT (PRODUCTION PATH ONLY)
// ============================================================================
// Apply the authentication middleware
router.post('/book', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const student = await fetchStudentByUserId(userId);
        if (!student) {
            publishAiEvent('security_events', {
                event: 'booking_profile_missing',
                userId
            });
            return res.status(403).json({ success: false, message: 'Student profile not linked. Booking denied.' });
        }

        const { roomId, hostelId, amount, otpTicket } = req.body;
        if (!roomId || !hostelId) {
            return res.status(400).json({ success: false, message: 'Room and hostel are required.' });
        }

        const ticketData = otpTicket ? verifiedOtpTickets.get(otpTicket) : null;
        if (!ticketData || ticketData.userId !== userId || ticketData.expiresAt < Date.now()) {
            publishAiEvent('security_events', {
                event: 'booking_payment_ticket_expired',
                userId,
                hostelId,
                roomId
            });
            return res.status(400).json({ success: false, message: 'Payment authorization expired. Please verify OTP again.' });
        }
        verifiedOtpTickets.delete(otpTicket);

        // Security Checks
        const guardCheck = await BookingGuard.validateRequest(student.id);
        if (!guardCheck.allowed) {
            publishAiEvent('security_events', {
                event: 'booking_guard_rejection',
                userId,
                reason: guardCheck.reason
            });
            return res.status(400).json({ success: false, message: guardCheck.reason });
        }

        const roomGuard = await BookingGuard.validateRoom(roomId);
        if (!roomGuard.valid) {
            publishAiEvent('security_events', {
                event: 'booking_room_invalid',
                userId,
                roomId,
                reason: roomGuard.reason
            });
            return res.status(400).json({ success: false, message: roomGuard.reason });
        }

        const result = await BookingTransaction.execute(student.id, roomId, hostelId, amount);

        if (result.success) {
            publishAiEvent('user_behavior', {
                event: 'booking_confirmed',
                userId,
                studentId: student.id,
                hostelId,
                roomId,
                amount
            });
            res.json({ success: true, message: result.message, bookingId: result.bookingId, amount: result.amountCharged });
        } else {
            res.status(409).json({ success: false, message: result.message });
        }

    } catch (error) {
        logger.error("Booking Route Error:", error);
        publishAiEvent('error_events', {
            event: 'booking_finalization_error',
            message: error.message,
            userId: getUserIdFromRequest(req),
            roomId: req.body?.roomId,
            hostelId: req.body?.hostelId
        });
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

module.exports = router;