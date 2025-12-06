/**
 * HMS-CENTRAL-COPY/real-time/WebSocketManager.js
 * * Real-time Communication Manager for Central Command Server.
 * * Manages WebSocket connections for real-time data synchronization 
 * * between the central server, distributed services, and dual-admin clients.
 * * This fulfills the requirement for: WebSocket connections for real-time updates.
 * * 
 * * UPDATES:
 * * 1. ADDED: Real-time booking system events and channels
 * * 2. ADDED: Room locking/unlocking broadcasts
 * * 3. ADDED: Booking queue status updates
 * * 4. ADDED: Room availability real-time sync
 * * 5. ADDED: Student-specific booking notifications
 */

const logger = require('../config/logger');

class WebSocketManager {
    constructor(server, options = {}) {
        this.server = server;
        this.wss = null;
        // clientId -> { ws, userId, service, subscriptions, ip }
        this.clients = new Map(); 
        // channel -> Set of clientIds (e.g., 'entity:student', 'entity:booking:123', 'action:created')
        this.channels = new Map(); 
        this.authProvider = options.authProvider || null;
    }

    /**
     * Initialize WebSocket server
     */
    initialize() {
        // Dynamically require 'ws' package (from package.json)
        const WebSocket = require('ws'); 
        this.wss = new WebSocket.Server({ 
            server: this.server,
            path: '/ws' // Dedicated WebSocket path
        });

        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        logger.info('✅ WebSocket server initialized on /ws (Real-Time Sync Ready)');
    }

    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws, req) {
        const clientId = this.generateClientId();
        const client = {
            id: clientId,
            ws,
            userId: null,      // Authenticated user ID
            roleId: null,      // User role/access level (for permission scoping)
            service: null,     // Microservice name (e.g., 'admin-service')
            scope: null,       // Security scope (hostel, campus, etc.)
            subscriptions: new Set(),
            connectedAt: new Date(),
            ip: req.socket.remoteAddress
        };

        this.clients.set(clientId, client);

        ws.on('message', (message) => {
            this.handleMessage(clientId, message);
        });

        ws.on('close', () => {
            this.handleDisconnection(clientId);
        });

        ws.on('error', (error) => {
            logger.error(`🔥 WebSocket error for client ${clientId}:`, error);
        });

        // Send welcome message
        this.sendToClient(clientId, {
            type: 'connected',
            clientId,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle WebSocket message
     */
    async handleMessage(clientId, message) {
        try {
            const data = JSON.parse(message.toString());
            const client = this.clients.get(clientId);

            if (!client) return;

            switch (data.type) {
                case 'authenticate':
                    await this.authenticateClient(clientId, data.token); // Expect JWT token
                    break;
                case 'subscribe':
                    this.subscribeToChannel(clientId, data.channel);
                    break;
                case 'unsubscribe':
                    this.unsubscribeFromChannel(clientId, data.channel);
                    break;
                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
                    break;
                // =================================================================
                // 🎯 BOOKING-SPECIFIC MESSAGE HANDLERS
                // =================================================================
                case 'subscribe_booking_updates':
                    this.subscribeToBookingUpdates(clientId, data.hostelId, data.floorNumber);
                    break;
                case 'subscribe_room_status':
                    this.subscribeToRoomStatus(clientId, data.roomId);
                    break;
                case 'subscribe_student_booking':
                    if (client.userId) {
                        this.subscribeToChannel(clientId, `student:booking:${client.userId}`);
                    }
                    break;
                default:
                    logger.warn(`⚠️ Unknown message type from ${clientId}: ${data.type}`);
            }
        } catch (err) {
            logger.error(`🔥 Error handling message from ${clientId}:`, err);
        }
    }

    /**
     * Authenticate WebSocket client using JWT
     * NOTE: This relies on CentralAuthService.verifyToken being available
     */
    async authenticateClient(clientId, token) {
        const client = this.clients.get(clientId);
        if (!client) {
            return;
        }

        if (!token) {
            this.sendToClient(clientId, { type: 'auth_failed', message: 'Missing token' });
            client.ws.close(1008, 'Policy Violation: Missing Auth Token');
            return;
        }

        if (!this.authProvider) {
            logger.warn('⚠️ WebSocket auth provider not configured');
            this.sendToClient(clientId, { type: 'auth_failed', message: 'Authentication unavailable' });
            client.ws.close(1011, 'Auth Service Unavailable');
            return;
        }

        const authService = this.authProvider();
        if (!authService || typeof authService.verifyToken !== 'function') {
            logger.warn('⚠️ Invalid auth service supplied to WebSocketManager');
            this.sendToClient(clientId, { type: 'auth_failed', message: 'Authentication unavailable' });
            client.ws.close(1011, 'Auth Service Invalid');
            return;
        }

        let decoded = null;
        try {
            decoded = await authService.verifyToken(token);
        } catch (err) {
            logger.error('🔥 WebSocket token verification error:', err);
        }

        if (decoded) {
            client.userId = decoded.userId;
            client.roleId = decoded.roleId; 
            client.service = decoded.service;
            client.scope = decoded.scope;
            
            // Auto-subscribe to their user-specific channel
            this.subscribeToChannel(clientId, `user:${decoded.userId}`);

            this.sendToClient(clientId, {
                type: 'authenticated',
                userId: client.userId,
                roleId: client.roleId,
                service: client.service,
                scope: client.scope,
                timestamp: new Date().toISOString()
            });
        } else {
            this.sendToClient(clientId, { type: 'auth_failed', message: 'Invalid or expired token' });
            client.ws.close(1008, 'Policy Violation: Invalid Auth Token');
        }
    }

    /**
     * Subscribe client to a channel
     */
    subscribeToChannel(clientId, channel) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.subscriptions.add(channel);

        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
        }
        this.channels.get(channel).add(clientId);
    }

    /**
     * Unsubscribe client from a channel
     */
    unsubscribeFromChannel(clientId, channel) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.subscriptions.delete(channel);

        if (this.channels.has(channel)) {
            this.channels.get(channel).delete(clientId);
        }
    }

    /**
     * Handle client disconnection
     */
    handleDisconnection(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Remove from all subscribed channels
        client.subscriptions.forEach(channel => {
            if (this.channels.has(channel)) {
                this.channels.get(channel).delete(clientId);
                // Clean up empty channels
                if (this.channels.get(channel).size === 0) {
                    this.channels.delete(channel);
                }
            }
        });

        this.clients.delete(clientId);
        // logger.info(`🔌 Client ${clientId} disconnected`);
    }

    // =================================================================
    // 🎯 BOOKING-SPECIFIC REAL-TIME FUNCTIONS
    // =================================================================

    /**
     * Subscribe client to booking updates for specific hostel/floor
     */
    subscribeToBookingUpdates(clientId, hostelId, floorNumber = null) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Subscribe to general booking updates
        this.subscribeToChannel(clientId, 'booking:updates');
        
        // Subscribe to hostel-specific updates
        if (hostelId) {
            this.subscribeToChannel(clientId, `booking:hostel:${hostelId}`);
        }
        
        // Subscribe to floor-specific updates
        if (floorNumber !== null && hostelId) {
            this.subscribeToChannel(clientId, `booking:hostel:${hostelId}:floor:${floorNumber}`);
        }

        logger.info(`📊 Client ${clientId} subscribed to booking updates for hostel ${hostelId}, floor ${floorNumber}`);
    }

    /**
     * Subscribe client to specific room status updates
     */
    subscribeToRoomStatus(clientId, roomId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        this.subscribeToChannel(clientId, `room:status:${roomId}`);
        logger.info(`🔍 Client ${clientId} subscribed to room ${roomId} status updates`);
    }

    /**
     * Broadcast room lock status change
     */
    broadcastRoomLock(roomId, hostelId, floorNumber, studentId, isLocked, expiresAt = null) {
        const message = {
            type: 'room_lock_changed',
            roomId,
            hostelId,
            floorNumber,
            studentId,
            isLocked,
            expiresAt,
            timestamp: new Date().toISOString()
        };

        let totalSent = 0;
        
        // Broadcast to room-specific channel
        totalSent += this.broadcastToChannel(`room:status:${roomId}`, message);
        
        // Broadcast to hostel and floor channels
        totalSent += this.broadcastToChannel(`booking:hostel:${hostelId}`, message);
        totalSent += this.broadcastToChannel(`booking:hostel:${hostelId}:floor:${floorNumber}`, message);
        
        // Broadcast to general booking updates
        totalSent += this.broadcastToChannel('booking:updates', message);

        logger.info(`🔒 Room ${roomId} ${isLocked ? 'locked' : 'unlocked'} - Sent to ${totalSent} clients`);
        return totalSent;
    }

    /**
     * Broadcast room availability change
     */
    broadcastRoomAvailability(roomId, hostelId, floorNumber, availableBeds, totalCapacity) {
        const message = {
            type: 'room_availability_changed',
            roomId,
            hostelId,
            floorNumber,
            availableBeds,
            totalCapacity,
            timestamp: new Date().toISOString()
        };

        let totalSent = 0;
        
        // Broadcast to room-specific channel
        totalSent += this.broadcastToChannel(`room:status:${roomId}`, message);
        
        // Broadcast to hostel and floor channels
        totalSent += this.broadcastToChannel(`booking:hostel:${hostelId}`, message);
        totalSent += this.broadcastToChannel(`booking:hostel:${hostelId}:floor:${floorNumber}`, message);
        
        // Broadcast to general booking updates
        totalSent += this.broadcastToChannel('booking:updates', message);

        logger.info(`🔄 Room ${roomId} availability updated - ${availableBeds}/${totalCapacity} beds available`);
        return totalSent;
    }

    /**
     * Broadcast booking status change
     */
    broadcastBookingStatus(bookingId, studentId, roomId, status, message = '') {
        const bookingMessage = {
            type: 'booking_status_changed',
            bookingId,
            studentId,
            roomId,
            status, // 'pending', 'processing', 'approved', 'failed', 'cancelled'
            message,
            timestamp: new Date().toISOString()
        };

        let totalSent = 0;
        
        // Broadcast to student-specific channel
        totalSent += this.broadcastToChannel(`student:booking:${studentId}`, bookingMessage);
        
        // Broadcast to general booking updates
        totalSent += this.broadcastToChannel('booking:updates', bookingMessage);
        
        // Broadcast to room-specific channel
        totalSent += this.broadcastToChannel(`room:status:${roomId}`, bookingMessage);

        logger.info(`📝 Booking ${bookingId} status: ${status} - Sent to ${totalSent} clients`);
        return totalSent;
    }

    /**
     * Broadcast booking queue update
     */
    broadcastQueueUpdate(queueId, studentId, status, position = null, totalInQueue = null) {
        const message = {
            type: 'booking_queue_update',
            queueId,
            studentId,
            status, // 'queued', 'processing', 'completed', 'failed'
            position,
            totalInQueue,
            timestamp: new Date().toISOString()
        };

        let totalSent = 0;
        
        // Broadcast to student-specific channel
        totalSent += this.broadcastToChannel(`student:booking:${studentId}`, message);
        
        // Broadcast to general booking updates
        totalSent += this.broadcastToChannel('booking:updates', message);

        logger.info(`📊 Queue ${queueId} status: ${status} - position ${position}`);
        return totalSent;
    }

    /**
     * Broadcast real-time occupancy update for a hostel/floor
     */
    broadcastOccupancyUpdate(hostelId, floorNumber, totalRooms, availableRooms, occupancyRate) {
        const message = {
            type: 'occupancy_update',
            hostelId,
            floorNumber,
            totalRooms,
            availableRooms,
            occupancyRate,
            timestamp: new Date().toISOString()
        };

        let totalSent = 0;
        
        // Broadcast to hostel and floor channels
        totalSent += this.broadcastToChannel(`booking:hostel:${hostelId}`, message);
        if (floorNumber !== null) {
            totalSent += this.broadcastToChannel(`booking:hostel:${hostelId}:floor:${floorNumber}`, message);
        }
        
        // Broadcast to general booking updates
        totalSent += this.broadcastToChannel('booking:updates', message);

        logger.info(`🏢 Hostel ${hostelId} occupancy: ${occupancyRate}% - ${availableRooms}/${totalRooms} rooms available`);
        return totalSent;
    }

    // =================================================================
    // 🎯 EXISTING BROADCAST FUNCTIONS (Enhanced for booking system)
    // =================================================================

    /**
     * Broadcast data change to relevant channels
     * @param {string} entityType - e.g., 'student', 'booking'
     * @param {string|number} entityId - Primary key of the changed entity
     * @param {string} action - e.g., 'created', 'updated', 'approved'
     * @param {object} data - The changed entity data
     * @param {string} scope - Optional scope filter (e.g., 'hostel:H1')
     */
    broadcastDataChange(entityType, entityId, action, data, scope = null) {
        const channels = [
            `entity:${entityType}`,              // General entity updates (e.g., IT Admin monitoring)
            `entity:${entityType}:${entityId}`,  // Specific entity updates
            `action:${action}`                   // Action monitoring
        ];
        
        // Add scope channel if provided (Hostel Admin boundaries)
        if (scope) {
            channels.push(`scope:${scope}`);
        }

        // Add booking-specific channels for booking entities
        if (entityType === 'booking') {
            channels.push('booking:updates');
            if (data.student_id) {
                channels.push(`student:booking:${data.student_id}`);
            }
            if (data.room_id) {
                channels.push(`room:status:${data.room_id}`);
            }
        }

        // Add room-specific channels for room entities
        if (entityType === 'room') {
            channels.push('booking:updates');
            if (data.hostel_id) {
                channels.push(`booking:hostel:${data.hostel_id}`);
                if (data.floor_number !== undefined) {
                    channels.push(`booking:hostel:${data.hostel_id}:floor:${data.floor_number}`);
                }
            }
        }

        const message = {
            type: 'data_change',
            entityType,
            entityId,
            action,
            data,
            scope,
            timestamp: new Date().toISOString()
        };

        let totalSent = 0;
        channels.forEach(channel => {
            totalSent += this.broadcastToChannel(channel, message);
        });

        return totalSent;
    }

    broadcastSwarmEvent(event) {
        const message = {
            type: 'SWARM_EVENT',
            agent: event.agent,
            action: event.action,
            status: event.status || 'online',
            message: event.message,
            timestamp: event.timestamp || new Date().toISOString()
        };
        this.broadcastToChannel('swarm', message);
        this.broadcastRaw(message);
    }

    broadcastSecurityAlert(alert) {
        const message = {
            type: 'FIREWALL_ALERT',
            severity: alert.severity || 'HIGH',
            ip: alert.ip,
            reason: alert.reason,
            timestamp: alert.timestamp || new Date().toISOString()
        };
        this.broadcastToChannel('swarm', message);
        this.broadcastRaw(message);
    }

    broadcastLog(type, logMessage) {
        const message = {
            type: 'LOG_MESSAGE',
            logType: type,
            message: logMessage,
            timestamp: new Date().toISOString()
        };
        this.broadcastToChannel('console', message);
    }

    broadcastRaw(message) {
        let sent = 0;
        for (const [clientId] of this.clients) {
            if (this.sendToClient(clientId, message)) {
                sent++;
            }
        }
        return sent;
    }

    /**
     * Broadcast message to all clients in a channel
     */
    broadcastToChannel(channel, message) {
        if (!this.channels.has(channel)) {
            return 0;
        }

        const clientIds = this.channels.get(channel);
        let sentCount = 0;

        clientIds.forEach(clientId => {
            if (this.sendToClient(clientId, message)) {
                sentCount++;
            }
        });

        return sentCount;
    }

    /**
     * Send message to specific client
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== 1) { // 1 = OPEN
            return false;
        }

        try {
            client.ws.send(JSON.stringify(message));
            return true;
        } catch (err) {
            logger.error(`🔥 Error sending to client ${clientId}:`, err);
            return false;
        }
    }

    /**
     * Get connected clients count
     */
    getConnectedCount() {
        return this.clients.size;
    }

    /**
     * Generate unique client ID
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    }

    /**
     * Get subscription statistics for monitoring
     */
    getSubscriptionStats() {
        const stats = {
            totalClients: this.clients.size,
            totalChannels: this.channels.size,
            bookingSubscriptions: 0,
            roomSubscriptions: 0,
            studentSubscriptions: 0
        };

        // Count booking-related subscriptions
        for (const [channel, clients] of this.channels) {
            if (channel.startsWith('booking:')) {
                stats.bookingSubscriptions += clients.size;
            } else if (channel.startsWith('room:status:')) {
                stats.roomSubscriptions += clients.size;
            } else if (channel.startsWith('student:booking:')) {
                stats.studentSubscriptions += clients.size;
            }
        }

        return stats;
    }
}

module.exports = WebSocketManager;