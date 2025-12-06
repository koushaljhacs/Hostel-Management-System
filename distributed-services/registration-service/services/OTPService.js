const logger = require('../../../config/logger');

/**
 * HMS-CENTRAL-COPY/distributed-services/registration-service/services/OTPService.js
 * * One-Time Password (OTP) Service.
 * * Handles generation, storage, and validation of OTPs for email verification.
 * * This service is integral to securing the Student Registration flow.
 */

class OTPService {
    constructor(dbPool) {
        this.dbPool = dbPool;
        this.otpExpiry = 10 * 60 * 1000; // 10 minutes (Configurable)
    }

    /**
     * Generate a 6-digit OTP, store it in the database, and set expiry.
     * Overwrites any existing OTP for the same email.
     * @param {string} email - The recipient email address.
     * @returns {string} The generated 6-digit OTP.
     */
    async generateOTP(email) {
        try {
            if (!this.dbPool) {
                throw new Error('Database connection not available');
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
            const expiresAt = new Date(Date.now() + this.otpExpiry);

            const query = `
                INSERT INTO otp_verifications 
                (email, otp_code, expires_at, attempts, created_at) 
                VALUES ($1, $2, $3, 0, NOW())
                ON CONFLICT (email) 
                DO UPDATE SET 
                    otp_code = EXCLUDED.otp_code,
                    expires_at = EXCLUDED.expires_at,
                    attempts = 0,
                    created_at = EXCLUDED.created_at
            `;
            
            const values = [email, otp, expiresAt];
            await this.dbPool.query(query, values);

            await this.cleanupExpiredOTPs();

            logger.info(`OTP generated for ${email}: ${otp}`);
            return otp;

        } catch (error) {
            logger.error('Error generating OTP:', error.message);
            throw new Error('Failed to generate and store OTP.');
        }
    }

    /**
     * Validate the entered OTP against the stored record.
     * @param {string} email - The email address for verification.
     * @param {string} enteredOTP - The 6-digit code submitted by the user.
     * @returns {object} Validation result and message.
     */
    async validateOTP(email, enteredOTP) {
        try {
            if (!this.dbPool) {
                return { valid: false, message: 'Database connection not available' };
            }

            const query = `
                SELECT otp_code, expires_at, attempts 
                FROM otp_verifications 
                WHERE email = $1
            `;
            
            const result = await this.dbPool.query(query, [email]);
            
            if (result.rows.length === 0) {
                return { valid: false, message: 'No OTP found for this email. Please request a new OTP.' };
            }

            const storedData = result.rows[0];

            if (new Date() > new Date(storedData.expires_at)) {
                await this.deleteOTP(email);
                return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
            }
            
            // NOTE: Add a business rule here for Max attempts (e.g., 3 attempts)
            if (storedData.attempts >= 3) {
                 return { valid: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' };
            }

            if (storedData.otp_code === enteredOTP) {
                // Success: Delete OTP immediately after use
                await this.deleteOTP(email);
                return { valid: true, message: 'Email verified successfully!' };
            } else {
                // Failure: Increment attempts counter
                const updateQuery = `
                    UPDATE otp_verifications 
                    SET attempts = attempts + 1 
                    WHERE email = $1
                `;
                await this.dbPool.query(updateQuery, [email]);
                
                return { valid: false, message: `Invalid OTP. Attempt ${storedData.attempts + 1} of 3.` };
            }

        } catch (error) {
            logger.error('Error validating OTP:', error.message);
            return { valid: false, message: 'Error validating OTP. Please try again.' };
        }
    }

    /**
     * Delete an OTP record.
     */
    async deleteOTP(email) {
        try {
            if (!this.dbPool) return;
            const query = 'DELETE FROM otp_verifications WHERE email = $1';
            await this.dbPool.query(query, [email]);
        } catch (error) {
            logger.error('Error deleting OTP:', error.message);
        }
    }

    /**
     * Clean up expired OTPs (Self-Healing/Maintenance).
     */
    async cleanupExpiredOTPs() {
        try {
            if (!this.dbPool) return;
            // Deletes all expired OTPs to keep the table clean
            const query = 'DELETE FROM otp_verifications WHERE expires_at < $1';
            await this.dbPool.query(query, [new Date()]);
        } catch (error) {
            logger.error('Error cleaning up expired OTPs:', error.message);
        }
    }
}

module.exports = OTPService;
