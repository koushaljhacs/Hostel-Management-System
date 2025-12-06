const BaseAgent = require('./BaseAgent');
const PostgresBus = require('../core/PostgresBus');
const { dbPool } = require('../../config/database');

class MentorAgent extends BaseAgent {
    constructor(options = {}) {
        super({
            name: 'MentorAgent',
            knowledgeFile: null,
            bus: options.bus || new PostgresBus({ channelPrefix: 'ai_mentor' }),
            logger: options.logger,
            heartbeatInterval: options.heartbeatInterval || 60000
        });

        this.db = options.db || dbPool;
        this.notificationTable = options.notificationTable || 'student_notifications';
        this.trustThreshold = options.trustThreshold || 30;
    }

    async start() {
        await this.bus.subscribe('trust_events', this._handleTrustEvent.bind(this));
        this.startHeartbeat();
        await this.notifyBus('agent_events', { agent: this.name, action: 'online' });
        this.log('MentorAgent monitoring student trust scores [TEST]');
    }

    async _handleTrustEvent(rawEvent) {
        const payload = typeof rawEvent === 'string' ? JSON.parse(rawEvent) : rawEvent;
        if (!payload || typeof payload !== 'object') return;

        const trustScore = Number(payload.trustScore ?? payload.score ?? NaN);
        const studentId = payload.studentId ?? payload.userId;

        if (Number.isNaN(trustScore) || studentId == null) {
            return;
        }

        if (trustScore < this.trustThreshold) {
            await this._issueWarning(studentId, trustScore);
        }
    }

    async _issueWarning(studentId, trustScore) {
        try {
            await this.db.query(
                `INSERT INTO ${this.notificationTable}
                    (student_id, type, message, metadata, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [
                    studentId,
                    'TRUST_WARNING',
                    'Your account has been flagged for low trust. Please contact administration immediately.',
                    JSON.stringify({ trustScore })
                ]
            );

            await this.notifyBus('agent_events', {
                agent: this.name,
                action: 'warning_issued',
                studentId,
                trustScore
            });

            this.log('Low-trust warning queued', { studentId, trustScore });
        } catch (error) {
            this.log('Failed to create trust warning notification', { error: error.message });
            await this.reportUnknown('mentor:notification_failure', { studentId, trustScore, error: error.message });
        }
    }
}

module.exports = MentorAgent;


