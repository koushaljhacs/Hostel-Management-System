/**
 * HMS-CENTRAL-COPY/security/layers/GateGuard.js
 * * LAYER 1: External Security (Gate Guard)
 * * First line of defense against IP-level threats, providing:
 * * - Enhanced IP reputation checking (4-factor analysis)
 * * - Malware scanning (15+ patterns)
 * * - Rate limiting (reinforcement)
 * * - Basic sanitization
 * * Fulfills requirement for: Multi-layer security validation and Real-time threat intelligence.
 */

const { Pool } = require('pg');
const logger = require('../../config/logger');

class GateGuard {
    constructor(dbPool) {
        this.dbPool = dbPool;
        this.rateLimitCache = new Map(); // IP -> { count, resetTime }
        this.IP_REPUTATION_CACHE = new Map(); // IP -> reputation score
    }

    /**
     * Check if IP is blocked in database (redundancy with FirewallLayer, but necessary for quick check).
     */
    async isIpBlocked(ip) {
        try {
            const query = `
                SELECT reason, expires_at, is_suspended, suspension_ends_at 
                FROM blocked_ips 
                WHERE ip_address = $1 AND expires_at > NOW()
            `;
            const res = await this.dbPool.query(query, [ip]);
    
            if (res.rows.length > 0) {
                const ban = res.rows[0];
    
                if (ban.is_suspended && new Date(ban.suspension_ends_at) > new Date()) {
                    return { blocked: false, reason: `IP_SUSPENDED (Admin Override)` };
                }
    
                return { blocked: true, reason: `IP_BLOCKED (DB: ${ban.reason})` };
            }
        } catch (err) {
            logger.error('GateGuard database error', { error: err.message, stack: err.stack });
        }
        return { blocked: false };
    }

    /**
     * Rate limiting check (reinforces the global express-rate-limit)
     */
    checkRateLimit(ip, maxRequests = 100, windowMs = 15 * 60 * 1000) {
        const now = Date.now();
        const cached = this.rateLimitCache.get(ip);

        if (!cached || now > cached.resetTime) {
            this.rateLimitCache.set(ip, {
                count: 1,
                resetTime: now + windowMs
            });
            return { allowed: true, remaining: maxRequests - 1 };
        }

        if (cached.count >= maxRequests) {
            return { 
                allowed: false, 
                remaining: 0,
                resetTime: cached.resetTime
            };
        }

        cached.count++;
        return { allowed: true, remaining: maxRequests - cached.count };
    }

