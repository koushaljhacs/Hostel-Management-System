const path = require('path');
const fs = require('fs');
const { distance } = require('fast-levenshtein');
const { dbPool } = require('../../config/database');

/**
 * LearningCore
 * ============
 * Human-in-the-loop evolution engine. Collects unknown errors from
 * daily_learning_queue, clusters them by similarity, and emits rule proposals.
 */
class LearningCore {
    constructor(options = {}) {
        this.db = options.db || dbPool;
        this.logger = options.logger || console;
        this.similarityThreshold = options.similarityThreshold || 6;
        this.minClusterSize = options.minClusterSize || 5;
        this.knowledgeDir = options.knowledgeDir || path.join(__dirname, '../knowledge-base');
    }

    /**
     * Persist an unknown event into the learning queue.
     */
    async enqueueUnknown(agentName, errorPayload = {}) {
        try {
            await this.db.query(
                `INSERT INTO daily_learning_queue (agent, error_signature, payload, created_at, processed)
                 VALUES ($1, $2, $3, NOW(), FALSE)`,
                [
                    agentName,
                    errorPayload.signature || errorPayload.message || 'UNKNOWN_ERROR',
                    JSON.stringify(errorPayload)
                ]
            );
        } catch (error) {
            this.logger.error('[LearningCore] Failed to enqueue unknown event:', error.message);
        }
    }

    /**
     * Pull all pending entries that have not yet been clustered.
     */
    async fetchPendingEntries(limit = 500) {
        const { rows } = await this.db.query(
            `SELECT id, agent, error_signature, payload, created_at
             FROM daily_learning_queue
             WHERE processed = FALSE
             ORDER BY created_at ASC
             LIMIT $1`,
            [limit]
        );
        return rows;
    }

    /**
     * Naive single-pass clustering using Levenshtein distance.
     */
    clusterEntries(entries) {
        const clusters = [];

        entries.forEach((entry) => {
            let matchedCluster = null;
            for (const cluster of clusters) {
                const sample = cluster.seed.error_signature || '';
                const candidate = entry.error_signature || '';
                const score = distance(sample, candidate);
                if (score <= this.similarityThreshold) {
                    matchedCluster = cluster;
                    break;
                }
            }

            if (matchedCluster) {
                matchedCluster.items.push(entry);
            } else {
                clusters.push({
                    id: `cluster_${entry.id}`,
                    seed: entry,
                    items: [entry]
                });
            }
        });

        return clusters;
    }

    /**
     * For each cluster large enough, build a human-readable proposal.
     */
    buildProposals(clusters) {
        return clusters
            .filter((cluster) => cluster.items.length >= this.minClusterSize)
            .map((cluster) => {
                const endpointHistogram = {};
                cluster.items.forEach((item) => {
                    try {
                        const payload = JSON.parse(item.payload || '{}');
                        const key = payload.endpoint || payload.path || 'unknown';
                        endpointHistogram[key] = (endpointHistogram[key] || 0) + 1;
                    } catch (error) {
                        // ignore
                    }
                });

                const topEndpoint = Object.keys(endpointHistogram).sort(
                    (a, b) => endpointHistogram[b] - endpointHistogram[a]
                )[0] || 'unknown';

                return {
                    clusterId: cluster.id,
                    sampleSignature: cluster.seed.error_signature,
                    occurrences: cluster.items.length,
                    topEndpoint,
                    suggestion: `Detected ${cluster.items.length} occurrences of "${cluster.seed.error_signature}" (top endpoint: ${topEndpoint}). Recommend deriving an automated rule?`,
                    itemIds: cluster.items.map((item) => item.id)
                };
            });
    }

    /**
     * Mark queue entries as processed once they have been turned into proposals.
     */
    async markClusterProcessed(cluster) {
        if (!cluster?.itemIds?.length) return;
        await this.db.query(
            `UPDATE daily_learning_queue SET processed = TRUE WHERE id = ANY($1::int[])`,
            [cluster.itemIds]
        );
    }

    /**
     * Nightly job: fetch -> cluster -> propose -> mark processed.
     */
    async runNightly() {
        const entries = await this.fetchPendingEntries();
        if (!entries.length) {
            this.logger.log('[LearningCore] No pending entries for tonight.');
            return [];
        }

        const clusters = this.clusterEntries(entries);
        const proposals = this.buildProposals(clusters);

        // Mark processed for clusters that produced proposals
        for (const proposal of proposals) {
            await this.markClusterProcessed(proposal);
        }

        this.logger.log(`[LearningCore] Generated ${proposals.length} proposals from ${entries.length} events.`);
        return proposals;
    }

    /**
     * Approve and apply a rule generated by the evolution engine.
     * Expects a learning_rule_proposals table with columns:
     *  - id SERIAL
     *  - target_file TEXT (e.g. "traffic_patterns.json")
     *  - rule_payload JSONB
     *  - applied BOOLEAN DEFAULT FALSE
     */
    async applyNewRule(ruleId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');

            const { rows } = await client.query(
                `SELECT id, target_file, rule_payload
                 FROM learning_rule_proposals
                 WHERE id = $1 AND applied = FALSE
                 FOR UPDATE`,
                [ruleId]
            );

            if (!rows.length) {
                throw new Error(`Rule ${ruleId} not found or already applied`);
            }

            const proposal = rows[0];
            const rawRule = proposal.rule_payload;
            const payload = typeof rawRule === 'string'
                ? JSON.parse(rawRule)
                : (rawRule || {});
            await this._appendRule(proposal.target_file, payload);

            await client.query(
                `UPDATE learning_rule_proposals
                 SET applied = TRUE, applied_at = NOW()
                 WHERE id = $1`,
                [ruleId]
            );

            await client.query('COMMIT');
            this.logger.log(`[LearningCore] Rule ${ruleId} merged into ${proposal.target_file}`);
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error('[LearningCore] applyNewRule failed:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Persist an approved rule into a knowledge-base JSON file.
     */
    async appendRule(fileName, rule) {
        await this._appendRule(fileName, rule);
    }

    async _appendRule(fileName, rule) {
        const target = path.isAbsolute(fileName)
            ? fileName
            : path.join(this.knowledgeDir, fileName);
        let existing = [];

        try {
            const raw = fs.readFileSync(target, 'utf8');
            existing = JSON.parse(raw);
        } catch (error) {
            this.logger.warn(`[LearningCore] Creating new knowledge base file ${target}`);
        }

        existing.push(rule);
        fs.writeFileSync(target, JSON.stringify(existing, null, 2));
        this.logger.log(`[LearningCore] Appended rule to ${target}`);
    }
}

module.exports = LearningCore;

