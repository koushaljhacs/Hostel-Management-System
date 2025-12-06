/**
 * HMS-CENTRAL-COPY/services/UserCreationService.js
 * * User Creation Service for Hostel Admin Operations
 * * Handles employee ID generation, validation, and user creation requests
 */

const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

class UserCreationService {
    constructor(dbPool) {
        this.dbPool = dbPool;
    }

    /**
     * Get last used ID for a specific prefix (CWN, WRN, STF, etc.)
     */
    async getLastUsedId(prefix) {
        try {
            const query = `
                SELECT username FROM users 
                WHERE username LIKE $1 
                ORDER BY username DESC 
                LIMIT 1
            `;
            const result = await this.dbPool.query(query, [`${prefix}%`]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            return result.rows[0].username;
        } catch (error) {
            logger.error('Error getting last used ID:', error);
            throw new Error('Failed to fetch last used ID');
        }
    }

    /**
     * Check if username already exists
     */
    async checkUsernameExists(username) {
        try {
            const query = 'SELECT user_id FROM users WHERE username = $1';
            const result = await this.dbPool.query(query, [username]);
            return { exists: result.rows.length > 0 };
        } catch (error) {
            logger.error('Error checking username:', error);
            throw new Error('Failed to check username availability');
        }
    }

    /**
     * Check if email already exists
     */
    async checkEmailExists(email) {
        try {
            const query = 'SELECT user_id FROM users WHERE email = $1';
            const result = await this.dbPool.query(query, [email]);
            return { exists: result.rows.length > 0 };
        } catch (error) {
            logger.error('Error checking email:', error);
            throw new Error('Failed to check email availability');
        }
    }

    /**
     * Create user creation request (sent to IT Admin for approval)
     */
    async createUserRequest(userData) {
        const client = await this.dbPool.connect();
        
        try {
            await client.query('BEGIN');

            // Hash password if provided
            let passwordHash = null;
            if (userData.password && userData.passwordOption === 'manual') {
                const salt = await bcrypt.genSalt(10);
                passwordHash = await bcrypt.hash(userData.password, salt);
            }

            // Insert into user_creation_requests table
            const insertQuery = `
                INSERT INTO user_creation_requests (
                    first_name, last_name, email, username, role_id, 
                    identifier_id, password_hash, created_by, hostel_id, request_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING request_id
            `;

            const result = await client.query(insertQuery, [
                userData.firstName,
                userData.lastName,
                userData.email,
                userData.username,
                userData.roleId,
                userData.identifierId,
                passwordHash,
                userData.createdBy,
                userData.hostelId,
                JSON.stringify({
                    passwordOption: userData.passwordOption,
                    roleName: userData.roleName,
                    createdAt: new Date().toISOString()
                })
            ]);

            await client.query('COMMIT');
            
            return {
                requestId: result.rows[0].request_id,
                success: true
            };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error creating user request:', error);
            throw new Error('Failed to create user request');
        } finally {
            client.release();
        }
    }

    /**
     * Generate next available employee ID
     */
    async generateNextEmployeeId(prefix) {
        const lastId = await this.getLastUsedId(prefix);
        
        let nextNumber = 1;
        if (lastId) {
            const lastNumber = parseInt(lastId.replace(prefix, '')) || 0;
            nextNumber = lastNumber + 1;
        }
        
        return `${prefix}${nextNumber.toString().padStart(7, '0')}`;
    }
}

module.exports = UserCreationService;