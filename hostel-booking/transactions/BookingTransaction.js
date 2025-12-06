const { dbPool } = require('../../config/database');
const logger = require('../../config/logger');

class BookingTransaction {
    /**
     * Finalises a hostel booking with proper row-level locking.
     * @param {number} studentId
     * @param {number} hostelId
     * @param {number} roomId
     * @param {number} amount
     * @returns {Promise<{success: boolean, bookingId?: number, message?: string}>}
     */
    static async execute(studentId, hostelId, roomId, amount = null) {
        const client = await dbPool.connect();

        try {
            await client.query('BEGIN');

            const roomResult = await client.query(
                `
                SELECT room_id, hostel_id, available_beds, current_occupancy, status, capacity
                FROM rooms
                WHERE room_id = $1
                FOR UPDATE
                `,
                [roomId]
            );

            if (roomResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Selected room does not exist anymore.' };
            }

            const room = roomResult.rows[0];

            if (room.hostel_id !== hostelId) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Room no longer belongs to the selected hostel.' };
            }

            if (room.status !== 'available' || room.available_beds <= 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Room is no longer available. Please refresh availability.' };
            }

            await client.query(
                `
                UPDATE rooms
                SET 
                    available_beds = available_beds - 1,
                    current_occupancy = current_occupancy + 1,
                    status = CASE WHEN available_beds - 1 <= 0 THEN 'full' ELSE 'available' END,
                    updated_at = NOW()
                WHERE room_id = $1
                `,
                [roomId]
            );

            await client.query(
                `
                UPDATE hostels
                SET 
                    current_occupancy = LEAST(capacity, current_occupancy + 1),
                    updated_at = NOW()
                WHERE hostel_id = $1
                `,
                [hostelId]
            );

            const bookingResult = await client.query(
                `
                INSERT INTO bookings (
                    student_id, hostel_id, room_id, booking_date, status, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, CURRENT_DATE, 'confirmed', NOW(), NOW()
                )
                RETURNING booking_id
                `,
                [studentId, hostelId, roomId]
            );

            await client.query('COMMIT');

            return {
                success: true,
                bookingId: bookingResult.rows[0]?.booking_id,
                message: 'Booking confirmed successfully.',
                amountCharged: amount
            };
        } catch (error) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                logger.error('Rollback failed during booking transaction', rollbackError);
            }

            logger.error('Booking transaction failed', { error: error.message, studentId, roomId, hostelId });
            return { success: false, message: 'Booking failed due to an internal error.' };
        } finally {
            client.release();
        }
    }
}

module.exports = BookingTransaction;