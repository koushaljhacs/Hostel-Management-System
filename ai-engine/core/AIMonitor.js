const PostgresBus = require('./PostgresBus');

/**
 * AIMonitor
 * =========
 * Higher-order function that wraps any critical AI routine with
 * - Telemetry logging (duration, status)
 * - Automatic error reporting via the Postgres event bus
 *
 * @param {string} agentName - Name of the agent/function owner
 * @param {Function} fn - The async function to wrap
 * @param {object} options
 * @param {PostgresBus} [options.bus] - Custom bus instance
 * @param {Console} [options.logger] - Custom logger
 * @returns {Function}
 */
function AIMonitor(agentName, fn, options = {}) {
    if (typeof fn !== 'function') {
        throw new Error('AIMonitor expects a function to wrap.');
    }

    const bus = options.bus || new PostgresBus({ channelPrefix: 'ai_monitor' });
    const logger = options.logger || console;

    return async function monitoredFunction(...args) {
        const startedAt = Date.now();
        try {
            const result = await fn.apply(this, args);

            await bus.safePublish('telemetry', {
                agent: agentName,
                status: 'success',
                durationMs: Date.now() - startedAt,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            logger.error(`⚠️ [${agentName}] AIMonitor captured error:`, error.message);

            await bus.safePublish('telemetry', {
                agent: agentName,
                status: 'error',
                durationMs: Date.now() - startedAt,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    };
}

module.exports = AIMonitor;


