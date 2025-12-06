/**
 * HMS-CENTRAL-COPY/distributed-services/services/TicketGenerationService.js
 * * ASYNCHRONOUS TICKET GENERATION & FINAL BOOKING UPDATE
 * * Location: distributed-services/services/TicketGenerationService.js
 */

const path = require('path');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const logger = require('../../config/logger'); // Adjusted path based on new structure

class TicketGenerationService {
    constructor(dbPool) {
        this.dbPool = dbPool;
        this.TICKET_FOLDER = path.join(process.cwd(), 'reports', 'tickets'); // Use 'reports' folder for output
        if (!fs.existsSync(this.TICKET_FOLDER)) {
            // Ensure the reports/tickets directory exists
            fs.mkdirSync(this.TICKET_FOLDER, { recursive: true });
        }
    }

    /**
     * Generates a digital ticket (PDF containing a QR code) and updates
     * the booking record with the ticket path. This is a HEAVY I/O task.
     * @param {number} bookingId - The ID of the confirmed booking.
     */
    async generateDigitalTicket(bookingId) {
        logger.log(`[TicketService] Starting generation for Booking ID: ${bookingId}`);

        try {
            // 1. Retrieve Booking Details (Simplified query)
            const query = `
                SELECT 
                    b.booking_id, 
                    s.first_name || ' ' || s.last_name as student_name,
                    h.hostel_code,
                    r.room_number
                FROM bookings b
                JOIN students s ON b.student_id = s.id
                JOIN rooms r ON b.room_id = r.room_id
                JOIN hostels h ON b.hostel_id = h.hostel_id
                WHERE b.booking_id = $1;
            `;
            const result = await this.dbPool.query(query, [bookingId]);
            // ... (Error handling for booking not found) ...
            const booking = result.rows[0];

            // 2. Generate QR Code
            const qrPayload = JSON.stringify({ id: booking.booking_id, user: booking.student_name });
            const qrCodePath = path.join(this.TICKET_FOLDER, `qr_${bookingId}.png`);
            await QRCode.toFile(qrCodePath, qrPayload);
            
            // 3. Generate PDF Ticket (Placeholder logic)
            const pdfPath = path.join(this.TICKET_FOLDER, `ticket_${bookingId}.pdf`);
            const doc = new PDFDocument();
            doc.pipe(fs.createWriteStream(pdfPath));
            doc.fontSize(20).text(`Booking: ${booking.booking_id}`, { align: 'center' });
            doc.image(qrCodePath, 100, 150, { width: 200 });
            doc.end();

            // 4. Update Database
            const updateQuery = `
                UPDATE bookings 
                SET transaction_status = 'TICKET_GENERATED', ticket_path = $2
                WHERE booking_id = $1;
            `;
            await this.dbPool.query(updateQuery, [bookingId, pdfPath]);

            logger.info(`[TicketService] Successfully generated and linked ticket for Booking ID: ${bookingId}`);
            fs.unlinkSync(qrCodePath); // Clean up temp QR code image

            return pdfPath;

        } catch (error) {
            logger.error(`[TicketService] Failed to generate ticket for ID ${bookingId}: ${error.message}`);
            throw error; 
        }
    }
}

module.exports = TicketGenerationService;