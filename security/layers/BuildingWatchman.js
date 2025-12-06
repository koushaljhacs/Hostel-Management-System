/**
 * HMS-CENTRAL-COPY/security/layers/BuildingWatchman.js
 * * FIXED: Standardized all attack patterns to RegExp to prevent
 * * "TypeError: includes must not be a regular expression" crash.
 */

const { Pool } = require('pg');
const logger = require('../../config/logger');

class BuildingWatchman {
    constructor(dbPool) {
        this.dbPool = dbPool;
        this.behaviorCache = new Map(); 
        this.sessionStore = new Map(); 
    }

    async analyzeBehavior(ip, path, method, userAgent) {
        const behaviorKey = `${ip}_behavior`;
        let behavior = this.behaviorCache.get(behaviorKey);

        if (!behavior) {
            behavior = {
                ip,
                requestCount: 0,
                lastRequest: null,
                patterns: []
            };
        }

        const now = Date.now();
        behavior.requestCount++;
        
        let suspiciousScore = 0;

        if (behavior.lastRequest) {
            const timeDiff = now - new Date(behavior.lastRequest).getTime();
            if (timeDiff < 100) { 
                suspiciousScore += 5;
                behavior.patterns.push('RAPID_FIRE_REQUESTS');
            }
        }
        
        behavior.lastRequest = now;

        try {
            const query = `
                SELECT COUNT(*) as count 
                FROM activity_logs 
                WHERE ip_address = $1 
                AND firewall_reason IS NOT NULL
                AND timestamp > NOW() - INTERVAL '1 hour'
            `;
            const result = await this.dbPool.query(query, [ip]);
            const violations = parseInt(result.rows[0].count) || 0;
            
            if (violations > 0) {
                suspiciousScore += violations * 2;
                behavior.patterns.push(`HISTORICAL_VIOLATIONS_${violations}`);
            }
        } catch (err) {
            logger.error('BuildingWatchman behavior analysis error', { error: err.message, stack: err.stack });
        }

        behavior.suspiciousScore = suspiciousScore;
        this.behaviorCache.set(behaviorKey, behavior);
        this.cleanBehaviorCache();

        return {
            suspicious: suspiciousScore > 10,
            score: suspiciousScore,
            patterns: behavior.patterns
        };
    }
    
    advancedSanitize(input) {
        if (typeof input === 'string') {
            return input
                .replace(/[<>]/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .replace(/eval\s*\(/gi, '')
                .replace(/expression\s*\(/gi, '')
                .replace(/vbscript:/gi, '')
                .replace(/data:text\/html/gi, '')
                .replace(/&#x/gi, '')
                .replace(/&#/gi, '');
        }
        
        if (Array.isArray(input)) {
            return input.map(item => this.advancedSanitize(item));
        }
        
        if (typeof input === 'object' && input !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(input)) {
                sanitized[key] = this.advancedSanitize(value);
            }
            return sanitized;
        }
        
        return input;
    }

    async checkPermissions(roleId, requiredPermission) {
        if (!roleId) {
            return { allowed: false, reason: 'NO_ROLE_ASSIGNED' };
        }

        try {
            const query = `
                SELECT r.permissions->>$2 as permission_value 
                FROM roles r
                WHERE r.role_id = $1
            `;
            const result = await this.dbPool.query(query, [roleId, requiredPermission]);
            const permissionValue = result.rows[0]?.permission_value;
            
            if (permissionValue === 'true' || requiredPermission === 'all') {
                return { allowed: true };
            }

            return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
        } catch (err) {
            logger.error('BuildingWatchman permission check error', { error: err.message, stack: err.stack });
            return { allowed: false, reason: 'PERMISSION_CHECK_ERROR' };
        }
    }

    detectPatterns(req) {
        const patterns = [];
        const bodyString = JSON.stringify(req.body || {}).toLowerCase();

        // SQL Injection patterns
        const sqlPatterns = [/union\s+select/i, /drop\s+table/i, /exec\s*\(/i, /information_schema/i];
        if (sqlPatterns.some(p => p.test(bodyString))) {
            patterns.push('SQL_INJECTION_ATTEMPT');
        }

        // XSS patterns
        const xssPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /eval\s*\(/i];
        if (xssPatterns.some(p => p.test(bodyString))) {
            patterns.push('XSS_ATTEMPT');
        }

        // --- FIX: COMMAND INJECTION PATTERNS (Standardized to Regex) ---
        const commandPatterns = [
            /;\s*ls/i, 
            /\|\s*cat/i, 
            /`rm`/i, 
            /\$\(rm\)/i
        ];
        // Replaced .includes() with .test() because patterns are Regex
        if (commandPatterns.some(p => p.test(bodyString))) {
            patterns.push('COMMAND_INJECTION_ATTEMPT');
        }

        return patterns;
    }

    cleanBehaviorCache() {
        const oneHourAgo = Date.now() - 3600000;
        for (const [key, behavior] of this.behaviorCache.entries()) {
            if (behavior.lastRequest && new Date(behavior.lastRequest).getTime() < oneHourAgo) {
                this.behaviorCache.delete(key);
            }
        }
    }

    async runChecks(req, userId = null, roleId = null) {
        const ip = req.ip || req.connection.remoteAddress;
        const checks = { behavior: null, patterns: [], permissions: null };

        checks.behavior = await this.analyzeBehavior(
            ip,
            req.path,
            req.method,
            req.headers['user-agent'] || ''
        );

        if (checks.behavior.suspicious) {
            return { passed: false, reason: 'SUSPICIOUS_BEHAVIOR' };
        }

        if (req.body) {
            req.body = this.advancedSanitize(req.body);
        }

        checks.patterns = this.detectPatterns(req);
        if (checks.patterns.length > 0) {
            return { passed: false, reason: checks.patterns[0] };
        }

        if (roleId && req.route && req.route.permission) {
            checks.permissions = await this.checkPermissions(
                roleId,
                req.route.permission
            );
            if (!checks.permissions.allowed) {
                return { passed: false, reason: checks.permissions.reason };
            }
        }

        return { passed: true, checks };
    }
}

module.exports = BuildingWatchman;