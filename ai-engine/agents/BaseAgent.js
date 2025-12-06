const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

/**
 * BaseAgent
 * =========
 * Shared foundation for all AI worker agents. Handles:
 * - Loading/saving knowledge bases (JSON)
 * - Emitting telemetry via the Postgres bus
 * - Basic lifecycle hooks
 */
class BaseAgent extends EventEmitter {
    constructor(config = {}) {
        super();
        this.name = config.name || 'UnnamedAgent';
        this.logger = config.logger || console;
        this.bus = config.bus;
        this.knowledgeFile = config.knowledgeFile || null;
        this.heartbeatInterval = config.heartbeatInterval || 60000;
        this._heartbeatTimer = null;
        this.knowledge = [];

        if (this.knowledgeFile) {
            this._loadKnowledge();
        }
    }

    /**
     * Convenience accessor for human-friendly logging.
     */
    log(message, meta = {}) {
        this.logger.log(`[${this.name}] ${message}`, Object.keys(meta).length ? meta : '');
    }

    /**
     * Read the agent’s knowledge base from disk.
     */
    _loadKnowledge() {
        try {
            const raw = fs.readFileSync(this.knowledgeFile, 'utf8');
            this.knowledge = JSON.parse(raw);
        } catch (error) {
            this.logger.warn(`[${this.name}] Unable to load knowledge base (${this.knowledgeFile}): ${error.message}`);
            this.knowledge = [];
        }
    }

    /**
    * Persist updated knowledge to disk.
    */
    _saveKnowledge() {
        if (!this.knowledgeFile) return;
        try {
            fs.writeFileSync(this.knowledgeFile, JSON.stringify(this.knowledge, null, 2));
        } catch (error) {
            this.logger.error(`[${this.name}] Failed to save knowledge base: ${error.message}`);
        }
    }

    /**
     * Append a new rule to the knowledge base.
     */
    learn(rule) {
        if (!rule) return;
        this.knowledge.push(rule);
        this._saveKnowledge();
        this.log('Learned new pattern', { rule });
    }

    /**
     * Attempt to find a matching rule for the supplied payload.
     */
    findMatchingRule(payload = {}) {
        return this.knowledge.find((rule) => {
            if (!rule || typeof rule !== 'object') return false;
            if (rule.pattern) {
                try {
                    const regex = new RegExp(rule.pattern, rule.flags || 'i');
                    return regex.test(JSON.stringify(payload));
                } catch (error) {
                    this.logger.error(`[${this.name}] Invalid regex in knowledge base: ${error.message}`);
                    return false;
                }
            }
            if (rule.field && rule.value) {
                return payload[rule.field] === rule.value;
            }
            return false;
        });
    }

    /**
     * Helper for broadcasting events to the central bus.
     */
    async notifyBus(event, data) {
        if (!this.bus || typeof this.bus.publish !== 'function') return;
        await this.bus.safePublish(event, {
            agent: this.name,
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Report a previously unknown issue to the LearningCore via the bus.
     */
    async reportUnknown(signature, payload = {}) {
        this.log('Captured unknown pattern, forwarding to LearningCore', { signature });
        if (!this.bus) return;
        await this.bus.safePublish('learning_unknown', {
            agent: this.name,
            signature,
            payload,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Begin emitting heartbeat events so MasterOverseer can monitor liveness.
     */
    startHeartbeat(intervalMs) {
        const interval = intervalMs || this.heartbeatInterval;
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
        }
        this._heartbeatTimer = setInterval(() => {
            const payload = { status: 'alive', timestamp: new Date().toISOString() };
            this.emit('heartbeat', payload);
            this.notifyBus('agent_heartbeat', payload);
        }, interval);
    }

    /**
     * Stop heartbeat timer (called during shutdown or restart).
     */
    stopHeartbeat() {
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }

    /**
     * Optional teardown hook for subclasses.
     */
    async shutdown() {
        this.stopHeartbeat();
    }

    /**
     * Subclasses must override with their main loop / handler.
     */
    // eslint-disable-next-line class-methods-use-this
    async start() {
        throw new Error('start() must be implemented by subclasses');
    }
}

module.exports = BaseAgent;

