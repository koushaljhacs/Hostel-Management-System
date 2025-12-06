# HMS-CENTRAL - Centralized Hostel Management System

## Overview

HMS-CENTRAL is the Central Command Server for every hostel campus. It operates on high-spec hardware (2 TB NVMe + 1 Gb/s network) and replaces external caching tiers with PostgreSQL and carefully scoped in-memory maps. The server is the single source of truth, handling multi-layer security, near-real-time data fan-out, and dual-admin governance without paid cloud services.

## Infrastructure & Zero-Cost Policy

- **Hardware Baseline:** 2 TB local storage for hot data + backup snapshots, 1 Gb/s network links, multi-core CPU. This allows PostgreSQL to absorb workloads typically pushed to Redis.
- **Network Stack:** Nginx terminates TLS and proxies to Express; Ngrok exposes controlled public tunnels for distributed nodes.
- **State Strategy:** One shared `pg` pool (`config/database.js`) feeds every service/layer. Local in-memory structures (rate-limit store, trust cache, firewall strikes) sit on top for O(1) lookups.
- **No External Caches:** `config/stateBus.js` now wraps PostgreSQL `LISTEN/NOTIFY` plus EventEmitter fan-out so we avoid running any Redis clusters while keeping the previous API surface.
- **Local Backups:** `security/SecureBackup.js` writes encrypted snapshots directly to the 2 TB storage and verifies checksums before rotating.

## Architecture

### Central Server Highlights
- **PostgreSQL-Only Synchronization:** `real-time/DataSync.js` uses `pg_notify` + WebSockets to broadcast entity deltas; if a notification fails, WebSockets still deliver updates directly.
- **Defense-in-Depth:** The Autonomous Security Engine (ASE) layers (see below) execute in order for every API call, sharing the same `dbPool` for strike persistence and trust lookups.
- **Adaptive Trust:** `security/TrustSystem.js` maintains a 5-minute LRU cache per IP/User in memory, syncing trust deltas back to PostgreSQL tables (`ip_trust`, `user_trust`).
- **Dual-Admin Governance:** `api/adminRoutes.js`, `services/AdminService.js`, and `services/CentralAuthService.js` enforce IT Admin vs Hostel Admin scopes.
- **Real-Time Ops:** `real-time/WebSocketManager.js` multiplexes dashboards, distributed services, and event consumers over `/ws` with JWT authentication.
- **Autonomous Maintenance:** `security/middleware/MaintenanceMiddleware.js` + `security/SecureBackup.js` coordinate daily lockdown, transaction freezing, backup, and resume.
- **Role Portals:** `/student-portal`, `/warden-portal`, and `/chief-warden-portal` expose the bundled HTML control rooms so every stakeholder can access their UI without extra hosting glue.

### 15-Layer Fortress (PostgreSQL Edition)

| Phase | Layer | Purpose | Implementation |
| --- | --- | --- | --- |
| **Network Perimeter** | 1. Traffic Throttling | 100 req/15 min per IP | `express-rate-limit` in `server.js` |
|  | 2. Protocol Hygiene | HSTS, no-sniff, CSP scaffold | `helmet` config in `server.js` |
|  | 3. Content Security | CSP script/style/connect allow list for Ngrok + internal assets | `helmet` directives |
|  | 4. Origin Control | Strict CORS whitelist (Ngrok + localhost) | `cors` middleware |
| **Autonomous Security Engine** | 5. Maintenance Gating | Graceful maintenance windows & POST locks | `security/middleware/MaintenanceMiddleware.js` |
|  | 6. IP Persistence | Blocked IP lookup/write via PostgreSQL `blocked_ips` | `security/layers/FirewallLayer.js` |
|  | 7. Threat Detection | Payload scanning for SQLi/XSS/path traversal | `security/layers/FirewallLayer.js` |
|  | 8. Strike System | In-memory strike Map flushed to `blocked_ips` when threshold met | `FirewallLayer` + `SecureBackup` cleanup |
|  | 9. Gatekeeper | IP reputation, trust gating before controller logic | `security/layers/GateGuard.js` |
| **Adaptive User Tracking** | 10. Trust Score | Postgres-backed trust tables + 5-minute cache | `security/TrustSystem.js` |
|  | 11. Behavioral Analysis | Role vs scope vs request alignment | `security/layers/BuildingWatchman.js` |
| **Application & Logic** | 12. Identity | JWT verification + Postgres sessions | `services/CentralAuthService.js` middleware |
|  | 13. Access Governance | Dual-Admin API segmentation | `api/adminRoutes.js`, `services/AdminService.js` |
|  | 14. Data Integrity | Schema validation before hitting services | `security/layers/BridgeGate.js` |
|  | 15. Persistence | Parameterized SQL only + daily backups | `config/database.js`, `security/SecureBackup.js`, `services/*` |

