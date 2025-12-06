const { dbPool } = require('../config/database');
const logger = require('../config/logger');
const { hashPassword } = require('./CentralAuthService'); 
const UserCreationService = require('./UserCreationService');

const MIN_PASSWORD_LENGTH = 8; 

class AdminService {
    /**
     * Creates a new user (intended for initial setup by an IT Admin).
     * @param {object} userData - Contains username, password, role, personal details.
     * @returns {Promise<object>} Result of the user creation.
     */
    static async createNewAdminUser(userData) {
        const { username, password, role, email, phone } = userData;
        
        try {
            if (!['admin', 'chief_warden', 'warden', 'student'].includes(role)) {
                logger.warn(`AdminService tried to create user with forbidden role: ${role}`);
                return { success: false, message: `Role ${role} cannot be created via this endpoint.` };
            }

            const userCreationResult = await UserCreationService.createUser({
                username, 
                password, 
                role, 
                email, 
                phone
            });
            
            if (userCreationResult.success) {
                logger.info(`New ${role} user created: ${username}`);
                return { success: true, userId: userCreationResult.userId, message: 'User created successfully.' };
            } else {
                return userCreationResult;
            }

        } catch (error) {
            logger.error(`Error in AdminService.createNewAdminUser for ${username}:`, error);
            return { success: false, message: 'An internal server error occurred during user creation.' };
        }
    }

    /**
     * Resets a user's password using administrative power.
     * @param {string} userId - ID of the user whose password needs reset.
     * @param {string} newPassword - The new plain text password.
     * @returns {Promise<boolean>} True on successful reset.
     */
    static async adminResetPassword(userId, newPassword) {
        try {
            if (!userId || !newPassword) {
                logger.warn('Admin password reset failed: Missing user ID or new password.');
                return false;
            }
            if (newPassword.length < MIN_PASSWORD_LENGTH) {
                logger.warn(`Admin password reset failed: New password too short (min ${MIN_PASSWORD_LENGTH} chars).`);
                return false;
            }

            const newPasswordHash = await hashPassword(newPassword);
            const query = 'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING user_id;';
            const result = await dbPool.query(query, [newPasswordHash, userId]);

            if (result.rowCount === 0) {
                logger.warn(`Password reset failed: User ID ${userId} not found.`);
                return false;
            }

            logger.info(`Admin reset password for user ID: ${userId}`);
            return true;

        } catch (error) {
            logger.error(`Error during admin password reset for ID ${userId}:`, error);
            return false;
        }
    }
    
    /**
     * FIXED: Fetches key statistics for the admin dashboard from the database.
     * @returns {Promise<object>} An object containing various statistics.
     */
    static async getDashboardStats() {
        try {
            logger.info('AdminService: Fetching REAL dashboard statistics from database');
            
            // 1. Total Users Count (FIXED: Using user_id instead of id)
            const totalUsersResult = await dbPool.query('SELECT COUNT(*) FROM users;');
            const totalUsers = parseInt(totalUsersResult.rows[0].count, 10);

            // 2. Count of Students (FIXED: Join with roles table to find student role_id)
            const studentsCountResult = await dbPool.query(`
                SELECT COUNT(*) 
                FROM students s 
                WHERE s.status = 'approved'
            `);
            const totalStudents = parseInt(studentsCountResult.rows[0].count, 10);
            
            // 3. Count of Wardens (FIXED: Find users with warden role_id)
            const wardensCountResult = await dbPool.query(`
                SELECT COUNT(*) 
                FROM users u
                JOIN roles r ON u.role_id = r.role_id
                WHERE r.role_name IN ('Warden', 'Assistant Warden')
            `);
            const totalWardens = parseInt(wardensCountResult.rows[0].count, 10);
            
            // 4. Total Number of Hostels
            const hostelsCountResult = await dbPool.query('SELECT COUNT(*) FROM hostels;');
            const totalHostels = parseInt(hostelsCountResult.rows[0].count, 10);

            // 5. Total Number of Pending Student Approvals
            const pendingApprovalsResult = await dbPool.query(`
                SELECT COUNT(*) 
                FROM students 
                WHERE status = 'pending'
            `);
            const pendingApprovals = parseInt(pendingApprovalsResult.rows[0].count, 10);
            
            logger.info('AdminService: Successfully fetched REAL dashboard statistics', {
                totalUsers,
                totalStudents, 
                totalWardens,
                totalHostels,
                pendingApprovals
            });

            return {
                success: true,
                stats: {
                    totalUsers,
                    totalStudents,
                    totalWardens,
                    totalHostels,
                    pendingApprovals,
                }
            };
        } catch (error) {
            logger.error('CRITICAL: Error fetching admin dashboard statistics in AdminService.getDashboardStats:', error);
            // Return error instead of throwing to prevent route crash
            return {
                success: false,
                message: `Database query failed: ${error.message}`,
                stats: {}
            };
        }
    }

    /**
     * Toggles the system maintenance mode flag (Manual control).
     * @param {boolean} state 
     * @returns {Promise<boolean>}
     */
    static async toggleSystemMaintenance(state) {
        try {
            const MaintenanceMiddleware = require('../security/middleware/MaintenanceMiddleware');
            MaintenanceMiddleware.toggleMaintenance(state);
            return true;
        } catch (error) {
            logger.error('Error toggling system maintenance:', error);
            return false;
        }
    }
}

module.exports = AdminService;