const logger = require('../config/logger');

/**
 * HMS-CENTRAL-COPY/security/TrustSystem.js
 * * Trust Management System for Autonomous Security Engine (ASE).
 * * Manages user and IP trust scores to enable adaptive, behavior-based security.
 * * Fulfills the requirement for: Autonomous Security, Self-Healing Security Protocols.
 */

class TrustSystem {
    constructor(dbPool) {
        this.dbPool = dbPool;
        // In-memory cache for fast O(1) trust lookups
        this.trustCache = new Map(); // userId/ip -> { trust: trustData, expires: timestamp }
    }

    /**
     * Get or create a trust record for a user or IP address.
     */
    async getTrustRecord(identifier, type = 'ip') {
        const cacheKey = `${type}_${identifier}`;
        
        // 1. Check cache first for instant response
        if (this.trustCache.has(cacheKey)) {
            const cached = this.trustCache.get(cacheKey);
            if (Date.now() < cached.expires) {
                return cached.trust;
            }
        }

        try {
            const tableName = type === 'user' ? 'user_trust' : 'ip_trust';
            const idColumn = type === 'user' ? 'user_id' : 'ip_address';
            
            // 2. Query database
            let query = `SELECT * FROM ${tableName} WHERE ${idColumn} = $1`;
            let result = await this.dbPool.query(query, [identifier]);

            let trust;
            if (result.rows.length > 0) {
                trust = result.rows[0];
            } else {
                // 3. Create new record with a default score of 50
                const insertQuery = `
                    INSERT INTO ${tableName} (${idColumn}, trust_score, total_requests, successful_requests, violations, trust_level, created_at, updated_at)
                    VALUES ($1, 50.00, 0, 0, 0, 'MEDIUM', NOW(), NOW())
                    ON CONFLICT (${idColumn}) DO UPDATE SET updated_at = NOW()
                    RETURNING *
                `;
                const insertResult = await this.dbPool.query(insertQuery, [identifier]);
                trust = insertResult.rows[0];
            }

            // 4. Cache for 5 minutes (300,000 ms)
            this.trustCache.set(cacheKey, {
                trust,
                expires: Date.now() + 300000
            });

            return trust;
        } catch (err) {
            logger.error('TrustSystem error getting trust record', { error: err.message, stack: err.stack, identifier, type });
            // Return safe default trust on database error
            return { trust_score: 50.00, total_requests: 0, successful_requests: 0, violations: 0, trust_level: 'MEDIUM' };
        }
    }

    /**
     * Update trust score based on activity (success or violation)
     */
    async updateTrust(identifier, type, success, violation = false) {
        try {
            const tableName = type === 'user' ? 'user_trust' : 'ip_trust';
            const idColumn = type === 'user' ? 'user_id' : 'ip_address';

            // Get current trust record (will create if none exists)
            const currentTrust = await this.getTrustRecord(identifier, type);
            let newScore = currentTrust.trust_score || 50;
            let totalRequests = (currentTrust.total_requests || 0) + 1;
            let successfulRequests = currentTrust.successful_requests || 0;
            let violations = currentTrust.violations || 0;

            if (success) {
                successfulRequests++;
                // Increase trust for successful requests (cautious increase, capped at 100)
                newScore = Math.min(100, newScore + 0.5);
            } else if (violation) {
                violations++;
                // Significant decrease for security violations (capped at 0)
                newScore = Math.max(0, newScore - 10);
            } else {
                // Neutral activity - slight, slow decay to prevent perpetual "HIGH" trust
                newScore = Math.max(0, newScore - 0.1); 
            }

            // Calculate new trust level string
            const trustLevel = this.calculateTrustLevel(newScore);

            // Update database (uses parameterized query)
            const updateQuery = `
                UPDATE ${tableName}
                SET trust_score = $1,
                    total_requests = $2,
                    successful_requests = $3,
                    violations = $4,
                    trust_level = $5,
                    updated_at = NOW()
                WHERE ${idColumn} = $6
            `;
            await this.dbPool.query(updateQuery, [
                newScore.toFixed(2), // Store as DECIMAL(5,2)
                totalRequests,
                successfulRequests,
                violations,
                trustLevel,
                identifier
            ]);

            // Immediately update the cache
            const cacheKey = `${type}_${identifier}`;
            const updatedTrust = { trust_score: newScore, total_requests: totalRequests, successful_requests: successfulRequests, violations, trust_level: trustLevel };
            this.trustCache.set(cacheKey, { trust: updatedTrust, expires: Date.now() + 300000 });

            return updatedTrust;
        } catch (err) {
            logger.error('TrustSystem error updating trust', { error: err.message, stack: err.stack, identifier, type });
            return null;
        }
    }

    /**
     * Calculate trust level from score (0-100)
     */
    calculateTrustLevel(score) {
        if (score >= 85) return 'HIGH';
        if (score >= 50) return 'MEDIUM';
        if (score >= 20) return 'LOW';
        return 'VERY_LOW'; // Triggers highest security scrutiny
    }

    /**
     * Get security level recommendation based on trust score.
     * This defines the adaptive nature of the security system.
     */
    getSecurityLevel(trust) {
        const score = trust.trust_score || 50;
        const level = this.calculateTrustLevel(score);

        switch (level) {
            case 'HIGH':
                return { level: 'QUICK', description: 'Quick validation - trusted user', checks: ['basic_sanitization', 'rate_limit'] };
            case 'MEDIUM':
                return { level: 'STANDARD', description: 'Standard validation', checks: ['basic_sanitization', 'rate_limit', 'pattern_detection'] };
            case 'LOW':
                return { level: 'ENHANCED', description: 'Enhanced validation - low trust', checks: ['basic_sanitization', 'rate_limit', 'pattern_detection', 'behavior_analysis'] };
            case 'VERY_LOW':
                return { level: 'FULL', description: 'Full security scan - very low trust', checks: ['all'] };
            default:
                return { level: 'STANDARD', description: 'Standard validation', checks: ['basic_sanitization', 'rate_limit', 'pattern_detection'] };
        }
    }

    /**
     * Get the full trust status for a request (used by other security layers).
     */
    async getTrustStatus(identifier, type = 'ip') {
        const trust = await this.getTrustRecord(identifier, type);
        const securityLevel = this.getSecurityLevel(trust);

        return {
            trust_score: parseFloat(trust.trust_score) || 50,
            trust_level: trust.trust_level || 'MEDIUM',
            security_level: securityLevel,
            total_requests: trust.total_requests || 0,
            violations: trust.violations || 0
        };
    }
    
    /**
     * Cleans up expired entries in the in-memory cache.
     */
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.trustCache.entries()) {
            if (value.expires < now) {
                this.trustCache.delete(key);
            }
        }
        // telemetry placeholder for cache cleanup metrics
    }
}

module.exports = TrustSystem;
