/**
 * HMS-CENTRAL-COPY/real-time/DataSync.js
 * * Real-time Data Synchronization Engine - The "Distribution Network"
 * * Orchestrates data propagation using Queuing, PostgreSQL LISTEN/NOTIFY, and WebSockets.
 * * This ensures data synchronization across ALL database clusters simultaneously.
 */

const { STATE_CHANNEL } = require('../config/stateBus');
const logger = require('../config/logger');

class DataSync {
    constructor(dbPool, statePublisher, webSocketManager) {
        this.dbPool = dbPool; // Central Database Pool for logging
        this.statePublisher = statePublisher;
        this.webSocketManager = webSocketManager;
        this.syncQueue = []; // Queue for reliable event handling
        this.isProcessing = false;
    }

    /**
     * Notify all services about a data change (Pushes event to the queue)
     */
    async notifyDataChange(entityType, entityId, action, data, userId = null) {
        const changeEvent = {
            type: 'data_change',
            entityType,
            entityId,
            action,
            data,
            userId, // The user who performed the action (for audit)
            timestamp: new Date().toISOString()
        };

        // Add to sync queue
        this.syncQueue.push(changeEvent);

        // Process queue if not already processing (Ensures sequential processing)
        if (!this.isProcessing) {
            this.processSyncQueue();
        }
    }

    /**
     * Process sync queue (The core distribution logic)
     */
    async processSyncQueue() {
        if (this.isProcessing || this.syncQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.syncQueue.length > 0) {
            const event = this.syncQueue.shift();

            try {
                // 1. Publish to PostgreSQL-backed state bus (service-to-service communication)
                if (this.statePublisher && this.statePublisher.publish) {
                    await this.statePublisher.publish(
                        STATE_CHANNEL,
                        event
                    );
                }

                // 2. Broadcast via WebSocket (for admin dashboards and live clients)
                this.webSocketManager.broadcastDataChange(
                    event.entityType,
                    event.entityId,
                    event.action,
                    event.data
                );

                // 3. Log to database (Real-time audit logging)
                await this.logDataChange(event);

            } catch (err) {
                logger.error('DataSync error processing sync event', { error: err.message, stack: err.stack });
                // If a fatal error occurs (e.g., Redis fails), re-queue and break to retry later
                this.syncQueue.unshift(event);
                break;
            }
        }

        this.isProcessing = false;
    }

    /**
     * Log data change to the central data_sync_log table
     */
    async logDataChange(event) {
        try {
            const query = `
                INSERT INTO data_sync_log 
                (entity_type, entity_id, action, data, user_id, timestamp)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `;
            await this.dbPool.query(query, [
                event.entityType,
                event.entityId,
                event.action,
                JSON.stringify(event.data),
                event.userId
            ]);
        } catch (err) {
            // Log a warning if audit log fails, but don't stop core functionality
            logger.warn('Could not log data change to database. Audit trail temporarily unavailable.', { error: err.message });
        }
    }

    /**
     * Sync student registration (Specific utility method)
     */
    async syncStudentRegistration(studentId, studentData) {
        await this.notifyDataChange('student', studentId, 'created', studentData);
    }

    /**
     * Sync student approval (Specific utility method)
     */
    async syncStudentApproval(studentId, studentData) {
        await this.notifyDataChange('student', studentId, 'approved', studentData);
    }

    /**
     * Get sync status (for Admin Dashboard monitoring)
     */
    getSyncStatus() {
        return {
            queueLength: this.syncQueue.length,
            isProcessing: this.isProcessing,
            connectedClients: this.webSocketManager ? this.webSocketManager.getConnectedCount() : 0
        };
    }
}

module.exports = DataSync;
