const logger = require('../config/logger');
const bcrypt = require('bcryptjs'); 
const { generateToken } = require('../security/utils/tokenGenerator'); 

// FIX: Import database pool correctly (use direct export)
const dbPool = require('../config/database');

// Production Security Standard: Use environment variable for salt rounds if necessary, 
// otherwise 10 is the recommended minimum.
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10; 

class CentralAuthService {

    /**
     * Hashes a plain text password.
     * @param {string} password - The plain text password.
     * @returns {Promise<string>} The hashed password.
     */
    static async hashPassword(password) {
        if (!password || password.length === 0) {
            throw new Error('Cannot hash empty password.');
        }

        try {
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            return hashedPassword;
        } catch (error) {
            logger.error('Error during password hashing:', error);
            throw new Error('Failed to hash password due to internal error.');
        }
    }

    /**
     * Compares a plain text password with a hash.
     * @param {string} password - The plain text password.
     * @param {string} hash - The stored hash.
     * @returns {Promise<boolean>}
     */
    static async comparePassword(password, hash) {
        if (!password || !hash) {
            console.log('❌ Password or hash is empty');
            return false;
        }
        
        try {
            console.log(`🔐 Password comparison: password="${password}", hash="${hash.substring(0, 20)}..."`);
            const result = await bcrypt.compare(password, hash);
            console.log(`🔐 Password comparison result: ${result}`);
            return result;
        } catch (error) {
            console.error('❌ Error during password comparison:', error);
            logger.error('Error during password comparison:', error);
            return false;
        }
    }

    /**
     * Authenticates a user by checking credentials against the database.
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<{token: string, roleId: number} | null>} 
     */
    static async authenticateUser(username, password) {
        try {
            console.log(`🔐 Authentication attempt for user: ${username}`);
            console.log(`📊 Database pool available: ${!!dbPool}`);
            
            if (!dbPool) {
                console.error('❌ Database pool is undefined in CentralAuthService');
                throw new Error('Database connection not available');
            }
            
            const lowercasedUsername = username.toLowerCase();
            
            // Query with LOWER() for case-insensitive matching
            const query = 'SELECT user_id, password_hash, role_id, status FROM users WHERE LOWER(username) = $1;'; 
            console.log(`🔍 Database query: ${query} with param: ${lowercasedUsername}`);
            
            const result = await dbPool.query(query, [lowercasedUsername]);

            if (!result || result.rows.length === 0) {
                console.log(`❌ User not found: ${username}`);
                logger.warn(`Login attempt for ${username} failed: User not found in DB.`);
                return null;
            }

            const user = result.rows[0];
            console.log(`✅ User found: ID=${user.user_id}, Role=${user.role_id}, Status=${user.status}`);
            
            // Check if user is active
            if (user.status !== 'active') {
                console.log(`❌ User account is not active: ${user.status}`);
                return null;
            }

            console.log(`🔐 Attempting password match for user ${username}...`);
            const isMatch = await CentralAuthService.comparePassword(password, user.password_hash);

            if (isMatch) {
                console.log(`✅ Password match successful for ${username}`);
                const payload = {
                    id: user.user_id,
                    username: username,
                    role: user.role_id 
                };
                
                console.log(`🎫 Generating JWT token for user ${username}...`);
                const token = generateToken(payload, { expiresIn: CentralAuthService.resolveSessionDuration(user.role_id) });
                console.log(`✅ Token generated successfully for ${username}`);

                return { 
                    token: token, 
                    roleId: user.role_id,
                    sessionTimeoutMinutes: CentralAuthService.getSessionTimeoutMinutes(user.role_id)
                };

            } else {
                console.log(`❌ Password mismatch for user ${username}`);
                logger.warn(`Login attempt for ${username} failed: Password mismatch.`);
                return null;
            }

        } catch (error) {
            console.error(`💥 Authentication error for user ${username}:`, error);
            logger.error(`Database or processing error during authentication for user ${username}:`, error);
            return null; 
        }
    }
}

CentralAuthService.resolveSessionDuration = (roleId) => {
    const numericRole = parseInt(roleId, 10);
    if (numericRole === 1) {
        return null; // IT Admin - no expiration
    }
    if (numericRole === 2) {
        return '30m'; // Hostel Admin
    }
    return '15m'; // Default for all others
};

CentralAuthService.getSessionTimeoutMinutes = (roleId) => {
    const numericRole = parseInt(roleId, 10);
    if (numericRole === 1) return null;
    if (numericRole === 2) return 30;
    return 15;
};

module.exports = CentralAuthService;