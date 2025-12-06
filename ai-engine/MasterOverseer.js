/**
 * HMS-CENTRAL-COPY/ai-engine/MasterOverseer.js
 * * FIXED: Added getServerMetrics() using native 'os' module for dashboard reporting.
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const os = require('os'); // <--- NEW: Import OS module

const PostgresBus = require('./core/PostgresBus');
const AIMonitor = require('./core/AIMonitor');
const LearningCore = require('./core/LearningCore');

const TrafficPilot = require('./agents/TrafficPilot');
const FinanceGuard = require('./agents/FinanceGuard');
const BookingMedic = require('./agents/BookingMedic');
const SystemMechanic = require('./agents/SystemMechanic');
const GuardianAgent = require('./agents/GuardianAgent');
const MentorAgent = require('./agents/MentorAgent');

class MasterOverseer {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.bus = options.bus || new PostgresBus({ channelPrefix: 'ai_master' });
        this.socketManager = options.socketManager || null;
        this.learningCore = new LearningCore({ logger: this.logger });
        this.reportDir = options.reportDir || path.join(__dirname, '../reports');
        this.healthMap = new Map();
        this.agents = new Map();
        this.agentBlueprints = [
            { name: 'TrafficPilot', ClassRef: TrafficPilot, options: { bus: this.bus } },
            { name: 'FinanceGuard', ClassRef: FinanceGuard, options: { bus: this.bus } },
            { name: 'BookingMedic', ClassRef: BookingMedic, options: { bus: this.bus } },
            { name: 'SystemMechanic', ClassRef: SystemMechanic, options: { bus: this.bus } },
            { name: 'GuardianAgent', ClassRef: GuardianAgent, options: { bus: this.bus } },
            { name: 'MentorAgent', ClassRef: MentorAgent, options: { bus: this.bus } }
        ];
        this.dailyIncidents = [];
        this.lastLearningRun = null;
        this.pendingApprovals = new Map();

        fs.mkdirSync(this.reportDir, { recursive: true });
        this.transporter = this._initMailer();
    }
    
    // === NEW METHOD: SERVER METRICS (FIXES SERVER LOAD) ===
    getServerMetrics() {
        const loadAvg = os.loadavg();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        
        // Calculate CPU usage percentage (a simple approximation for dashboard)
        const cpuUsage = (loadAvg[0] / os.cpus().length) * 100;

        return {
            serverLoad: `${cpuUsage.toFixed(1)}%`,
            memoryUsage: `${((totalMem - freeMem) / 1024 / 1024).toFixed(0)} MB / ${(totalMem / 1024 / 1024).toFixed(0)} MB`,
            uptime: Math.floor(os.uptime() / 60 / 60) // Uptime in hours
        };
    }
    // ======================================================

    async start() {
        await this.bus.ready;
        await this._bootstrapAgents();
        await this._wireBusListeners();
        this._scheduleHealthSweep();
        this._scheduleLearningCycle();
        this.logger.log('🧠 MasterOverseer online [ACTIVE]');
    }

    async _bootstrapAgents() {
        for (const blueprint of this.agentBlueprints) {
            await this._launchAgent(blueprint);
        }
    }

    async _launchAgent(blueprint) {
        const instance = new blueprint.ClassRef({ ...(blueprint.options || {}), logger: this.logger });
        const monitoredStart = AIMonitor(blueprint.name, instance.start.bind(instance), {
            bus: this.bus,
            logger: this.logger
        });

        try {
            await monitoredStart();
            instance.on('heartbeat', (payload) => this._recordHeartbeat(blueprint.name, payload));
            this.agents.set(blueprint.name, { instance, blueprint });
            this.healthMap.set(blueprint.name, { lastSeen: Date.now() });
            this.logger.log(`[MasterOverseer] ${blueprint.name} started successfully`);
        } catch (error) {
            this.logger.error(`[MasterOverseer] Failed to start ${blueprint.name}: ${error.message}`);
            await this.bus.safePublish('agent_events', {
                agent: blueprint.name,
                action: 'startup_failed',
                error: error.message
            });
        }
    }

    _recordHeartbeat(agentName, payload) {
        this.healthMap.set(agentName, { lastSeen: Date.now(), payload });
    }

    _scheduleHealthSweep() {
        const interval = 5 * 60 * 1000; // 5 minutes
        setInterval(() => {
            const now = Date.now();
            for (const [agentName, meta] of this.healthMap.entries()) {
                if (now - (meta.lastSeen || 0) > interval * 2) {
                    this.logger.warn(`[MasterOverseer] ${agentName} missed heartbeat, attempting restart`);
                    this._restartAgent(agentName).catch((error) => {
                        this.logger.error(`[MasterOverseer] Failed to restart ${agentName}: ${error.message}`);
                    });
                }
            }
        }, interval);
    }

    async _restartAgent(agentName) {
        const record = this.agents.get(agentName);
        if (!record) return;
        await record.instance.shutdown?.();
        await this._launchAgent(record.blueprint);
        await this.bus.safePublish('agent_events', {
            agent: agentName,
            action: 'restarted',
            timestamp: new Date().toISOString()
        });
    }

    async _wireBusListeners() {
        await this.bus.subscribe('ai_master_agent_events', (payload) => this._handleAgentEvent(payload));

        await this.bus.subscribe('learning_unknown', async (payload) => {
            if (!payload?.agent || !payload?.signature) return;
            await this.learningCore.enqueueUnknown(payload.agent, {
                signature: payload.signature,
                ...payload
            });
        });

        await this.bus.subscribe('agent_events', (rawPayload) => {
            const event = this._parseEvent(rawPayload);
            if (event) {
                this.dailyIncidents.push({ ts: new Date().toISOString(), ...event });
                this._handleAgentEvent(event);
            }
        });

        // Handle Remote/Chaos Triggers
        await this.bus.subscribe('approval_requests', (rawPayload) => {
            this._handleRemoteApproval(rawPayload);
        });
    }

    _parseEvent(raw) {
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch (error) { return null; }
        }
        return raw;
    }

    _handleAgentEvent(event) {
        const parsed = this._parseEvent(event);
        if (!parsed || !parsed.agent) return;
        
        this.logger.log(`[MasterOverseer] Event from ${parsed.agent}`, parsed);
        
        if (this.socketManager) {
            this.socketManager.broadcastSwarmEvent({
                agent: parsed.agent,
                action: parsed.action,
                status: parsed.status || 'info',
                message: parsed.message || parsed.reason,
                timestamp: parsed.timestamp || new Date().toISOString()
            });
        }
    }

    async _handleRemoteApproval(raw) {
        const event = this._parseEvent(raw);
        if (!event || !event.id || this.pendingApprovals.has(event.id)) return;

        this.logger.warn(`[MasterOverseer] Received REMOTE approval request: ${event.id}`);

        // 1. Store in Memory
        this.pendingApprovals.set(event.id, {
            payload: event.payload,
            requestedAt: new Date(event.timestamp || Date.now()),
            status: 'waiting',
            origin: 'remote'
        });

        // 2. Notify UI (Red Phone)
        if (this.socketManager) {
            this.socketManager.broadcastSwarmEvent({
                agent: 'MasterOverseer',
                action: 'approval_required',
                status: 'pending',
                approvalId: event.id,
                message: event.payload.description || event.payload.action
            });
        }

        // 3. Send Email Alert (NEW FEATURE)
        await this._sendApprovalEmail(event.id, event.payload);
    }

    async _sendApprovalEmail(approvalId, payload) {
        if (!this.transporter) return;
        const to = process.env.ADMIN_EMAIL || process.env.DEVELOPER_EMAIL;
        if (!to) return;

        try {
            await this.transporter.sendMail({
                from: `"HMS-CENTRAL Sentinel" <${process.env.EMAIL_USER}>`,
                to,
                subject: `🚨 CRITICAL ALERT: Approval Required (${payload.severity})`,
                html: `
                    <div style="border: 2px solid #d32f2f; padding: 20px; font-family: Arial, sans-serif;">
                        <h2 style="color: #d32f2f;">⚠️ High-Severity Action Blocked</h2>
                        <p>The Autonomous Security Engine has paused a critical operation requiring human authorization.</p>
                        <hr>
                        <p><strong>Action:</strong> ${payload.action}</p>
                        <p><strong>Reason:</strong> ${payload.reason}</p>
                        <p><strong>Origin:</strong> ${payload.origin || 'Internal AI'}</p>
                        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                        <br>
                        <p>Please log in to the <strong>IT Admin Console</strong> to Authorize or Deny this request.</p>
                        <p style="font-size: 12px; color: #666;">Reference ID: ${approvalId}</p>
                    </div>
                `
            });
            this.logger.log(`[MasterOverseer] 📧 Alert email sent to ${to}`);
        } catch (error) {
            this.logger.error(`[MasterOverseer] Failed to send alert email: ${error.message}`);
        }
    }

    _scheduleLearningCycle() {
        const checkInterval = 60 * 1000;
        setInterval(async () => {
            const now = new Date();
            if (now.getHours() === 3 && now.getMinutes() === 0) {
                if (this.lastLearningRun && now - this.lastLearningRun < 50 * 60 * 1000) {
                    return;
                }
                this.lastLearningRun = now;
                const proposals = await this.learningCore.runNightly();
                if (proposals.length) {
                    await this._persistReport(proposals);
                    await this._emailReport(proposals);
                }
                this.dailyIncidents = [];
            }
        }, checkInterval);
    }

    async _persistReport(proposals) {
        const fileName = `ai-report-${new Date().toISOString().split('T')[0]}.json`;
        const payload = {
            generatedAt: new Date().toISOString(),
            incidents: this.dailyIncidents,
            proposals
        };
        const filePath = path.join(this.reportDir, fileName);
        await fs.promises.writeFile(filePath, JSON.stringify(payload, null, 2));
        this.logger.log(`[MasterOverseer] Daily report stored at ${filePath}`);
    }

    async _emailReport(proposals) {
        if (!this.transporter) return;
        const to = process.env.ADMIN_EMAIL || process.env.DEVELOPER_EMAIL;
        if (!to) return;

        const html = `
            <h2>HMS-CENTRAL - Daily AI Report</h2>
            <p>Total incidents: ${this.dailyIncidents.length}</p>
            <p>New rule proposals: ${proposals.length}</p>
            <ul>
                ${proposals.map((p) => `<li><strong>${p.sampleSignature}</strong> - ${p.occurrences} hits (suggestion: ${p.suggestion})</li>`).join('')}
            </ul>
            <p>Generated at ${new Date().toUTCString()}</p>
        `;

        await this.transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject: 'HMS-CENTRAL AI Daily Report',
            html
        });
    }

    _initMailer() {
        try {
            return nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || 'gmail',
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT, 10) || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
        } catch (error) {
            this.logger.error('[MasterOverseer] Email transporter init failed:', error.message);
            return null;
        }
    }

    getPendingApprovals() {
        return Array.from(this.pendingApprovals.entries())
            .filter(([, record]) => record.status === 'waiting')
            .map(([id, record]) => ({
                id,
                severity: record.payload?.severity || 'HIGH',
                action: record.payload?.action || 'UNKNOWN',
                reason: record.payload?.reason || 'Not provided',
                requestedAt: record.requestedAt,
                metadata: record.payload || {}
            }));
    }

    async requestApproval(actionPayload) {
        const approvalId = `approval_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        this.pendingApprovals.set(approvalId, {
            payload: actionPayload,
            requestedAt: new Date(),
            status: 'waiting'
        });

        await this.bus.safePublish('approval_requests', {
            id: approvalId,
            payload: actionPayload,
            timestamp: new Date().toISOString()
        });

        if (this.socketManager) {
            this.socketManager.broadcastSwarmEvent({
                agent: 'MasterOverseer',
                action: 'approval_required',
                status: 'pending',
                approvalId,
                message: actionPayload.description || actionPayload.action
            });
        }
        
        // Send email for internal requests too
        await this._sendApprovalEmail(approvalId, actionPayload);

        this.logger.warn(`[MasterOverseer] Approval required for ${actionPayload.action}`, { approvalId });
        return approvalId;
    }

    async executeApprovedAction(approvalId, adminUser) {
        const record = this.pendingApprovals.get(approvalId);
        if (!record || record.status !== 'waiting') {
            throw new Error('Approval ID invalid or already processed');
        }

        try {
            await this._performAction(record.payload);
            record.status = 'executed';
            record.executedAt = new Date();
            record.executedBy = adminUser;
            this.logger.log('[MasterOverseer] Approved action executed', { approvalId, adminUser });
        } catch (error) {
            record.status = 'failed';
            record.error = error.message;
            throw error;
        } finally {
            this.pendingApprovals.set(approvalId, record);
        }
    }

    async _performAction(payload) {
        this.logger.log('[MasterOverseer] (TEST) Performing gated action', payload);
        // Placeholder – actual remediation logic plugs in here per action type.
    }
}

module.exports = MasterOverseer;