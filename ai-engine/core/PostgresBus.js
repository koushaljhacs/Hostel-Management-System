const { EventEmitter } = require('events');
const { dbPool } = require('../../config/database');

/**
 * PostgresBus
 * ===========
 * Lightweight wrapper around PostgreSQL LISTEN/NOTIFY so AI agents can exchange
 * events without Redis. Each instance maintains a dedicated LISTEN client while
 * publishing via the shared pool.
 */
class PostgresBus extends EventEmitter {
    constructor(options = {}) {
        super();
        this.dbPool = options.dbPool || dbPool;
        this.channelPrefix = options.channelPrefix || 'ai_engine';
        this.logger = options.logger || console;

        this.listenerClient = null;
        this.channels = new Set();
        this.ready = this._initializeListener();
    }

    /**
     * Initialize a dedicated LISTEN client.
     */
    async _initializeListener() {
        if (this.listenerClient) return;

        this.listenerClient = await this.dbPool.connect();

        this.listenerClient.on('error', (err) => {
            this.logger.error('🔥 [PostgresBus] Listener error:', err.message);
        });

        this.listenerClient.on('notification', (msg) => {
            if (!msg?.channel) return;
            let payload = msg.payload;
            try {
                payload = JSON.parse(msg.payload);
            } catch (err) {
                // payload is already a string
            }
            this.emit(msg.channel, payload);
        });

        this.logger.log('✅ [PostgresBus] Listener ready');
    }

    /**
     * Normalize channel names to satisfy PostgreSQL identifier rules.
     */
    _formatChannel(name) {
        const safeName = (name || '')
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_');
        return `${this.channelPrefix}_${safeName || 'generic'}`;
    }

    /**
     * Subscribe to a logical channel.
     */
    async subscribe(channelName, handler) {
        if (typeof handler !== 'function') {
            throw new Error('PostgresBus.subscribe requires a handler function');
        }

        await this.ready;
        const physicalChannel = this._formatChannel(channelName);

        if (!this.channels.has(physicalChannel)) {
            await this.listenerClient.query(`LISTEN ${physicalChannel}`);
            this.channels.add(physicalChannel);
            this.logger.log(`📡 [PostgresBus] Listening on ${physicalChannel}`);
        }

        this.on(physicalChannel, handler);
    }

    /**
     * Unsubscribe a handler from a channel.
     */
    async unsubscribe(channelName, handler) {
        const physicalChannel = this._formatChannel(channelName);
        this.off(physicalChannel, handler);
    }

    /**
     * Publish a JSON payload onto the bus.
     */
    async publish(channelName, payload) {
        const physicalChannel = this._formatChannel(channelName);
        const data = typeof payload === 'string' ? payload : JSON.stringify(payload || {});

        await this.dbPool.query('SELECT pg_notify($1::text, $2::text)', [
            physicalChannel,
            data
        ]);
    }

    /**
     * Helper used by AIMonitor to avoid crashing on bus errors.
     */
    async safePublish(channelName, payload) {
        try {
            await this.publish(channelName, payload);
        } catch (err) {
            this.logger.error(`⚠️ [PostgresBus] Failed to publish on ${channelName}: ${err.message}`);
        }
    }

    /**
     * Shutdown the listener (useful for tests).
     */
    async close() {
        if (this.listenerClient) {
            try {
                for (const channel of this.channels) {
                    await this.listenerClient.query(`UNLISTEN ${channel}`);
                }
            } finally {
                this.listenerClient.release();
                this.listenerClient = null;
                this.channels.clear();
            }
        }
    }
}

module.exports = PostgresBus;