    /**
     * Basic input sanitization (first layer of cleaning)
     */
    sanitizeInput(input) {
        if (typeof input === 'string') {
            return input
                .trim()
                .replace(/[<>]/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '');
        }
        if (typeof input === 'object' && input !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(input)) {
                sanitized[key] = this.sanitizeInput(value);
            }
            return sanitized;
        }
        return input;
    }

    /**
     * Scan for basic malware patterns (ENHANCED - 15+ patterns)
     */
    scanForMalware(data) {
        const malwarePatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi,
            /vbscript:/gi,
            /data:text\/html/gi,
            /<iframe[^>]*>/gi,
            /<object[^>]*>/gi,
            /<embed[^>]*>/gi,
            /document\.cookie/gi,
            /document\.write/gi,
            /window\.location/gi,
            /XMLHttpRequest/gi,
            /fetch\s*\(/gi,
            /\.innerHTML\s*=/gi
        ];

        const dataString = JSON.stringify(data || {}).toLowerCase();
        
        for (const pattern of malwarePatterns) {
            if (pattern.test(dataString)) {
                return { 
                    threat: true, 
                    reason: 'MALWARE_PATTERN_DETECTED',
                    pattern: pattern.toString()
                };
            }
        }

        return { threat: false };
    }

    /**
     * Enhanced IP reputation check with multiple factors (4-factor analysis)
     * This relies on the audit logs and blocked IP table.
     */
    async checkIPReputationEnhanced(ip) {
        // Check cache first (for 1 hour, 3600000 ms)
        if (this.IP_REPUTATION_CACHE.has(ip)) {
            const cached = this.IP_REPUTATION_CACHE.get(ip);
            if (Date.now() < cached.expires) {
                return cached.reputation;
            }
        }

        let reputation = 100; // Start at max reputation

        try {
            // Factor 1: Previous security violations (last 24 hours)
            const violationQuery = `
                SELECT COUNT(*) as violation_count 
                FROM activity_logs 
                WHERE ip_address = $1 
                AND firewall_reason IS NOT NULL 
                AND timestamp > NOW() - INTERVAL '24 hours'
            `;
            const violationResult = await this.dbPool.query(violationQuery, [ip]);
            const violations = parseInt(violationResult.rows[0].violation_count) || 0;
            reputation -= violations * 10; 

            // Factor 2: Block history (last 7 days)
            const blockQuery = `
                SELECT COUNT(*) as block_count 
                FROM blocked_ips 
                WHERE ip_address = $1 
                AND expires_at > NOW() - INTERVAL '7 days'
            `;
            const blockResult = await this.dbPool.query(blockQuery, [ip]);
            const blocks = parseInt(blockResult.rows[0].block_count) || 0;
            reputation -= blocks * 15; 

            // Factor 3: Request frequency (high frequency indicates bot/DDoS attempt)
            const frequencyQuery = `
                SELECT COUNT(*) as request_count 
                FROM activity_logs 
                WHERE ip_address = $1 
                AND timestamp > NOW() - INTERVAL '1 hour'
            `;
            const frequencyResult = await this.dbPool.query(frequencyQuery, [ip]);
            const requestCount = parseInt(frequencyResult.rows[0].request_count) || 0;
            if (requestCount > 1000) { 
                reputation -= 20; 
            }

            // Factor 4: Failed login attempts (last 1 hour)
            const failedLoginQuery = `
                SELECT COUNT(*) as failed_count 
                FROM activity_logs 
                WHERE ip_address = $1 
                AND status_code = 401 
                AND timestamp > NOW() - INTERVAL '1 hour'
            `;
            const failedLoginResult = await this.dbPool.query(failedLoginQuery, [ip]);
            const failedLogins = parseInt(failedLoginResult.rows[0].failed_count) || 0;
            reputation -= failedLogins * 5; 

            // Ensure reputation is between 0 and 100
            reputation = Math.max(0, Math.min(100, reputation));

            // Cache for 1 hour (3600000 ms)
            this.IP_REPUTATION_CACHE.set(ip, {
                reputation,
                expires: Date.now() + 3600000
            });

            return reputation;
        } catch (err) {
            logger.error('GateGuard enhanced IP reputation check error', { error: err.message, stack: err.stack });
            return 50; // Default to neutral if error
        }
    }

    /**
     * Main entry point - runs all GateGuard checks
     */
    async runChecks(req) {
        const ip = req.ip || req.connection.remoteAddress;
        const checks = {};

        // Check 1: IP Block (Redundant but ensures block persistence)
        const ipCheck = await this.isIpBlocked(ip);
        if (ipCheck.blocked) {
            return { passed: false, reason: ipCheck.reason };
        }

        // Check 2: IP Reputation (Enhanced)
        const reputation = await this.checkIPReputationEnhanced(ip);
        if (reputation < 30) { // Critical low trust threshold
            return { passed: false, reason: 'LOW_IP_REPUTATION' };
        }
        checks.ipReputation = reputation;

        // Check 3: Rate Limiting (Reinforces express-rate-limit)
        const rateCheck = this.checkRateLimit(ip);
        if (!rateCheck.allowed) {
            return { passed: false, reason: 'RATE_LIMIT_EXCEEDED' };
        }
        checks.rateLimit = rateCheck;

        // Check 4: Malware Scan
        const malwareCheck = this.scanForMalware(req.body || {});
        if (malwareCheck.threat) {
            return { passed: false, reason: malwareCheck.reason };
        }
        checks.malware = malwareCheck;

        // Check 5: Sanitize input (Performs the first level of cleaning)
        if (req.body) {
            req.body = this.sanitizeInput(req.body);
        }

        return { passed: true, checks };
    }
}

module.exports = GateGuard;