Each layer sits inside `server.js` in the same sequence so bypassing one layer is impossible without failing earlier checks.

> For a full deep-dive, read [`ARCHITECTURE_POSTGRESQL.md`](ARCHITECTURE_POSTGRESQL.md).

### PostgreSQL as Cache + Message Bus

- **Trust + Firewall:** In-memory `Map` caches (5-minute TTL) reduce trust lookups to O(1). Score changes always persist synchronously to PostgreSQL.
- **Queueing:** High throughput hardware lets us keep `real-time/DataSync.js` queue in memory; on flush we invoke `pg_notify` and WebSocket broadcasts.
- **LISTEN/NOTIFY:** `config/stateBus.js` now initializes a dedicated `LISTEN hms_data_changes` session and returns `publish` helpers so distributed services can subscribe without Redis.
- **Hot Data:** Student snapshots, admin dashboards, and OTP state live in Postgres with tuned indexes (see `database/schema.sql`) so we avoid duplicating data in Redis.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hms_central
DB_USER=postgres
DB_PASSWORD=shivani

# Optional Tunnels (Ngrok, etc.)
ALLOWED_ORIGINS=http://localhost:3000,https://<your-ngrok-subdomain>.ngrok.io

# State Bus (optional)
STATE_BUS_CHANNEL=hms_data_changes

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Server
PORT=3000
NODE_ENV=development
```

> pgAdmin setup: create the `hms_central` database (owner `postgres`) and set the password to `shivani` so both pgAdmin and the Node.js app share the same credential.

3. Setup database:
```bash
# Run database migrations
# (See database/ folder for SQL scripts)
```

4. Start server:
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - Student registration

### Admin
- `GET /api/admin/pending-students` - Get pending students
- `POST /api/admin/approve-student` - Approve student

### Student
- `GET /api/student/profile` - Get student profile

### Warden
- `GET /api/warden/hostel/overview` - Hostel capacity + booking summary for assigned hostel
- `GET /api/warden/hostel/students` - Students + bookings within scope
- `GET /api/warden/hostel/rooms` - Room availability grid
- `PATCH /api/warden/rooms/:roomId/status` - Toggle room availability/maintenance
- `POST /api/warden/bookings/:bookingId/check-in` - Confirm check-in and update bookings table

### Chief Warden
- `GET /api/chief-warden/overview` - Campus-wide utilization snapshot
- `GET /api/chief-warden/wardens` - Warden roster mapped to hostels
- `GET /api/chief-warden/high-risk` - High occupancy hostels
- `GET /api/chief-warden/security-feed` - Recent firewall/security events

## WebSocket

Connect to WebSocket at: `ws://localhost:3000/ws`

### Message Types
- `authenticate` - Authenticate client
- `subscribe` - Subscribe to channel
- `unsubscribe` - Unsubscribe from channel
- `ping` - Keep-alive

### Channels
- `entity:student` - Student updates
- `entity:booking` - Booking updates
- `action:created` - Creation events
- `action:updated` - Update events

## Distributed Services

The central server communicates with distributed microservices:
- Registration Service
- Student Service
- Admin Service
- Warden Service
- Chief Warden Service
- Booking Service

## Security
- 15-layer Autonomous Security Engine (ASE) enforced inside `server.js`.
- Trust & strike data persisted in PostgreSQL with in-memory acceleration.
- Automated maintenance + encrypted backups guarded by safety checks.
- CSP, strict CORS, and Ngrok-aware headers harden the perimeter.

## Swarm Intelligence System

HMS-CENTRAL includes an autonomous AI Swarm that self-heals and self-learns:

- **Worker Agents:** TrafficPilot (auto-scaling), FinanceGuard (payment recovery), BookingMedic (race condition fixes), SystemMechanic (service restoration), GuardianAgent (anomaly detection), MentorAgent (trust warnings)
- **Master Overseer:** Central brain that monitors all agents, restarts crashed workers, and aggregates daily reports
- **Learning Core:** Nightly clustering of unknown errors into rule proposals for human approval
- **Mission Control UI:** Real-time dashboard in IT Admin Console showing agent health, remediation queue, and learning lab

### Chaos Testing

Validate the Swarm's self-healing capabilities using the chaos simulator:

```bash
# Test learning pipeline (injects 50 payment timeouts)
npm run chaos -- --scenario=learning

# Test Red Phone approval workflow
npm run chaos -- --scenario=critical

# Test GuardianAgent anomaly detection
npm run chaos -- --scenario=guardian --student=420

# Test firewall alerting
npm run chaos -- --scenario=firewall --ip=203.0.113.99
```

See [`HMS_SWARM_MANUAL.md`](HMS_SWARM_MANUAL.md) for complete documentation on using Mission Control, approving rules, and understanding agent status lights.

## License

MIT

