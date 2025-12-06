/**
 * HMS-CENTRAL-COPY/config/stateBus.js
 * Zero-cost State Bus built on PostgreSQL LISTEN/NOTIFY + in-memory dispatch.
 * Replaces external Redis dependency while preserving the same interface.
 * Consumed by: server.js, real-time/DataSync.js
 */
const { EventEmitter } = require('events');
const logger = require('./logger');

const CHANNEL_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const normalizeChannelName = (name) => {
    const trimmed = (name || '').trim();
    if (!CHANNEL_REGEX.test(trimmed)) {
        throw new Error('Invalid state bus channel name. Use letters, numbers, and underscores only.');
    }
    return trimmed.toLowerCase();
};

const STATE_CHANNEL = normalizeChannelName(process.env.STATE_BUS_CHANNEL || 'hms_data_changes');

let sharedPool = null;
let listenerClient = null;
let initialized = false;
const emitter = new EventEmitter();
const listenedChannels = new Set();

const ensureListener = async (channel) => {
    if (!listenerClient) return;
    if (listenedChannels.has(channel)) return;
    await listenerClient.query(`LISTEN ${channel}`);
    listenedChannels.add(channel);
};

/**
 * Initialize the PostgreSQL-backed state bus.
 * @param {Pool} dbPool - Shared PostgreSQL connection pool.
 */
const initStateBus = async (dbPool) => {
    if (initialized) {
        return true;
    }

    if (!dbPool) {
        throw new Error('State bus initialization requires an active PostgreSQL pool');
    }

    sharedPool = dbPool;
    listenerClient = await sharedPool.connect();

    listenerClient.on('error', (err) => {
        logger.error('State bus listener error', { error: err.message, stack: err.stack });
    });

    listenerClient.on('notification', (msg) => {
        if (!msg?.channel) return;
        emitter.emit(msg.channel, msg.payload);
    });

    await ensureListener(STATE_CHANNEL);

    initialized = true;
    logger.info('State bus online via PostgreSQL LISTEN/NOTIFY (Redis-free)');
    return true;
};

/**
 * Publish helper that fans out to PostgreSQL and local listeners.
 */
const publish = async (channel = STATE_CHANNEL, message) => {
    if (!sharedPool) {
        throw new Error('State bus not initialized');
    }

    const safeChannel = normalizeChannelName(channel);
    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    // 1. Notify via PostgreSQL for distributed listeners (if any)
    await sharedPool.query('SELECT pg_notify($1::text::name, $2::text)', [safeChannel, payload]);

    // 2. Immediate local fan-out (covers in-memory only scenarios)
    emitter.emit(safeChannel, payload);
};

const getPublisher = () => {
    if (!initialized) return null;
    return {
        publish: async (channel = STATE_CHANNEL, message) => publish(channel, message)
    };
};

const getSubscriber = () => {
    if (!initialized) return null;
    return {
        subscribe: async (channel = STATE_CHANNEL, callback) => {
            const safeChannel = normalizeChannelName(channel);
            await ensureListener(safeChannel);
            const handler = (payload) => callback(payload, safeChannel);
            emitter.on(safeChannel, handler);
            return () => emitter.off(safeChannel, handler);
        },
        unsubscribe: async (channel, callback) => {
            const safeChannel = normalizeChannelName(channel || STATE_CHANNEL);
            emitter.off(safeChannel, callback);
        }
    };
};

const getClient = () => {
    if (!initialized) return null;
    return {
        status: 'connected',
        channels: emitter.eventNames().length
    };
};

module.exports = {
    initStateBus,
    getClient,
    getPublisher,
    getSubscriber,
    STATE_CHANNEL
};

