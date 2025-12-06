/**
 * HMS-CENTRAL-COPY/database/schema.sql
 * ============================================
 * HMS-CENTRAL Distributed Database Cluster Schema
 * STATUS: FINAL PRODUCTION FIX
 * UPDATED: Added 'Nuclear Drop' logic to fix "is not a materialized view" error.
 * ============================================
 */

-- ============================================
-- 0. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. ROLES & PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    hierarchy_level INTEGER NOT NULL,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_name)
);

-- ============================================
-- 2. HOSTEL CORE STRUCTURE
-- ============================================
CREATE TABLE IF NOT EXISTS hostels (
    hostel_id SERIAL PRIMARY KEY,
    hostel_name VARCHAR(100) NOT NULL,
    hostel_code VARCHAR(20) UNIQUE NOT NULL,
    gender_type VARCHAR(10) NOT NULL,
    is_ac BOOLEAN DEFAULT FALSE,
    address TEXT,
    capacity INTEGER NOT NULL,
    current_occupancy INTEGER DEFAULT 0,
    warden_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mess_facilities (
    mess_id SERIAL PRIMARY KEY,
    hostel_id INTEGER REFERENCES hostels(hostel_id) ON DELETE CASCADE UNIQUE NOT NULL,
    mess_name VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. USERS & AUTHENTICATION
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role_id INTEGER REFERENCES roles(role_id),
    full_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    assigned_hostel_id INTEGER REFERENCES hostels(hostel_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    phone_number VARCHAR(15),
    login_attempts INTEGER DEFAULT 0,
    account_locked BOOLEAN DEFAULT false,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. EMPLOYEE MANAGEMENT
-- ============================================
CREATE TABLE IF NOT EXISTS designations (
    designation_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_management BOOLEAN DEFAULT FALSE,
    min_staff_count INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) UNIQUE NOT NULL,
    designation_id INTEGER REFERENCES designations(designation_id) NOT NULL,
    date_of_joining DATE NOT NULL,
    salary_amount DECIMAL(10, 2) DEFAULT 0.00,
    staff_gender VARCHAR(10) NOT NULL,
    is_on_leave BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shift_schedules (
    shift_id SERIAL PRIMARY KEY,
    shift_name VARCHAR(50) UNIQUE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS staff_assignments (
    assignment_id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(employee_id) ON DELETE CASCADE NOT NULL,
    hostel_id INTEGER REFERENCES hostels(hostel_id) ON DELETE CASCADE,
    mess_id INTEGER REFERENCES mess_facilities(mess_id) ON DELETE CASCADE,
    designation_id INTEGER REFERENCES designations(designation_id),
    shift_id INTEGER REFERENCES shift_schedules(shift_id),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, shift_id, start_date)
);

-- ============================================
-- 5. STUDENTS & ACADEMICS
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) UNIQUE,
    guardian_name VARCHAR(100) DEFAULT 'Not Provided',
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    age INTEGER,
    current_year INTEGER NOT NULL,
    branch VARCHAR(100) NOT NULL,
    course VARCHAR(100) NOT NULL,
    section VARCHAR(10) NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    university_roll_no VARCHAR(50) UNIQUE NOT NULL,
    cpi DECIMAL(3,2) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by_user_id INTEGER REFERENCES users(user_id),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. ROOMS & BOOKINGS
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
    room_id SERIAL PRIMARY KEY,
    hostel_id INTEGER REFERENCES hostels(hostel_id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor_number INTEGER,
    capacity INTEGER NOT NULL,
    current_occupancy INTEGER DEFAULT 0,
    available_beds INTEGER DEFAULT 0,
    room_type VARCHAR(50) NOT NULL,
    is_ac BOOLEAN DEFAULT FALSE,
    amenities JSONB,
    status VARCHAR(20) DEFAULT 'available',
    is_locked BOOLEAN DEFAULT FALSE,
    lock_expires_at TIMESTAMP,
    last_booking_attempt TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hostel_id, room_number)
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    hostel_id INTEGER REFERENCES hostels(hostel_id),
    room_id INTEGER REFERENCES rooms(room_id),
    booking_date DATE NOT NULL,
    check_in_date DATE,
    check_out_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(user_id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS floor_plans (
    floor_plan_id SERIAL PRIMARY KEY,
    hostel_id INTEGER REFERENCES hostels(hostel_id) ON DELETE CASCADE NOT NULL,
    floor_number INTEGER NOT NULL,
    floor_name VARCHAR(50),
    total_rooms INTEGER NOT NULL,
    total_capacity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hostel_id, floor_number)
);

-- ============================================
-- 6A. HIGH-FREQUENCY BOOKING TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS room_locks (
    lock_id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(room_id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id),
    session_id VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_queue (
    queue_id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    room_id INTEGER REFERENCES rooms(room_id),
    hostel_id INTEGER REFERENCES hostels(hostel_id),
    status VARCHAR(20) DEFAULT 'pending',
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS room_availability_cache (
    room_id INTEGER REFERENCES rooms(room_id) PRIMARY KEY,
    hostel_id INTEGER REFERENCES hostels(hostel_id),
    available_beds INTEGER NOT NULL,
    total_capacity INTEGER NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- ============================================
-- 7. TRANSPORT MANAGEMENT
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    hostel_id INTEGER REFERENCES hostels(hostel_id),
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    seating_capacity INTEGER DEFAULT 1,
    current_driver_id INTEGER REFERENCES employees(employee_id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. AI & HIGH PERFORMANCE
-- ============================================
CREATE TABLE IF NOT EXISTS student_metadata (
    student_id INTEGER REFERENCES students(id) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(50),
    hostel_code VARCHAR(20),
    contact_number VARCHAR(15),
    academic_status VARCHAR(100),
    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id)
);

-- [CRITICAL FIX] Drop anything named available_rooms to avoid type conflicts
DROP TABLE IF EXISTS available_rooms CASCADE;
DROP VIEW IF EXISTS available_rooms CASCADE;
DROP MATERIALIZED VIEW IF EXISTS available_rooms CASCADE;

CREATE MATERIALIZED VIEW available_rooms AS
SELECT 
    r.room_id,
    r.hostel_id,
    r.room_number,
    r.capacity,
    (r.capacity - r.current_occupancy) as available_beds,
    r.is_ac,
    h.gender_type,
    h.hostel_code
FROM rooms r
JOIN hostels h ON r.hostel_id = h.hostel_id
WHERE r.status = 'available';

-- ============================================
-- 9. SECURITY & MONITORING
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_ips (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    user_agent TEXT,
    firewall_reason VARCHAR(100),
    user_id INTEGER REFERENCES users(user_id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    email_address VARCHAR(255) NOT NULL,
    otp_code VARCHAR(64),
    message_id VARCHAR(255),
    email_type VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    otp_code VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. TRUST SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS user_trust (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    trust_score DECIMAL(5,2) DEFAULT 50.00,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    violations INTEGER DEFAULT 0,
    trust_level VARCHAR(20) DEFAULT 'MEDIUM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS ip_trust (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    trust_score DECIMAL(5,2) DEFAULT 50.00,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    violations INTEGER DEFAULT 0,
    trust_level VARCHAR(20) DEFAULT 'MEDIUM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. SYSTEM STATUS & SYNC
-- ============================================
CREATE TABLE IF NOT EXISTS system_status (
    id SERIAL PRIMARY KEY,
    status_key VARCHAR(100) UNIQUE NOT NULL,
    status_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_sync_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    data JSONB,
    user_id INTEGER REFERENCES users(user_id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 12. AI & SWARM TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS daily_learning_queue (
    id SERIAL PRIMARY KEY,
    agent VARCHAR(100) NOT NULL,
    error_signature TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    proposal_id INTEGER
);

CREATE TABLE IF NOT EXISTS learning_rule_proposals (
    id SERIAL PRIMARY KEY,
    pattern TEXT NOT NULL,
    proposed_fix TEXT,
    confidence_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warden_incidents (
    id SERIAL PRIMARY KEY,
    student_id INTEGER,
    incident_type VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_creation_requests (
    request_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL,
    role_id INTEGER REFERENCES roles(role_id),
    identifier_id VARCHAR(50),
    password_hash VARCHAR(255),
    created_by INTEGER REFERENCES users(user_id),
    hostel_id INTEGER REFERENCES hostels(hostel_id),
    status VARCHAR(20) DEFAULT 'pending_approval',
    request_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 13. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_roll_no ON students(university_roll_no);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_activity_logs_ip ON activity_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_rooms_hostel_number ON rooms(hostel_id, room_number);

-- **PERFORMANCE FIX**: Added index to optimize reads for Redis caching layer and reports.
CREATE INDEX IF NOT EXISTS idx_rooms_available_beds ON rooms(available_beds);


-- =========================================================================
--  SELF-HEALING & AUTOMATION SECTION (RUNS ON SETUP)
-- =========================================================================

-- A. PATCH EXISTING TABLES
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(100) DEFAULT 'Not Provided';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS available_beds INTEGER DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMP;

-- Ensure Unique Constraint on user_id
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_user_id_key') THEN
        ALTER TABLE students ADD CONSTRAINT students_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- B. INITIAL ROLES & DESIGNATIONS
INSERT INTO roles (role_name, description, hierarchy_level, permissions) VALUES
('Super Admin', 'Full system control', 1, '{"all": true}'),
('Hostel Admin', 'Domain control', 2, '{"hostel": true}'),
('Warden', 'Warden', 3, '{"room": true}'),
('Student', 'Student', 4, '{"book": true}'),
('Assistant Warden', 'Staff', 4, '{"view": true}'),
('Housekeeping Staff', 'Staff', 5, '{"clean": true}'),
('Driver', 'Staff', 5, '{"drive": true}')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO shift_schedules (shift_name, start_time, end_time) VALUES
('Day Shift', '08:00:00', '20:00:00'),
('Night Shift', '20:00:00', '08:00:00'),
('Morning Mess', '06:00:00', '14:00:00'),
('Evening Mess', '14:00:00', '22:00:00')
ON CONFLICT (shift_name) DO NOTHING;

INSERT INTO designations (name, is_management, min_staff_count) VALUES
('Warden', TRUE, 1),
('Assistant Warden', FALSE, 2),
('Peon', FALSE, 2),
('Housekeeping Staff', FALSE, 1),
('Ambulance Driver', FALSE, 2),
('Auto Driver', FALSE, 2)
ON CONFLICT (name) DO NOTHING;

-- C. POPULATE HOSTELS
INSERT INTO hostels (hostel_name, hostel_code, gender_type, is_ac, capacity) VALUES
('Hostel A', 'BOYS-A', 'male', false, 225),
('Hostel B', 'BOYS-B', 'male', false, 225),
('Hostel C', 'BOYS-C', 'male', false, 225),
('Hostel D', 'BOYS-D', 'male', false, 225),
('Hostel E', 'BOYS-E', 'male', false, 200),
('Hostel F', 'BOYS-F', 'male', false, 200),
('Hostel G', 'BOYS-G', 'male', false, 200),
('Hostel H', 'BOYS-H', 'male', false, 200),
('Hostel I', 'BOYS-I', 'male', false, 100),
('Hostel J', 'BOYS-J', 'male', false, 100),
('Wing 1', 'BOYS-W1', 'male', true, 75),
('Wing 2', 'BOYS-W2', 'male', true, 75),
('Wing 3', 'BOYS-W3', 'male', true, 75),
('Wing 4', 'BOYS-W4', 'male', false, 75),
('Wing 5', 'BOYS-W5', 'male', false, 75),
('Hostel A', 'GIRLS-A', 'female', false, 150),
('Hostel B', 'GIRLS-B', 'female', false, 150),
('Hostel C', 'GIRLS-C', 'female', false, 150),
('Hostel D', 'GIRLS-D', 'female', false, 75),
('Hostel E', 'GIRLS-E', 'female', false, 75),
('Hostel F', 'GIRLS-F', 'female', true, 75)
ON CONFLICT (hostel_code) DO NOTHING;

-- D. LINK MESS FACILITIES
INSERT INTO mess_facilities (hostel_id, mess_name, capacity)
SELECT hostel_id, hostel_name || ' Mess', capacity FROM hostels
ON CONFLICT (hostel_id) DO NOTHING;

-- E. CREATE ROOM POPULATION FUNCTION
CREATE OR REPLACE FUNCTION populate_hostel_rooms()
RETURNS void AS $$
DECLARE
    hostel_record RECORD;
    room_counter INTEGER;
    floor_num INTEGER;
    max_floors INTEGER;
    rooms_per_floor INTEGER;
    room_capacity INTEGER;
BEGIN
    FOR hostel_record IN SELECT hostel_id, hostel_code, capacity FROM hostels LOOP
        -- Define Rules based on your requirements
        IF hostel_record.hostel_code LIKE 'BOYS-A%' OR hostel_record.hostel_code LIKE 'BOYS-B%' OR 
           hostel_record.hostel_code LIKE 'BOYS-C%' OR hostel_record.hostel_code LIKE 'BOYS-D%' THEN
            max_floors := 3; rooms_per_floor := 25; room_capacity := 3;
        
        ELSIF hostel_record.hostel_code LIKE 'BOYS-E%' OR hostel_record.hostel_code LIKE 'BOYS-F%' OR 
              hostel_record.hostel_code LIKE 'BOYS-G%' OR hostel_record.hostel_code LIKE 'BOYS-H%' THEN
            max_floors := 4; rooms_per_floor := 25; room_capacity := 2;
        
        ELSIF hostel_record.hostel_code LIKE 'BOYS-I%' OR hostel_record.hostel_code LIKE 'BOYS-J%' THEN
            max_floors := 4; rooms_per_floor := 25; room_capacity := 1;
        
        ELSIF hostel_record.hostel_code LIKE 'BOYS-W%' THEN
            max_floors := 3; rooms_per_floor := 25; room_capacity := 1;
        
        ELSIF hostel_record.hostel_code LIKE 'GIRLS-A%' OR hostel_record.hostel_code LIKE 'GIRLS-B%' OR 
              hostel_record.hostel_code LIKE 'GIRLS-C%' THEN
            max_floors := 3; rooms_per_floor := 25; room_capacity := 2;
        
        ELSIF hostel_record.hostel_code LIKE 'GIRLS-D%' OR hostel_record.hostel_code LIKE 'GIRLS-E%' THEN
            max_floors := 3; rooms_per_floor := 25; room_capacity := 1;
        
        ELSIF hostel_record.hostel_code LIKE 'GIRLS-F%' THEN
            max_floors := 3; rooms_per_floor := 25; room_capacity := 1;
        
        ELSE
            CONTINUE;
        END IF;

        -- Generate Rooms
        FOR floor_num IN 0..(max_floors - 1) LOOP
            FOR room_counter IN 1..rooms_per_floor LOOP
                INSERT INTO rooms (
                    hostel_id, room_number, floor_number, capacity, room_type, is_ac, amenities, available_beds
                ) VALUES (
                    hostel_record.hostel_id,
                    (floor_num + 1) * 100 + room_counter,
                    floor_num,
                    room_capacity,
                    CASE WHEN room_capacity = 1 THEN 'Single' WHEN room_capacity = 2 THEN 'Double' ELSE 'Triple' END,
                    hostel_record.hostel_code LIKE '%W%' OR hostel_record.hostel_code = 'GIRLS-F',
                    '{"bed": true, "table": true}'::jsonb,
                    room_capacity
                ) ON CONFLICT (hostel_id, room_number) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute Logic
SELECT populate_hostel_rooms();

-- F. VEHICLE SETUP
INSERT INTO vehicles (hostel_id, registration_number, vehicle_type, seating_capacity)
SELECT hostel_id, 'AMB-' || hostel_code, 'Ambulance', 2 FROM hostels
ON CONFLICT (registration_number) DO NOTHING;

INSERT INTO vehicles (hostel_id, registration_number, vehicle_type, seating_capacity)
SELECT hostel_id, 'AUTO-' || hostel_code, 'Auto Rickshaw', 3 FROM hostels
ON CONFLICT (registration_number) DO NOTHING;

-- G. REFRESH TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();