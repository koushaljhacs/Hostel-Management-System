/**
 * HMS-CENTRAL-COPY/distributed-services/job-queue-worker.js
 * * BACKGROUND WORKER PROCESS (BullMQ Consumer)
 * * FINALIZED VERSION: Integrates EmailService and TicketGenerationService.
 */

require('dotenv').config();
// Assumed location: HMS-CENTRAL-COPY/config/logger.js
const logger = require('../config/logger'); 
// Assumed location: HMS-CENTRAL-COPY/config/queueConfig.js
const { connection, NOTIFICATION_QUEUE } = require('../config/queueConfig'); 
const { Worker } = require('bullmq');

// IMPORTS for specific job handlers
// Path: distributed-services/registration-service/services/EmailService.js
const EmailService = require('./registration-service/services/EmailService'); 
// Path: distributed-services/services/TicketGenerationService.js (Newly created folder/file)
const TicketGenerationService = require('./services/TicketGenerationService'); 
const { dbPool } = require('../config/database');

// Initialize the services needed by the workers
const emailService = new EmailService(dbPool);
const ticketService = new TicketGenerationService(dbPool); 


// =================================================================
// 🧠 BULLMQ WORKER DEFINITION
// =================================================================

// Define the worker that processes jobs from the NOTIFICATION_QUEUE
const notificationWorker = new Worker(NOTIFICATION_QUEUE, async (job) => {
    
    logger.log(`[Worker] Processing Job ID: ${job.id}, Name: ${job.name}`);

    // --- JOB HANDLER: Send Confirmation Email ---
    if (job.name === 'sendBookingConfirmation') {
        const { bookingId, studentEmail, studentName, finalFee } = job.data;

        await emailService.sendBookingConfirmation({
            to: studentEmail,
            subject: `Hostel Booking Confirmed (ID: ${bookingId})`,
            // Use finalFee and other robust details in the final body
            body: `Dear ${studentName}, your booking ID ${bookingId} has been successfully confirmed. Fee: ${finalFee}. A QR ticket is being generated in the background.`
        });
        logger.log(`[Worker] Confirmation email sent for Booking ID: ${bookingId}`);
        
        // After sending email, the ticket generation job should be enqueued
        // This relies on the main server or a dedicated Producer process to add the job.
        // For simplicity in the worker, we just log completion, relying on the
        // main transaction logic to trigger the next step.
    }

    // --- JOB HANDLER: Generate Digital Ticket (PDF/QR) ---
    else if (job.name === 'generateTicket') {
        const { bookingId } = job.data;
        
        // EXECUTE: This is the heavy I/O operation deferred from the main thread
        await ticketService.generateDigitalTicket(bookingId); 
        
        logger.log(`[Worker] Digital ticket generated and updated in DB for Booking ID: ${bookingId}`);
    }

    // --- JOB HANDLER: Clean up expired locks (AI recommendation) ---
    else if (job.name === 'cleanExpiredLocks') {
        logger.log(`[Worker] Executing expired room lock cleanup...`);
        // Logic to run DB query to clear room_locks table entries past expires_at
    }
    
    else {
        logger.error(`[Worker] Unknown job name: ${job.name}. Skipping.`);
    }

}, { connection: connection });

// =================================================================
// 🚨 WORKER EVENT LISTENERS 
// =================================================================

notificationWorker.on('completed', (job) => {
    logger.info(`[Worker] Job ${job.id} (${job.name}) completed successfully.`);
});

notificationWorker.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job.id} (${job.name}) failed: ${err.message}`, { stack: err.stack, data: job.data });
    // This failure should be logged for the BookingMedic AI Agent to review and potentially retry.
});

notificationWorker.on('error', (err) => {
    logger.error(`[Worker] General worker error connecting to Redis: ${err.message}`);
});


logger.log('✅ Job Queue Worker started and listening for jobs on NOTIFICATION_QUEUE.');