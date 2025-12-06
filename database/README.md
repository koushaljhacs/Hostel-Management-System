# Database Setup Guide

## Quick Setup

1. **Create Database** (if not exists):
```sql
CREATE DATABASE hms_central;
```

2. **Run Setup Script**:
```bash
node database/setup-database.js
```

Or manually run the SQL:
```bash
psql -U postgres -d hms_central -f database/schema.sql
```

## Database Schema

The database includes:

### Core Tables
- `roles` - User roles (Admin, Warden, Student, etc.)
- `users` - System users
- `students` - Student registrations
- `role_permissions` - Role-based permissions

### Security Tables
- `blocked_ips` - Blocked IP addresses
- `activity_logs` - Request activity logs
- `email_logs` - Email sending logs
- `otp_verifications` - OTP verification records
- `user_trust` - User trust scores
- `ip_trust` - IP trust scores

### System Tables
- `system_status` - System status (maintenance mode, etc.)
- `data_sync_log` - Real-time sync logs

### Hostel Management Tables
- `hostels` - Hostel information
- `rooms` - Room information
- `bookings` - Booking records

## Environment Variables

Make sure your `.env` file has:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hms_central
DB_USER=postgres
DB_PASSWORD=shivani
```

## Verification

After setup, verify tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

> **pgAdmin note:** When adding the connection manually, set the password to `shivani` so the setup script and the application use the exact same credential.

## Default Roles

The schema creates these default roles:
1. Super Admin (hierarchy: 1)
2. Admin (hierarchy: 2)
3. Chief Warden (hierarchy: 3)
4. Warden (hierarchy: 4)
5. Student (hierarchy: 5)


