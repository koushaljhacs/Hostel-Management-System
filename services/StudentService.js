const logger = require('../config/logger');

/**
 * HMS-CENTRAL-COPY/services/StudentService.js
 * * Student Management Service (Core Business Logic).
 * * Handles student registration, profile management, and status updates.
 * * This service commits the new student record to the Distributed Database Cluster 
 * * and initiates the Real-Time Sync.
 */

class StudentService {
    constructor(dbPool, dataSync) {
        this.dbPool = dbPool;
        this.dataSync = dataSync; // Real-Time Data Sync Engine
    }

    /**
     * Register a new student after BridgeGate validation.
     * Inserts the record with status 'pending' (The "Validation Queue").
     * * @param {object} studentData - Validated student data from BridgeGate
     * @returns {object} - The newly created student record
     */
    async registerStudent(studentData) {
        try {
            // STEP 3: Central Server Processing -> Data receives final validation stamp.
            // Insert into the 'students' table with 'pending' status
            const query = `
                INSERT INTO students (
                    first_name, middle_name, last_name, gender, date_of_birth, age,
                    current_year, branch, course, section, contact_number, 
                    university_roll_no, cpi, state, city, pincode, email,
                    status, registration_date, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
                    'pending', NOW(), NOW())
                RETURNING id, first_name, email, university_roll_no, status
            `;

            const result = await this.dbPool.query(query, [
                studentData.firstName,
                studentData.middleName,
                studentData.lastName,
                studentData.gender,
                studentData.dob,
                studentData.age, // Age is calculated during validation
                studentData.currentYear,
                studentData.branch,
                studentData.course,
                studentData.section,
                studentData.contactNumber,
                studentData.rollNo,
                studentData.cpi,
                studentData.state,
                studentData.city,
                studentData.pincode,
                studentData.email
            ]);

            const student = result.rows[0];

            // Distributed to ALL database clusters simultaneously
            // Real-time sync across all services
            if (this.dataSync) {
                await this.dataSync.syncStudentRegistration(student.id, student);
            }

            // NOTE: The student record in the 'students' table is correctly set to 'pending'.
            // The corresponding record in the 'users' table (created elsewhere) must also be 'pending'.

            return {
                studentId: student.id,
                studentData: student
            };
        } catch (err) {
            logger.error('Student registration error:', err);
            // Throw a specific error to be handled by the API layer (server.js)
            throw new Error('Failed to save student record to database.');
        }
    }

    /**
     * Get student by ID (Basic data retrieval)
     */
    async getStudentById(studentId) {
        try {
            const query = 'SELECT * FROM students WHERE id = $1';
            const result = await this.dbPool.query(query, [studentId]);
            return result.rows[0] || null;
        } catch (err) {
            logger.error('Get student error:', err);
            throw err;
        }
    }
}

module.exports = StudentService;