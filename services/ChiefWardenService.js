const pool = require('../config/database');
const logger = require('../config/logger');
const StudentApprovalService = require('./StudentApprovalService'); // Dependency

class ChiefWardenService {

    /**
     * Retrieves all student applications with 'pending' status.
     * @returns {Promise<Array>} List of pending applications.
     */
    static async getPendingStudentApprovals() {
        try {
            // Assumes a 'students' table with a 'status' column
            const query = `
                SELECT 
                    s.student_id, s.username, s.email, s.application_date, s.status,
                    h.hostel_name
                FROM 
                    students s
                JOIN 
                    hostels h ON s.preferred_hostel_id = h.hostel_id
                WHERE 
                    s.status = 'pending'
                ORDER BY 
                    s.application_date ASC;
            `;
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            logger.error('Error in getPendingStudentApprovals:', error);
            // Re-throw database errors cleanly
            throw new Error('Database error retrieving pending approvals.');
        }
    }

    /**
     * Approves a student, triggering registration and room assignment.
     * @param {string} studentId
     * @returns {Promise<object>} Result object.
     */
    static async approveStudent(studentId) {
        // The service logic is now simplified to rely on StudentApprovalService
        try {
            // The delegated service now returns a structured object instead of throwing a generic error
            const result = await StudentApprovalService.processApproval(studentId);
            
            if (result.success) {
                logger.info(`Student ${studentId} approved and registered. Room: ${result.roomId}`);
            } else {
                logger.warn(`Approval failed for student ${studentId}: ${result.message}`);
            }
            return result;
        } catch (error) {
            // This catch block should only run if an unexpected error occurs in the calling layer, not the transaction layer
            logger.error(`ChiefWardenService unexpected error approving student ${studentId}:`, error);
            return { success: false, message: 'Internal error during student approval process.' };
        }
    }

    /**
     * Gets occupancy report for a given hostel.
     * ** PRODUCTION FIX: Improved query efficiency and added explicit hostel check. **
     * @param {string} hostelId
     * @returns {Promise<object>} Occupancy details.
     */
    static async getHostelOccupancy(hostelId) {
        try {
            // Check for hostel existence and get its name in ONE query
            const query = `
                SELECT 
                    r.room_number, r.capacity, r.status, s.username, s.student_id,
                    h.hostel_name
                FROM 
                    rooms r
                LEFT JOIN 
                    students s ON r.current_student_id = s.student_id
                RIGHT JOIN
                    hostels h ON r.hostel_id = h.hostel_id
                WHERE 
                    h.hostel_id = $1
                ORDER BY 
                    r.room_number;
            `;
            const result = await pool.query(query, [hostelId]);

            if (result.rows.length === 0) {
                // Check if the hostel itself exists by querying hostels directly
                const hostelCheck = await pool.query('SELECT hostel_name FROM hostels WHERE hostel_id = $1', [hostelId]);
                if (hostelCheck.rowCount === 0) {
                     return { success: false, message: 'Hostel not found.' };
                }
                // If hostel exists but has no rooms, return empty occupancy
                return {
                     success: true,
                     hostelName: hostelCheck.rows[0].hostel_name,
                     details: [],
                     totalRooms: 0,
                     occupied: 0
                };
            }
            
            // Data aggregation
            return {
                success: true,
                hostelName: result.rows[0].hostel_name, // Get name from the first row
                details: result.rows,
                totalRooms: result.rows.length,
                occupied: result.rows.filter(row => row.status === 'occupied').length
            };
        } catch (error) {
            logger.error(`Error in getHostelOccupancy for ${hostelId}:`, error);
            // Re-throw database errors cleanly
            throw new Error('Database error retrieving occupancy report.');
        }
    }
}

module.exports = ChiefWardenService;