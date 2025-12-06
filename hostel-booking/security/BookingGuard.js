/**
 * BOOKING SECURITY GUARD
 * Path: HMS-CENTRAL-COPY/hostel-booking/security/BookingGuard.js
 * Purpose: Pre-transaction validation to prevent spam and illegal bookings.
 */

const { dbPool } = require('../../config/database');
const logger = require('../../config/logger');

class BookingGuard {
    
    // 1. Check if student already has a pending or approved booking
    static async validateRequest(studentId) {
        try {
            const query = `
                SELECT status 
                FROM bookings 
                WHERE student_id = $1 
                AND status IN ('pending', 'approved')
                LIMIT 1
            `;
            const result = await dbPool.query(query, [studentId]);
            
            if (result.rows.length > 0) {
                return { 
                    allowed: false, 
                    reason: "You already have an active booking. Please cancel it first." 
                };
            }
            
            return { allowed: true };
        } catch (error) {
            logger.error('BookingGuard error during student validation', { error: error.message, stack: error.stack, studentId });
            return { allowed: false, reason: "Security check failed." };
        }
    }

    // 2. Check if the specific room is valid (active and unlocked)
    static async validateRoom(roomId) {
        try {
            const query = `SELECT status, is_locked, available_beds FROM rooms WHERE room_id = $1`;
            const result = await dbPool.query(query, [roomId]);
            
            if (result.rows.length === 0) return { valid: false, reason: "Room does not exist." };
            
            const room = result.rows[0];
            if (room.status !== 'available') return { valid: false, reason: "Room is under maintenance." };
            if (room.is_locked) return { valid: false, reason: "Room is temporarily locked by admin." };
            if (room.available_beds <= 0) return { valid: false, reason: "Room is full." };
            
            return { valid: true };
        } catch (error) {
            logger.error('RoomGuard error during room validation', { error: error.message, stack: error.stack, roomId });
            return { valid: false, reason: "Room check failed." };
        }
    }
}

module.exports = BookingGuard;