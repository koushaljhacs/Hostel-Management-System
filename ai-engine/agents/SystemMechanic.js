const fs = require('fs');
const path = require('path');
const pm2 = require('pm2');

const BaseAgent = require('./BaseAgent');
const PostgresBus = require('../core/PostgresBus');
const SecureBackup = require('../../security/SecureBackup');
const { dbPool } = require('../../config/database');

class SystemMechanic extends BaseAgent {
    constructor(options = {}) {
        super({
            name: 'SystemMechanic',
            knowledgeFile: path.join(__dirname, '../knowledge-base/system_patterns.json'),
            bus: options.bus || new PostgresBus({ channelPrefix: 'ai_system' }),
            logger: options.logger,
            heartbeatInterval: options.heartbeatInterval || 60000
        });

        this.db = options.db || dbPool;
        this.secureBackup = options.secureBackup || new SecureBackup(this.db);
        this.pm2Connected = false;
    }

    async start() {
        await this.bus.subscribe('infra_events', this._handleInfraEvent.bind(this));
        this.startHeartbeat();
        await this.notifyBus('agent_events', { action: 'online', agent: this.name });
        this.log('SystemMechanic monitoring infra events [TEST]');
    }

    async _handleInfraEvent(rawEvent) {
        let event = rawEvent;
        if (typeof rawEvent === 'string') {
            try {
                event = JSON.parse(rawEvent);
            } catch (error) {
                return this.log('Invalid infra event payload', { rawEvent });
            }
        }

        if (!event || !event.type) return;
        const rule = this.findMatchingRule({ type: event.type, message: event.message }) || {};

        switch (event.type) {
            case 'service_crash':
                await this._handleServiceCrash(event, rule);
                break;
            case 'fs_error':
            case 'missing_file':
                await this._handleFileIssue(event, rule);
                break;
            default:
                await this.reportUnknown(`system:${event.type}`, event);
        }
    }

    async _handleServiceCrash(event, rule = {}) {
        const target = event.process || rule.process || 'server';
        try {
            await this._ensurePm2();
            await new Promise((resolve, reject) => {
                pm2.restart(target, (err) => {
                    if (err) return reject(err);
                    return resolve();
                });
            });

            await this.notifyBus('agent_events', {
                action: 'service_restarted',
                agent: this.name,
                process: target,
                reason: event.message || 'crash_detected'
            });

            this.log('Service restarted successfully', { process: target });
        } catch (error) {
            this.log('Failed to restart service via PM2', { process: target, error: error.message });
            await this.reportUnknown('system:restart_failure', { event, error: error.message });
        }
    }

    async _handleFileIssue(event, rule = {}) {
        const filePath = event.path || rule.filePath;
        if (!filePath) {
            this.log('Missing file path for FS issue event');
            return this.reportUnknown('system:file_issue_missing_path', event);
        }

        try {
            await this._restoreFileFromBackup(filePath, rule);
            await this.notifyBus('agent_events', {
                action: 'file_restored',
                agent: this.name,
                filePath,
                reason: event.message || 'auto_restore'
            });
            this.log('File restoration workflow executed', { filePath });
        } catch (error) {
            this.log('File restoration failed', { filePath, error: error.message });
            await this.reportUnknown('system:file_restore_failure', { event, error: error.message });
        }
    }

    async _restoreFileFromBackup(filePath, rule = {}) {
        const backupDir = this.secureBackup?.config?.backupDir;
        if (!backupDir) {
            throw new Error('Backup directory not configured');
        }

        const fileName = path.basename(filePath);
        const snapshotDir = path.join(backupDir, 'snapshots');
        try {
            const files = await fs.promises.readdir(snapshotDir);
            const candidates = files.filter((file) => file.includes(fileName)).sort().reverse();
            if (!candidates.length) {
                throw new Error(`No snapshot found for ${fileName}`);
            }

            const source = path.join(snapshotDir, candidates[0]);
            await fs.promises.copyFile(source, filePath);
            this.log('Restored file from snapshot', { source, destination: filePath });

            if (rule.permissions) {
                await fs.promises.chmod(filePath, rule.permissions);
            }
        } catch (error) {
            throw new Error(`Snapshot restoration failed: ${error.message}`);
        }
    }

    async _ensurePm2() {
        if (this.pm2Connected) return;
        await new Promise((resolve, reject) => {
            pm2.connect((err) => {
                if (err) return reject(err);
                this.pm2Connected = true;
                return resolve();
            });
        });
    }
}

module.exports = SystemMechanic;


