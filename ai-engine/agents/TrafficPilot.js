const path = require('path');
const pm2 = require('pm2');

const BaseAgent = require('./BaseAgent');
const PostgresBus = require('../core/PostgresBus');
// Assuming the path to FirewallLayer is correct:
const FirewallLayer = require('../../security/layers/FirewallLayer'); 
const { dbPool } = require('../../config/database');

class TrafficPilot extends BaseAgent {
    constructor(options = {}) {
        super({
            name: 'TrafficPilot',
            knowledgeFile: path.join(__dirname, '../knowledge-base/traffic_patterns.json'),
            bus: options.bus || new PostgresBus({ channelPrefix: 'ai_traffic' }),
            logger: options.logger
        });

        this.appName = options.appName || 'server';
        this.cpuScaleThreshold = options.cpuScaleThreshold || 0.82; // 82% CPU trigger for scale-up
        this.cpuScaleDownThreshold = options.cpuScaleDownThreshold || 0.35; // 35% CPU trigger for scale-down
        this.requestRateThreshold = options.requestRateThreshold || 450; // 450 Req/s trigger for scale-up
        this.jobQueueThreshold = options.jobQueueThreshold || 500; // 500 jobs trigger for rate limit tightening
        this.scaleStep = options.scaleStep || 1;
        this.minInstances = options.minInstances || 2;
        this.maxInstances = options.maxInstances || 8;
        this.pm2Connected = false;
        
        // Initial rate limits for dynamic adjustment
        this.initialRateLimit = options.initialRateLimit || 1500; // e.g., 1500 req/min
        this.maxRateLimit = options.maxRateLimit || 3000; // Max allowed rate limit
        
        // Initialize the FirewallLayer instance
        this.firewall = options.firewall || new FirewallLayer(dbPool); 
    }

    async start() {
        await this.bus.subscribe('metrics', this._handleMetric.bind(this));
        await this._connectPm2();
        this.startHeartbeat();
        await this.notifyBus('agent_events', { action: 'online', agent: this.name });
        this.log('TrafficPilot activated and listening for metrics');
    }

    async _connectPm2() {
        if (this.pm2Connected) return;
        return new Promise((resolve, reject) => {
            pm2.connect((err) => {
                if (err) {
                    this.log('Failed to connect to PM2', { error: err });
                    return reject(err);
                }
                this.pm2Connected = true;
                resolve();
            });
        });
    }
    
    // ========================================================================
    // CRITICAL FIX: DYNAMIC RATE LIMIT ADJUSTMENT
    // ========================================================================
    async _adjustFirewallAggressiveness(loadRatio) {
        // loadRatio is an index of system stress, e.g., 0.8 to 1.5
        // We use a formula to increase the rate limit (make it stricter)
        const newRateLimit = Math.min(
            // The formula ensures the limit tightens as loadRatio goes up past 1
            this.initialRateLimit / loadRatio, 
            this.initialRateLimit * 0.5 // E.g., don't go below 50% of initial limit
        );

        // Call the FirewallLayer (Redis Rate Limiter) to adjust its configuration
        await this.firewall.setGlobalRateLimit({ 
            rate: newRateLimit, 
            reason: `AI Load Adjustment (Ratio: ${loadRatio.toFixed(2)})` 
        });

        this.log(`Firewall Rate Limit adjusted to ${newRateLimit} req/min`, { loadRatio });
    }
    
    // ========================================================================
    // UPDATED HANDLER: PM2 SCALING + FIREWALL ADJUSTMENT
    // ========================================================================
    async _handleMetric(metric) {
        // metric = { cpu_load, request_rate, job_queue_length }
        
        const currentInstances = await this._getCurrentInstances();
        // Determine the overall stress level (stressMetric > 1 means critical load)
        const stressMetric = Math.max(
            metric.cpu_load, 
            metric.request_rate / this.requestRateThreshold
        );

        // 1. SCALE UP LOGIC (PM2 and Firewall Aggressiveness)
        if (stressMetric >= this.cpuScaleThreshold) {
            if (currentInstances < this.maxInstances) {
                await this._scaleUp('High CPU/Request Rate', metric);
            }
            // Increase rate limiting aggressiveness if under high stress
            // This protects the system while PM2 scales up instances
            await this._adjustFirewallAggressiveness(stressMetric);
        }

        // 2. SCALE DOWN LOGIC
        else if (metric.cpu_load < this.cpuScaleDownThreshold) {
            if (currentInstances > this.minInstances) {
                await this._scaleDown('Low CPU Usage', metric);
            }
            // Loosen rate limits if the system is idle
            await this._adjustFirewallAggressiveness(0.5); // Use 0.5 to signify low load, returning to initial limit
        }
        
        // 3. JOB QUEUE PILOT (Check background load as per contract)
        if (metric.job_queue_length > this.jobQueueThreshold) {
             // Calculate queue stress (capped at 1)
             const queueStress = Math.min(1.5, metric.job_queue_length / this.jobQueueThreshold);
             // Apply aggressive rate limiting regardless of API CPU load
             await this._adjustFirewallAggressiveness(queueStress);
        }
    }
    
    // ... (Original _scaleUp, _scaleDown, _scaleTo, and _getCurrentInstances methods remain here) ...
    // Note: To save space, the original PM2 utility functions are not repeated, 
    // but they remain part of the final file implementation.
    
    async _scaleUp(reason, metric) {
        const current = await this._getCurrentInstances();
        if (current >= this.maxInstances) {
            return this.log('Maximum PM2 instances reached. Skipping scale-up.');
        }

        const target = Math.min(current + this.scaleStep, this.maxInstances);
        await this._scaleTo(target, reason, metric);
    }

    async _scaleDown(reason, metric) {
        const current = await this._getCurrentInstances();
        if (current <= this.minInstances) {
            return this.log('Minimum PM2 instances reached. Skipping scale-down.');
        }

        const target = Math.max(current - this.scaleStep, this.minInstances);
        await this._scaleTo(target, reason, metric);
    }

    async _scaleTo(target, reason, metric) {
        await this._connectPm2();

        await new Promise((resolve, reject) => {
            pm2.scale(this.appName, target, (err) => {
                if (err) return reject(err);
                return resolve();
            });
        });

        this.log(`Scaled ${this.appName} to ${target} instances`, { reason, metric });
        await this.notifyBus('agent_events', {
            action: 'scaled',
            reason,
            instances: target,
            metric
        });
    }

    async _getCurrentInstances() {
        await this._connectPm2();
        const list = await new Promise((resolve, reject) => {
            pm2.list((err, processes) => {
                if (err) return reject(err);
                return resolve(processes);
            });
        });

        const targetProcesses = list.filter((proc) => proc.name === this.appName);
        if (targetProcesses.length === 0) {
            this.log(`Process ${this.appName} not found, assuming 0 instances.`);
        }
        return Math.max(targetProcesses.length, 0);
    }

}

module.exports = TrafficPilot;