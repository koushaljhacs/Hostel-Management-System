/**
 * HMS-CENTRAL-COPY/security/layers/FirewallLayer.js
 * * LAYER 0: HIGH-LEVEL FIREWALL SYSTEM - The "Security Gate"
 * * First line of defense providing DDoS protection, comprehensive threat detection,
 * * and an autonomous auto-banning/strike system.
 * * Fulfills requirement for: Instant attack mitigation and Multi-layer security validation.
 */

const logger = require('../../config/logger');

class FirewallLayer {
    constructor(dbPool) {
        this.dbPool = dbPool;
        if (!this.dbPool) {
            logger.error('CRITICAL: FirewallLayer started without a database pool');
        }
        
        // Strike tracking cache (IP -> { count, windowEnd, reasons })
        this.strikeCache = new Map();
        this.STRIKE_LIMIT = 10; // Auto-ban after 10 strikes in 1 hour
        this.STRIKE_WINDOW = 3600000; // 1 hour in milliseconds
    }

    /**
     * Check if IP is blocked in database (with suspend/resume logic)
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
    
                // Check if ban is suspended (admin override)
                if (ban.is_suspended) {
                    if (new Date(ban.suspension_ends_at) > new Date()) {
                        return { blocked: false, reason: `IP_SUSPENDED (Admin Override)` };
                    } else {
                        // Suspension expired - auto-resume ban
                        await this.dbPool.query(
                            `UPDATE blocked_ips 
                            SET is_suspended = FALSE, suspension_ends_at = NULL, reason = $2 
                            WHERE ip_address = $1`, 
                            [ip, `Resumed: ${ban.reason}`]
                        );
                        logger.warn('Firewall ban resumed after temporary access window expired', { ip });
                    }
                }
    
                return { blocked: true, reason: `IP_BLOCKED (DB: ${ban.reason})` };
            }
        } catch (err) {
            logger.error('Firewall isIpBlocked database error', { error: err.message, stack: err.stack });
        }
        return { blocked: false };
    }

    /**
     * Run comprehensive threat detection checks (10+ patterns)
     * Returns threat reason if detected, null if clean
     */
    runThreatDetection(req) {
        const path = req.path.toLowerCase();
        const bodyString = JSON.stringify(req.body || {}).toLowerCase();
        const queryString = JSON.stringify(req.query || {}).toLowerCase();
        const paramString = JSON.stringify(req.params || {}).toLowerCase();
        const headersString = JSON.stringify(req.headers || {}).toLowerCase();
        const ua = req.headers['user-agent'] ? req.headers['user-agent'].toLowerCase() : '';

        // ========== CHECK 1: PATH TRAVERSAL ==========
        const traversalPatterns = ['..', '%2e%2e', 'etc/passwd', '.env', '.git', 'config.php'];
        for (const pattern of traversalPatterns) {
            if (path.includes(pattern) || bodyString.includes(pattern) || queryString.includes(pattern) || paramString.includes(pattern)) {
                return 'PATH_TRAVERSAL_ATTEMPT';
            }
        }

        // ========== CHECK 2: SQL INJECTION ==========
        const sqlPatterns = ['union select', 'drop table', "or 1=1", "' OR '1'='1", 'exec(', 'xp_cmdshell', 'information_schema'];
        for (const pattern of sqlPatterns) {
            if (bodyString.includes(pattern) || queryString.includes(pattern) || paramString.includes(pattern) || headersString.includes(pattern)) {
                return 'SQL_INJECTION_ATTEMPT';
            }
        }

        // ========== CHECK 3: XSS (Cross-Site Scripting) ==========
        const xssPatterns = ['<script', 'javascript:', 'onload=', 'eval(', 'document.cookie', '<iframe', 'data:text/html'];
        for (const pattern of xssPatterns) {
            if (bodyString.includes(pattern) || queryString.includes(pattern) || paramString.includes(pattern) || headersString.includes(pattern)) {
                return 'XSS_ATTEMPT';
            }
        }

        // ========== CHECK 4: COMMAND INJECTION ==========
        const commandPatterns = ['; ls', '| cat', '&& rm', '`(ls)`', '$(cat', 'system(', 'shell_exec('];
        for (const pattern of commandPatterns) {
            if (bodyString.includes(pattern) || queryString.includes(pattern) || paramString.includes(pattern)) {
                return 'COMMAND_INJECTION_ATTEMPT';
            }
        }

        // ========== CHECK 5: SUSPICIOUS USER AGENTS ==========
        const botPatterns = ['sqlmap', 'nikto', 'burp', 'nmap', 'scanner', 'zmap', 'shodan'];
        for (const pattern of botPatterns) {
            if (ua.includes(pattern)) {
                return 'SUSPICIOUS_USER_AGENT';
            }
        }

        // ========== CHECK 6: FILE UPLOAD ATTACKS (If path is relevant) ==========
        const fileUploadPatterns = ['.php', '.jsp', '.exe', '<?php', '.sh'];
        if (req.path.includes('/upload') || req.path.includes('/file')) {
            for (const pattern of fileUploadPatterns) {
                if (bodyString.includes(pattern)) {
                    return 'MALICIOUS_FILE_UPLOAD_ATTEMPT';
                }
            }
        }

        // ========== CHECK 7: SSRF (Server-Side Request Forgery) ==========
        const ssrfPatterns = ['localhost', '127.0.0.1', '169.254.169.254', 'metadata.google.internal'];
        if (req.path.includes('fetch') || req.path.includes('proxy')) {
            for (const pattern of ssrfPatterns) {
                if (bodyString.includes(pattern) || queryString.includes(pattern)) {
                    return 'SSRF_ATTEMPT';
                }
            }
        }
        
        // ========== CHECK 8: XML/XXE INJECTION ==========
        const xxePatterns = ['<!entity', '<!doctype', 'system "', 'file://'];
        if (req.headers['content-type']?.includes('xml') || bodyString.includes('<?xml')) {
            for (const pattern of xxePatterns) {
                if (bodyString.includes(pattern)) {
                    return 'XXE_INJECTION_ATTEMPT';
                }
            }
        }
        
        // ========== CHECK 9: DESERIALIZATION ATTACKS ==========
        const deserializationPatterns = ['__wakeup', '__destruct', 'unserialize', 'yaml.load'];
        for (const pattern of deserializationPatterns) {
            if (bodyString.includes(pattern)) {
                return 'DESERIALIZATION_ATTACK_ATTEMPT';
            }
        }
        
        // ========== CHECK 10: PROTOCOL INJECTION ==========
        const protocolPatterns = ['ftp://', 'gopher://', 'dict://'];
        for (const pattern of protocolPatterns) {
            if (bodyString.includes(pattern)) {
                return 'PROTOCOL_INJECTION_ATTEMPT';
            }
        }

        return null; // Request is clean
    }

