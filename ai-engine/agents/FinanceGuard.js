const path = require('path');
const BaseAgent = require('./BaseAgent');
const PostgresBus = require('../core/PostgresBus');
const { dbPool } = require('../../config/database');

class FinanceGuard extends BaseAgent {
    constructor(options = {}) {
        super({
            name: 'FinanceGuard',
            knowledgeFile: path.join(__dirname, '../knowledge-base/finance_patterns.json'),
            bus: options.bus || new PostgresBus({ channelPrefix: 'ai_finance' }),
            logger: options.logger,
            heartbeatInterval: options.heartbeatInterval || 60000
        });

        this.db = options.db || dbPool;
        this.bankClient = options.bankClient || new MockBankAPI();
        this.suspenseTable = options.suspenseTable || 'finance_suspense_ledger';
    }

    async start() {
        await this.bus.subscribe('payment_events', this._handlePaymentEvent.bind(this));
        this.startHeartbeat();
        await this.notifyBus('agent_events', { action: 'online', agent: this.name });
        this.log('FinanceGuard ready and awaiting payment signals [TEST]');
    }

    async _handlePaymentEvent(rawEvent) {
        let event = rawEvent;
        if (typeof rawEvent === 'string') {
            try {
                event = JSON.parse(rawEvent);
            } catch (error) {
                return this.log('Received invalid payment event payload', { rawEvent });
            }
        }

        if (!event || !event.type) return;
        const rule = this.findMatchingRule(event) || {};
        const signature = event.signature || `${event.type}:${event.transactionId || 'unknown'}`;

        switch (event.type) {
            case 'gateway_timeout':
            case 'money_deducted_no_confirmation':
                await this._handleTimeout(event, rule, signature);
                break;
            default:
                // Unhandled event type → send to learning system
                await this.reportUnknown(`finance:${event.type}`, event);
        }
    }

    async _handleTimeout(event, rule, signature) {
        try {
            const verified = await this._verifyWithBank(event);
            if (!verified) {
                return this.log('Bank rejected transaction verification', { transactionId: event.transactionId });
            }

            await this._createSuspenseEntry(event, rule);
            await this.notifyBus('agent_events', {
                action: 'suspense_created',
                agent: this.name,
                transactionId: event.transactionId,
                studentId: event.studentId
            });
        } catch (error) {
            this.log('Error while handling payment timeout', { error: error.message });
            await this.reportUnknown(`finance_error:${signature}`, { event, error: error.message });
        }
    }

    async _verifyWithBank(event) {
        try {
            const response = await this.bankClient.verifyTransaction({
                transactionId: event.transactionId,
                amount: event.amount,
                gateway: event.gateway
            });
            return response?.status === 'CONFIRMED';
        } catch (error) {
            this.log('Bank verification failed, defaulting to false', { error: error.message });
            return false;
        }
    }

    async _createSuspenseEntry(event, rule = {}) {
        const reason = rule.reason || 'AUTO_SUSPENSE_GATEWAY_ISSUE';
        try {
            await this.db.query(
                `INSERT INTO ${this.suspenseTable}
                    (transaction_id, student_id, amount, status, reason, metadata, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 ON CONFLICT (transaction_id) DO NOTHING`,
                [
                    event.transactionId,
                    event.studentId || null,
                    event.amount || 0,
                    'PENDING_VERIFICATION',
                    reason,
                    JSON.stringify(event)
                ]
            );

            this.log('Suspense ledger entry created', {
                transactionId: event.transactionId,
                studentId: event.studentId
            });
        } catch (error) {
            this.log('Failed to create suspense entry', { error: error.message });
            await this.reportUnknown('finance:suspense_insert_failure', { event, error: error.message });
        }
    }
}

/**
 * Lightweight mock to simulate bank verification when a real client is not provided.
 */
class MockBankAPI {
    async verifyTransaction(context) {
        // Emulate remote latency and deterministic outcome
        await new Promise((resolve) => setTimeout(resolve, 500));
        const seeded = (context.transactionId || '').length % 2 === 0;
        return { status: seeded ? 'CONFIRMED' : 'FAILED', reference: `mock-${Date.now()}` };
    }
}

module.exports = FinanceGuard;


