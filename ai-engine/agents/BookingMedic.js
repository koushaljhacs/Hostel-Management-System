const path = require('path');
const BaseAgent = require('./BaseAgent');
const PostgresBus = require('../core/PostgresBus');
const { dbPool } = require('../../config/database');

class BookingMedic extends BaseAgent {
    constructor(options = {}) {
        super({
            name: 'BookingMedic',
            knowledgeFile: path.join(__dirname, '../knowledge-base/booking_patterns.json'),
            bus: options.bus || new PostgresBus({ channelPrefix: 'ai_booking' }),
            logger: options.logger,
            heartbeatInterval: options.heartbeatInterval || 60000
        });

        this.db = options.db || dbPool;
    }

    async start() {
        await this.bus.subscribe('db_errors', this._handleDbEvent.bind(this));
        this.startHeartbeat();
        await this.notifyBus('agent_events', { action: 'online', agent: this.name });
        this.log('BookingMedic waiting for allocation conflicts [TEST]');
    }

    async _handleDbEvent(rawEvent) {
        let event = rawEvent;
        if (typeof rawEvent === 'string') {
            try {
                event = JSON.parse(rawEvent);
            } catch (error) {
                return this.log('Invalid DB event payload', { rawEvent });
            }
        }

        if (!event || !event.code) return;

        const rule = this.findMatchingRule({ error: event.detail || event.message }) || {};
        if (event.code === '23505' && /rooms|room_id/i.test(event.detail || '')) {
            await this._resolveRoomCollision(event, rule);
        } else {
            await this.reportUnknown(`booking:${event.code}`, event);
        }
    }

    async _resolveRoomCollision(event, rule = {}) {
        const bookingId = event.bookingId;
        const conflictedRoomId = event.roomId;
        if (!bookingId || !conflictedRoomId) {
            this.log('Missing bookingId or roomId in collision event');
            return this.reportUnknown('booking:missing_context', event);
        }

        try {
            const { rows: currentRows } = await this.db.query(
                `SELECT b.id, b.student_id, b.hostel_id, b.room_id, r.room_number, r.hostel_id as room_hostel
                 FROM bookings b
                 JOIN rooms r ON r.room_id = b.room_id
                 WHERE b.id = $1`,
                [bookingId]
            );

            if (!currentRows.length) {
                this.log('Booking not found while processing collision', { bookingId });
                return;
            }

            const current = currentRows[0];
            const nextRoom = await this._findNextRoom(current.room_hostel, current.room_number, rule);
            if (!nextRoom) {
                this.log('No spare rooms available for collision resolution', { bookingId });
                return;
            }

            await this.db.query('BEGIN');
            await this.db.query(
                `UPDATE rooms SET status = 'occupied', updated_at = NOW() WHERE room_id = $1`,
                [nextRoom.room_id]
            );
            await this.db.query(
                `UPDATE rooms SET status = 'available', updated_at = NOW() WHERE room_id = $1`,
                [conflictedRoomId]
            );
            await this.db.query(
                `UPDATE bookings
                 SET room_id = $1,
                     notes = COALESCE(notes, '') || '\n[AutoFix] Moved due to collision',
                     updated_at = NOW()
                 WHERE id = $2`,
                [nextRoom.room_id, bookingId]
            );
            await this.db.query('COMMIT');

            await this.notifyBus('agent_events', {
                action: 'booking_reassigned',
                agent: this.name,
                bookingId,
                newRoomId: nextRoom.room_id,
                reason: rule.resolution || 'auto_reassign'
            });

            this.log('Booking collision resolved via auto-assignment', {
                bookingId,
                newRoom: nextRoom.room_number
            });
        } catch (error) {
            await this.db.query('ROLLBACK');
            this.log('Failed to resolve booking collision', { error: error.message });
            await this.reportUnknown('booking:resolution_failure', { event, error: error.message });
        }
    }

    async _findNextRoom(hostelId, currentRoomNumber, rule) {
        const direction = rule.direction || 'up';
        const order = direction === 'down' ? 'DESC' : 'ASC';
        const comparator = direction === 'down' ? '<' : '>';

        const { rows } = await this.db.query(
            `
            SELECT room_id, room_number, floor_number
            FROM rooms
            WHERE hostel_id = $1
              AND status = 'available'
              AND room_number ${comparator} $2
            ORDER BY room_number ${order}
            LIMIT 1
            `,
            [hostelId, currentRoomNumber]
        );

        if (rows.length) return rows[0];

        // Fallback: any other available room
        const fallback = await this.db.query(
            `SELECT room_id, room_number, floor_number
             FROM rooms
             WHERE hostel_id = $1
               AND status = 'available'
             ORDER BY room_number ASC
             LIMIT 1`,
            [hostelId]
        );

        return fallback.rows[0] || null;
    }
}

module.exports = BookingMedic;