    /**
     * Track strikes and auto-ban if limit exceeded (Autonomous Security)
     */
    async trackStrike(ip, threatReason) {
        try {
            const now = Date.now();
            const cached = this.strikeCache.get(ip);

            // Initialize or reset if window expired
            if (!cached || now > cached.windowEnd) {
                this.strikeCache.set(ip, {
                    count: 1,
                    windowStart: now,
                    windowEnd: now + this.STRIKE_WINDOW,
                    reasons: [threatReason]
                });
            } else {
                cached.count++;
                cached.reasons.push(threatReason);
            }

            const current = this.strikeCache.get(ip);

            // Check if strike limit exceeded
            if (current.count >= this.STRIKE_LIMIT) {
                logger.error('Firewall auto-ban triggered due to strike limit', { ip, strikes: current.count });
                
                const banReason = `Auto-ban: ${current.count} strikes - ${current.reasons.slice(-3).join(', ')}`;
                const twentyFourHours = new Date(Date.now() + 24 * 3600 * 1000);
                
                // Insert or update blocked_ips table
                await this.dbPool.query(
                    `INSERT INTO blocked_ips (ip_address, reason, expires_at) 
                     VALUES ($1, $2, $3) 
                     ON CONFLICT (ip_address) 
                     DO UPDATE SET reason = $2, expires_at = $3, is_suspended = FALSE`,
                    [ip, banReason, twentyFourHours]
                );

                // Clear strike cache for this IP (ban is now persistent)
                this.strikeCache.delete(ip);

                return { banned: true, reason: banReason };
            }

            return { banned: false, strikes: current.count };
        } catch (err) {
            logger.error('Firewall error tracking strike', { error: err.message, stack: err.stack });
            return { banned: false, error: err.message };
        }
    }

    /**
     * Log threat activity to database (for IT Admin oversight)
     */
    async logThreat(ip, method, path, threatReason, userAgent) {
        try {
            // Note: status_code 403 is used for firewall blocks
            await this.dbPool.query(
                `INSERT INTO activity_logs 
                 (ip_address, method, path, status_code, user_agent, firewall_reason, timestamp) 
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [ip, method, path, 403, userAgent, threatReason]
            );
        } catch (err) {
            logger.warn('Firewall error logging threat', { error: err.message, stack: err.stack });
        }
    }

    /**
     * Main firewall check - runs all detection and blocking logic
     */
    async checkRequest(req) {
        const ip = req.ip || req.connection.remoteAddress;
        const method = req.method;
        const path = req.originalUrl || req.path;
        const userAgent = req.headers['user-agent'] || 'Unknown';

        // Stage 1: Check if IP is already blocked
        const ipBlockCheck = await this.isIpBlocked(ip);
        if (ipBlockCheck.blocked) {
            await this.logThreat(ip, method, path, ipBlockCheck.reason, userAgent);
            return {
                blocked: true,
                reason: ipBlockCheck.reason,
                action: 'BLOCKED_IP'
            };
        }

        // Stage 2: Run threat detection
        const threatReason = this.runThreatDetection(req);
        
        if (threatReason) {
            // Log the threat
            await this.logThreat(ip, method, path, threatReason, userAgent);
            
            // Track strike and potentially auto-ban
            const strikeResult = await this.trackStrike(ip, threatReason);
            
            return {
                blocked: true,
                reason: threatReason,
                action: strikeResult.banned ? 'AUTO_BANNED' : 'THREAT_DETECTED',
                strikes: strikeResult.strikes || 1,
                banned: strikeResult.banned || false
            };
        }

        // Request is clean
        return {
            blocked: false,
            action: 'ALLOWED'
        };
    }

    /**
     * Cleans up expired strike cache entries (called periodically by server.js)
     */
    cleanupStrikeCache() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [ip, data] of this.strikeCache.entries()) {
            if (now > data.windowEnd) {
                this.strikeCache.delete(ip);
                cleanedCount++;
            }
        }
        // if (cleanedCount > 0) { /* optional: emit telemetry about cleaned strike cache entries */ }
    }
}

module.exports = FirewallLayer;
