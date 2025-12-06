#!/usr/bin/env node

/**
 * HMS-CENTRAL Chaos Scenario Simulator
 * * FIXED: Now uses 'ai_master' channel prefix so MasterOverseer can hear it.
 */

require('dotenv').config();
const { dbPool } = require('../config/database');
const PostgresBus = require('../ai-engine/core/PostgresBus');
const logger = require('../config/logger');

const args = process.argv.slice(2);
const scenarioArg = args.find((arg) => arg.startsWith('--scenario='));
const scenario = scenarioArg ? scenarioArg.split('=')[1] : null;

const getOption = (key, fallback = null) => {
    const entry = args.find((arg) => arg.startsWith(`--${key}=`));
    if (!entry) return fallback;
    return entry.split('=')[1];
};

if (!scenario) {
    logger.error('❌ Missing --scenario option.');
    logger.error('Supported values: learning, critical, guardian, firewall');
    process.exit(1);
}

async function ensureTable(tableName, createSQL) {
    try {
        await dbPool.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
    } catch (error) {
        logger.info(`📋 Creating missing table: ${tableName}...`);
        try {
            await dbPool.query(createSQL);
            logger.info(`✅ Table ${tableName} created.`);
        } catch (createError) {
            logger.warn(`⚠️  Could not create ${tableName}: ${createError.message}`);
        }
    }
}

async function simulateLearning() {
    logger.info('🧪 [LEARNING SCENARIO] Injecting 50 fake Payment Gateway timeouts...');
    
    await ensureTable('daily_learning_queue', `
        CREATE TABLE IF NOT EXISTS daily_learning_queue (
            id SERIAL PRIMARY KEY,
            agent VARCHAR(100) NOT NULL,
            error_signature TEXT NOT NULL,
            payload JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            processed BOOLEAN DEFAULT FALSE,
            proposal_id INTEGER
        )
    `);

    const errorPayload = {
        endpoint: '/api/payments/charge',
        gateway: 'CentralBank',
        signature: 'PaymentGatewayError: Timeout at 5000ms',
        message: 'PaymentGatewayError: Timeout at 5000ms',
        timestamp: new Date().toISOString()
    };

    const insertSQL = `
        INSERT INTO daily_learning_queue (agent, error_signature, payload, created_at, processed)
        VALUES ($1, $2, $3, NOW(), FALSE)
    `;

    for (let i = 0; i < 50; i++) {
        await dbPool.query(insertSQL, [
            'FinanceGuard',
            errorPayload.signature,
            JSON.stringify({ ...errorPayload, attempt: i + 1, batch: 'chaos_test' })
        ]);
    }

    logger.info('✅ Chaos injected: 50 entries added to daily_learning_queue');
}

async function simulateCritical() {
    logger.info('🚨 [CRITICAL SCENARIO] Broadcasting HIGH severity remediation request...');

    // FIX: Changed channelPrefix to 'ai_master' to match MasterOverseer
    const bus = new PostgresBus({ channelPrefix: 'ai_master' });
    await bus.ready;

    const payload = {
        action: 'DROP TABLE old_audit_logs',
        reason: 'Storage Critical (99%)',
        severity: 'HIGH',
        description: 'Disk usage at 99%. Old audit logs table consuming 45GB. Recommend immediate cleanup.',
        origin: 'ChaosGenerator',
        timestamp: new Date().toISOString()
    };

    await bus.safePublish('approval_requests', {
        id: `chaos_${Date.now()}`,
        payload: payload,
        timestamp: new Date().toISOString()
    });

    logger.info('✅ Approval request dispatched via PostgresBus (Channel: ai_master_approval_requests)');
    logger.info('📊 Expected behavior:');
    logger.info('   - MasterOverseer will receive the request.');
    logger.info('   - "Red Phone" modal should appear on IT Admin dashboard.');
    logger.info('   - Email alert should be sent to Developer Email.');
}

async function simulateGuardian() {
    const studentId = parseInt(getOption('student', '101'), 10);
    const hostelId = parseInt(getOption('hostel', '1'), 10);

    logger.info(`👻 [GUARDIAN SCENARIO] Triggering anomaly for student ${studentId}...`);

    await ensureTable('warden_incidents', `
        CREATE TABLE IF NOT EXISTS warden_incidents (
            id SERIAL PRIMARY KEY,
            student_id INTEGER,
            incident_type VARCHAR(100) NOT NULL,
            details JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            resolved BOOLEAN DEFAULT FALSE
        )
    `);

    // FIX: Changed channelPrefix to 'ai_master'
    const bus = new PostgresBus({ channelPrefix: 'ai_master' });
    await bus.ready;

    const metricsPayload = {
        studentId,
        hostelId,
        attendanceCount: 0,
        messUsage: 3,
        period: 'last_3_days',
        notes: 'Absent in attendance logs but recorded mess swipes (Chaos Test)',
        timestamp: new Date().toISOString()
    };

    await bus.safePublish('warden_metrics', metricsPayload);
    logger.info('✅ GuardianAgent notified via state bus');
}

async function simulateFirewall() {
    const ip = getOption('ip', '203.0.113.77');
    logger.info(`🔥 [FIREWALL SCENARIO] Publishing HIGH severity firewall alert for IP ${ip}...`);

    // FIX: Changed channelPrefix to 'ai_master'
    const bus = new PostgresBus({ channelPrefix: 'ai_master' });
    await bus.ready;

    const alertPayload = {
        severity: 'HIGH',
        ip,
        reason: 'Simulated DDoS burst from Chaos Generator',
        timestamp: new Date().toISOString(),
        type: 'FIREWALL_ALERT'
    };

    await bus.safePublish('security_alerts', alertPayload);
    logger.info('✅ Firewall alert queued via PostgresBus');
}

(async () => {
    try {
        logger.info('🎲 HMS-CENTRAL Chaos Simulator');
        logger.info('================================\n');

        switch (scenario) {
            case 'learning': await simulateLearning(); break;
            case 'critical': await simulateCritical(); break;
            case 'guardian': await simulateGuardian(); break;
            case 'firewall': await simulateFirewall(); break;
            default:
                logger.error(`❌ Unsupported scenario "${scenario}".`);
                process.exit(1);
        }

        logger.info('\n✅ Chaos simulation completed successfully!');
    } catch (error) {
        logger.error('🔥 Chaos simulation failed:', error.message);
        process.exit(1);
    } finally {
        await dbPool.end();
        process.exit(0);
    }
})();
