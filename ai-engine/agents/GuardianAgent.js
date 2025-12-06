const BaseAgent = require('./BaseAgent');
const PostgresBus = require('../core/PostgresBus');
const { dbPool } = require('../../config/database');

class GuardianAgent extends BaseAgent {
    constructor(options = {}) {
        super({
            name: 'GuardianAgent',
            knowledgeFile: null,
            bus: options.bus || new PostgresBus({ channelPrefix: 'ai_guardian' }),
            logger: options.logger,
            heartbeatInterval: options.heartbeatInterval || 60000
        });

        this.db = options.db || dbPool;
        this.incidentsTable = options.incidentsTable || 'warden_incidents';
    }

    async start() {
        await this.bus.subscribe('warden_metrics', this._handleMetrics.bind(this));
        this.startHeartbeat();
        await this.notifyBus('agent_events', { agent: this.name, action: 'online' });
        this.log('GuardianAgent watching mess/attendance parity [TEST]');
    }

    async _handleMetrics(rawPayload) {
        const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
        if (!payload || typeof payload !== 'object') return;

        const attendance = Number(payload.attendanceCount ?? payload.attendance ?? 0);
        const messUsage = Number(payload.messUsage ?? 0);
        if (attendance === 0 && messUsage > 0) {
            await this._logSuspiciousProxy(payload);
        }
    }

    async _logSuspiciousProxy(context) {
        const incident = {
            studentId: context.studentId || null,
            period: context.period || 'daily',
            attendance: Number(context.attendanceCount ?? 0),
            messUsage: Number(context.messUsage ?? 0)
        };

        try {
            await this.db.query(
                `INSERT INTO ${this.incidentsTable}
                    (student_id, incident_type, details, created_at)
                 VALUES ($1, $2, $3, NOW())`,
                [
                    incident.studentId,
                    'SUSPICIOUS_PROXY',
                    JSON.stringify(incident)
                ]
            );

            await this.notifyBus('agent_events', {
                agent: this.name,
                action: 'incident_logged',
                incident
            });

            this.log('Suspicious proxy recorded', incident);
        } catch (error) {
            this.log('Failed to log suspicious proxy. Sending to LearningCore.', { error: error.message });
            await this.reportUnknown('guardian:incident_failure', { incident, error: error.message });
        }
    }
}

module.exports = GuardianAgent;


