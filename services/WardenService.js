/**
 * HMS-CENTRAL-COPY/services/WardenService.js
 * Warden & Hostel Ops Service
 * Handles hostel-scoped operations for wardens: roster visibility, room tracking,
 * booking lifecycle touchpoints, and maintenance readiness.
 */

class WardenService {
    constructor(dbPool, dataSync) {
        this.dbPool = dbPool;
        this.dataSync = dataSync;
    }

    /**
     * Resolve the hostel scope for the signed-in warden/hostel admin.
     * Falls back to database lookup if the JWT payload doesn't carry the assignment.
     */
    async resolveHostelScope(userContext) {
        if (!userContext) return null;
        if (userContext.assignedHostelId) {
            return userContext.assignedHostelId;
        }

        const result = await this.dbPool.query(
            'SELECT assigned_hostel_id FROM users WHERE user_id = $1',
            [userContext.userId]
        );

        return result.rows[0]?.assigned_hostel_id || null;
    }

    async getHostelOverview(hostelId) {
        const [hostelRes, bookingAgg, roomAgg] = await Promise.all([
            this.dbPool.query(
                `SELECT hostel_id, hostel_name, hostel_code, capacity, current_occupancy, status 
                 FROM hostels WHERE hostel_id = $1`,
                [hostelId]
            ),
            this.dbPool.query(
                `SELECT 
                    COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                    COUNT(*) FILTER (WHERE status = 'approved') AS approved,
                    COUNT(*) FILTER (WHERE status = 'checked_in') AS checked_in
                 FROM bookings
                 WHERE hostel_id = $1`,
                [hostelId]
            ),
            this.dbPool.query(
                `SELECT 
                    COUNT(*) AS rooms,
                    COUNT(*) FILTER (WHERE status = 'available') AS available,
                    COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance,
                    SUM(capacity) AS total_beds,
                    SUM(current_occupancy) AS occupied_beds
                 FROM rooms
                 WHERE hostel_id = $1`,
                [hostelId]
            )
        ]);

        const hostel = hostelRes.rows[0] || null;
        const bookingSummary = bookingAgg.rows[0] || {};
        const roomSummary = roomAgg.rows[0] || {};

        return {
            hostel,
            bookingSummary,
            roomSummary,
            occupancyRate: hostel && hostel.capacity > 0
                ? ((hostel.current_occupancy / hostel.capacity) * 100).toFixed(1)
                : '0.0'
        };
    }

    async getHostelStudents(hostelId) {
        const result = await this.dbPool.query(
            `SELECT 
                s.id, s.first_name, s.last_name, s.university_roll_no, s.email,
                b.booking_id, b.status AS booking_status, b.room_id,
                r.room_number, r.floor_number
             FROM students s
             JOIN bookings b ON s.id = b.student_id
             LEFT JOIN rooms r ON b.room_id = r.room_id
             WHERE b.hostel_id = $1
             ORDER BY s.first_name ASC`,
            [hostelId]
        );
        return result.rows;
    }

    async getRoomStatus(hostelId) {
        const result = await this.dbPool.query(
            `SELECT room_id, room_number, floor_number, capacity, current_occupancy, status, is_ac
             FROM rooms
             WHERE hostel_id = $1
             ORDER BY floor_number, room_number`,
            [hostelId]
        );
        return result.rows;
    }

    async updateRoomStatus(roomId, status, actorId) {
        const allowedStatuses = ['available', 'occupied', 'maintenance'];
        if (!allowedStatuses.includes(status)) {
            throw new Error('Invalid room status');
        }

        const result = await this.dbPool.query(
            `UPDATE rooms 
             SET status = $1, updated_at = NOW()
             WHERE room_id = $2
             RETURNING room_id, hostel_id, room_number, status`,
            [status, roomId]
        );

        const room = result.rows[0];
        if (!room) {
            throw new Error('Room not found');
        }

        if (this.dataSync) {
            await this.dataSync.notifyDataChange(
                'room',
                room.room_id,
                'status_changed',
                { status: room.status, roomNumber: room.room_number, hostelId: room.hostel_id },
                actorId
            );
        }

        return room;
    }

    async confirmCheckIn(bookingId, actorId, checkInDate = new Date()) {
        const result = await this.dbPool.query(
            `UPDATE bookings 
             SET status = 'checked_in',
                 check_in_date = COALESCE($2::date, NOW()),
                 approved_by = $3,
                 approved_at = NOW(),
                 updated_at = NOW()
             WHERE booking_id = $1
             RETURNING booking_id, student_id, hostel_id, room_id, status`,
            [bookingId, checkInDate, actorId]
        );

        const booking = result.rows[0];
        if (!booking) {
            throw new Error('Booking not found');
        }

        if (this.dataSync) {
            await this.dataSync.notifyDataChange(
                'booking',
                booking.booking_id,
                'checked_in',
                booking,
                actorId
            );
        }

        return booking;
    }
}

module.exports = WardenService;


