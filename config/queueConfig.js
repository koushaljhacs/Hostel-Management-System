// ... existing content in config/queueConfig.js (assuming BullMQ-like syntax)

const logger = require('./logger');
const SecureBackup = require('../security/SecureBackup');

// ** PRODUCTION FIX: Define a Queue for Scheduled Jobs **
// Assuming 'schedulerQueue' is an existing instance or needs to be created.
// We'll define the job details here.

const BACKUP_JOB_ID = 'daily-secure-backup-report';
const ADMIN_REPORT_EMAIL = process.env.ADMIN_REPORT_EMAIL || 'admin@hms.com'; // **CRITICAL: Load Admin email securely**

/**
 * Schedules the daily backup job to run at 10:00 AM every day.
 * This function should be called once on server startup.
 * @param {object} schedulerQueueInstance - The queue instance capable of scheduling.
 */
const scheduleDailyJobs = (schedulerQueueInstance) => {
    // Cron schedule for 10:00 AM (0 10 * * *)
    const cronSchedule = '0 10 * * *'; 

    try {
        schedulerQueueInstance.add(
            BACKUP_JOB_ID,
            { recipient: ADMIN_REPORT_EMAIL }, // Job data
            {
                jobId: BACKUP_JOB_ID,
                repeat: { cron: cronSchedule }, // Set cron schedule
                removeOnComplete: true,
                removeOnFail: false
            }
        );
        logger.info(`Scheduled Daily Backup Job to run at 10:00 AM daily. Recipient: ${ADMIN_REPORT_EMAIL}`);

        // Add other critical daily/hourly jobs here...

    } catch (error) {
        logger.error('Failed to schedule daily jobs:', error);
    }
};

// ... existing module exports ...
module.exports = {
    // ... existing exports
    scheduleDailyJobs,
    BACKUP_JOB_ID,
    // ...
};