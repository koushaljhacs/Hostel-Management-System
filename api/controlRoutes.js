const express = require('express');
const router = express.Router();
const LearningCore = require('../ai-engine/core/LearningCore');
const logger = require('../config/logger');

let masterOverseer = null;
let dbPool = null;
let learningCore = null;

function initializeControlRoutes(overseer, pool) {
    masterOverseer = overseer;
    dbPool = pool;
    learningCore = new LearningCore({ db: dbPool });
    logger.info('Control Routes initialized');
}

router.get('/remediation-queue', (req, res) => {
    if (!masterOverseer) {
        return res.status(503).json({ success: false, message: 'Master Overseer unavailable' });
    }

    const queue = masterOverseer.getPendingApprovals();
    res.json({ success: true, queue });
});

router.get('/evolution-proposals', async (req, res) => {
    if (!dbPool) {
        return res.status(503).json({ success: false, message: 'Database unavailable' });
    }

    try {
        const { rows } = await dbPool.query(`
            SELECT id, target_file, rule_payload, confidence, created_at
            FROM learning_rule_proposals
            WHERE applied = FALSE
            ORDER BY created_at DESC
            LIMIT 200
        `);

        const proposals = rows.map((row) => {
            let payload = {};
            try {
                payload = typeof row.rule_payload === 'string'
                    ? JSON.parse(row.rule_payload)
                    : (row.rule_payload || {});
            } catch (error) {
                payload = {};
            }

            return {
                id: row.id,
                targetFile: row.target_file,
                pattern: payload.pattern || payload.signature || 'Unknown pattern',
                proposedFix: payload.proposed_fix || payload.action || 'N/A',
                confidence: row.confidence || payload.confidence || null,
                createdAt: row.created_at
            };
        });

        res.json({ success: true, proposals });
    } catch (error) {
        logger.error('Error fetching evolution proposals', { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Failed to fetch proposals' });
    }
});

router.post('/approve-rule', async (req, res) => {
    const { ruleId } = req.body;
    if (!ruleId) {
        return res.status(400).json({ success: false, message: 'ruleId is required' });
    }

    if (!learningCore) {
        return res.status(503).json({ success: false, message: 'Learning Core unavailable' });
    }

    try {
        await learningCore.applyNewRule(ruleId);
        res.json({ success: true, message: 'Rule applied successfully' });
    } catch (error) {
        logger.error('Error applying new rule', { error: error.message, stack: error.stack, ruleId });
        res.status(500).json({ success: false, message: error.message || 'Failed to apply rule' });
    }
});

module.exports = { router, initializeControlRoutes };


