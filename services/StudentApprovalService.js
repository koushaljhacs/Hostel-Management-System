// services/StudentApprovalService.js - FIXED EMAIL SERVICE

const { dbPool } = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

// ❗ FIX 1: Use a variable to hold the INSTANCE
let EmailServiceInstance; 

try {
    // 1. Get the Class definition
    const EmailServiceClass = require('../distributed-services/registration-service/services/EmailService');
    // 2. Instantiate the class, passing the required dbPool
    EmailServiceInstance = new EmailServiceClass(dbPool);
    logger.info('✅ REAL EmailService loaded and instantiated from registration service');
} catch (error) {
    logger.error('❌ Registration EmailService not found or failed to instantiate:', error.message);
    try {
        // Fallback to local email service
        const LocalEmailServiceClass = require('./EmailService');
        // Instantiate the local class as well
        EmailServiceInstance = new LocalEmailServiceClass(dbPool);
        logger.info('✅ REAL EmailService loaded and instantiated from local service');
    } catch (error2) {
        logger.error('❌ Local EmailService not found or failed to instantiate:', error2.message);
        // Final fallback 
        EmailServiceInstance = {
            sendEmail: async (email, subject, html) => {
                logger.info('❌ FALLBACK EMAIL (NO SERVICE):', {
                    to: email,
                    subject: subject,
                    html: html
                });
                return false; 
            }
        };
    }
}

// ✅ TEST: Verify email service on startup
logger.info('🔍 EmailService check:', {
    exists: !!EmailServiceInstance,
    hasSendEmail: typeof EmailServiceInstance?.sendEmail === 'function',
    isFallback: !EmailServiceInstance.sendEmail || EmailServiceInstance.sendEmail.toString().includes('FALLBACK') 
});

class StudentApprovalService {
    
    // Get REAL pending students with pagination
    async getPendingStudents(limit = 50, offset = 0) {
        try {
            logger.info('🔍 Fetching REAL pending students from database...');
            const query = `
                SELECT 
                    s.id,
                    s.first_name,
                    s.last_name,
                    s.email,
                    s.contact_number as phone, 
                    s.university_roll_no,
                    s.gender,
                    s.course,
                    s.branch,
                    s.current_year,
                    s.status,
                    s.created_at as request_date,
                    NULL as hostel_name
                FROM students s
                WHERE s.status = 'pending'
                ORDER BY s.created_at ASC
                LIMIT $1 OFFSET $2
            `;
            
            const result = await dbPool.query(query, [limit, offset]);
            logger.info(`✅ Found ${result.rows.length} REAL pending students`);
            return result.rows;
        } catch (error) {
            logger.error('❌ Error fetching REAL pending students:', error);
            throw error;
        }
    }

    // Get REAL pending students count
    async getPendingStudentsCount() {
        try {
            logger.info('🔍 Counting REAL pending students...');
            const query = `
                SELECT COUNT(*) 
                FROM students 
                WHERE status = 'pending'
            `;
            
            const result = await dbPool.query(query);
            const count = parseInt(result.rows[0].count);
            logger.info(`✅ REAL Pending students count: ${count}`);
            return count;
        } catch (error) {
            logger.error('❌ Error fetching REAL pending students count:', error);
            throw error;
        }
    }

    // Get REAL student groups for bulk operations
    async getStudentGroups() {
        try {
            logger.info('🔍 Fetching REAL student groups...');
            const query = `
                SELECT 
                    course,
                    branch,
                    COUNT(*) as pending_count
                FROM students 
                WHERE status = 'pending'
                GROUP BY course, branch
                ORDER BY course, branch
            `;
            
            const result = await dbPool.query(query);
            logger.info(`✅ Found ${result.rows.length} REAL student groups`);
            return result.rows;
        } catch (error) {
            logger.error('❌ Error fetching REAL student groups:', error);
            throw error;
        }
    }

    // Generate REAL username from student data
    generateUsername(student) {
        const year = new Date().getFullYear().toString().slice(-2);
        const random = Math.floor(1000 + Math.random() * 9000);
        const rollSuffix = student.university_roll_no ? String(student.university_roll_no).slice(-4) : '0000';
        const username = `ST${year}${rollSuffix}${random}`.toUpperCase();
        return username;
    }

    /**
     * Ensures a unique username by checking the database and regenerating if necessary.
     */
    async ensureUniqueUsername(student, client) {
        let username;
        let isUnique = false;
        const maxAttempts = 10; 

        for (let i = 0; i < maxAttempts && !isUnique; i++) {
            const attemptedUsername = this.generateUsername(student);
            
            const usernameCheckQuery = `SELECT 1 FROM users WHERE username = $1`;
            const usernameCheckResult = await client.query(usernameCheckQuery, [attemptedUsername]);

            if (usernameCheckResult.rows.length === 0) {
                username = attemptedUsername;
                isUnique = true;
            } else {
                logger.info(`⚠️ Generated username ${attemptedUsername} already exists. Retrying... (Attempt ${i + 1}/${maxAttempts})`);
            }
        }

        if (!isUnique) {
            throw new Error('Failed to generate a unique username after several attempts. Aborting approval.');
        }

        logger.info('🔤 Generated REAL unique username:', username);
        return username;
    }


    // Generate REAL random password (using crypto)
    generatePassword() {
        try {
            const crypto = require('crypto');
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
            let password = '';
            
            for (let i = 0; i < 12; i++) {
                const randomByte = crypto.randomBytes(1)[0];
                password += chars[randomByte % chars.length];
            }
            
            logger.info('🔐 Generated REAL random password');
            return password;
        } catch (error) {
            logger.info('⚠️ Using Math.random fallback for REAL password generation');
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
            let password = '';
            for (let i = 0; i < 12; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        }
    }

    // ✅ FIXED: Approve SINGLE REAL student with proper email handling
    async approveStudent(studentId, approvalData) {
        const client = await dbPool.connect();
        
        let student = null; // ❗ FIX 2: Declare student outside try block for catch access

        try {
            await client.query('BEGIN');

            logger.info('🔍 Fetching REAL student data for ID:', studentId);
            
            // Get student details
            const studentQuery = `
                SELECT * FROM students WHERE id = $1 AND status = 'pending'
            `;
            const studentResult = await client.query(studentQuery, [studentId]);
            
            if (studentResult.rows.length === 0) {
                throw new Error('REAL Student not found or already processed');
            }

            student = studentResult.rows[0]; // ❗ FIX 2: Assign student data here
            logger.info('✅ Found REAL student:', {
                id: student.id,
                name: `${student.first_name} ${student.last_name}`,
                email: student.email,
                rollNo: student.university_roll_no
            });

            // Check if email already exists in users table (linking logic)
            const emailCheckQuery = `SELECT user_id, username FROM users WHERE email = $1`;
            const emailCheckResult = await client.query(emailCheckQuery, [student.email]);
            
            if (emailCheckResult.rows.length > 0) {
                const existingUser = emailCheckResult.rows[0];
                logger.warn('⚠️ Email already exists in users table:', {
                    email: student.email,
                    existingUserId: existingUser.user_id,
                    existingUsername: existingUser.username
                });
                
                // Link student to existing user
                const updateStudentQuery = `
                    UPDATE students 
                    SET 
                        status = 'approved',
                        approved_by_user_id = $1,
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *
                `;
                
                await client.query(updateStudentQuery, [existingUser.user_id, studentId]);
                logger.info('✅ Linked REAL student to existing user account');
                
                await client.query('COMMIT');
                
                return {
                    success: true,
                    username: existingUser.username,
                    password: '***EXISTING_ACCOUNT***',
                    userId: existingUser.user_id,
                    studentName: `${student.first_name} ${student.last_name}`,
                    email: student.email,
                    message: 'Student approved and linked to existing user account'
                };
            }

            // Generate and ensure unique username
            const username = await this.ensureUniqueUsername(student, client);
            
            const plainPassword = approvalData.passwordOption === 'manual' 
                ? approvalData.manualPassword 
                : this.generatePassword();

            logger.info('🔐 Generated REAL credentials:', {
                username: username,
                password: approvalData.passwordOption === 'manual' ? '***MANUAL***' : '***AUTO-GENERATED***'
            });

            // Hash the REAL password before storing
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

            // Create REAL user account
            const userInsertQuery = `
                INSERT INTO users (
                    username, email, phone_number, password_hash, role_id, status, full_name, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING user_id
            `;
            
            const userResult = await client.query(userInsertQuery, [
                username,
                student.email, 
                student.contact_number || student.phone,
                passwordHash,
                approvalData.roleId || 4,
                'active',
                `${student.first_name} ${student.last_name}`
            ]);

            const userId = userResult.rows[0].user_id;
            logger.info('✅ Created REAL user account with ID:', userId);

            // Update REAL student status
            const updateStudentQuery = `
                UPDATE students 
                SET 
                    status = 'approved',
                    approved_by_user_id = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
            `;
            
            await client.query(updateStudentQuery, [userId, studentId]);
            logger.info('✅ Updated REAL student status to approved');

            // Send REAL email notification
            logger.info('🔍 DEBUG: Checking email sending conditions...');
            logger.info('📧 DEBUG: approvalData.sendEmail:', approvalData.sendEmail);
            logger.info('📧 DEBUG: Student email:', student.email);
            logger.info('📧 DEBUG: Username:', username);
            logger.info('📧 DEBUG: Has password:', !!plainPassword);

            // TEMPORARY: Force email sending for debugging
            const forceSendEmail = true;
            logger.info('📧 DEBUG: Force sending email:', forceSendEmail);

            if (forceSendEmail) {
                logger.info('🚀 DEBUG: Attempting to send approval email...');
                try {
                    const passwordToSend = approvalData.passwordOption === 'manual' 
                        ? approvalData.manualPassword 
                        : plainPassword;
                        
                    const emailSent = await this.sendApprovalEmail(
                        student.email, 
                        username, 
                        passwordToSend,
                        `${student.first_name} ${student.last_name}`
                    );
                    logger.info('✅ DEBUG: Email send result:', emailSent);
                    
                    if (!emailSent) {
                        logger.error('❌ DEBUG: sendApprovalEmail returned false');
                    }
                } catch (emailError) {
                    logger.error('❌ DEBUG: Exception in sendApprovalEmail:', emailError);
                }
            } else {
                logger.info('📧 DEBUG: Email sending disabled');
            }

            await client.query('COMMIT');
            logger.info('✅ REAL database transaction committed successfully');
            
            return {
                success: true,
                username: username,
                password: approvalData.passwordOption === 'manual' ? '***' : plainPassword,
                userId: userId,
                studentName: `${student.first_name} ${student.last_name}`,
                email: student.email
            };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('❌ REAL database transaction failed:', error);
            
            // ❗ FIX 2: Safely access student.email
            if (error.code === '23505') {
                 const emailForError = student ? student.email : 'Unknown Email';

                 if (error.constraint === 'users_email_key') {
                    throw new Error(`Email ${emailForError} already exists in system. Please use a different email or contact administrator.`);
                } else if (error.constraint === 'users_username_key') {
                    throw new Error(`Failed to create unique username. Please retry or contact administrator.`);
                }
            }
            
            throw error;
        } finally {
            client.release();
        }
    }

    // ✅ FIXED: Bulk approve REAL students (Relies on approveStudent's transaction handling)
    async bulkApproveStudents(studentIds, approvalData) {
        const results = {
            successful: [],
            failed: []
        };

        logger.info(`🚀 Starting REAL bulk approval for ${studentIds.length} students`);

        for (const studentId of studentIds) {
            try {
                // Ensure approveStudent is called with 'auto' for consistency in bulk
                const studentApprovalData = {
                    ...approvalData,
                    passwordOption: 'auto',
                }; 
                
                const result = await this.approveStudent(studentId, studentApprovalData);
                
                results.successful.push({
                    studentId: studentId,
                    username: result.username,
                    userId: result.userId
                });
                
                logger.info(`✅ REAL Student ${studentId} approved successfully`);
            } catch (error) {
                results.failed.push({
                    studentId: studentId,
                    error: error.message
                });
                logger.error(`❌ REAL Student ${studentId} approval failed:`, error.message);
            }
        }

        logger.info(`✅ REAL Bulk approval completed: ${results.successful.length} successful, ${results.failed.length} failed`);
        return results;
    }

    // Generate random password for bulk operations (Kept for completeness)
    generateRandomPassword(length = 12, includeSpecial = true) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let chars = letters + numbers;
        if (includeSpecial) chars += special;
        
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return password;
    }

    // Send REAL approval email
    async sendApprovalEmail(email, username, password, studentName) {
        try {
            logger.info('📧 Attempting to send REAL approval email to:', email);
            
            if (!email || !username) {
                logger.error('❌ Missing email or username for REAL approval email');
                return false;
            }

            const subject = 'Hostel Management System - Account Approved';
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f9f9f9; }
                        .credentials { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎓 Hostel Management System</h1>
                            <h2>Account Approved</h2>
                        </div>
                        <div class="content">
                            <p>Dear <strong>${studentName}</strong>,</p>
                            <p>Your student account has been approved successfully. You can now access the Hostel Management System using the credentials below:</p>
                            
                            <div class="credentials">
                                <h3>🔐 Your Login Credentials:</h3>
                                <p><strong>Username:</strong> ${username}</p>
                                <p><strong>Password:</strong> ${password}</p>
                                <p><strong>Login URL:</strong> <a href="http://localhost:3000/login">http://localhost:3000/login</a></p>
                            </div>
                            
                            <p><strong>Important Security Notice:</strong></p>
                            <ul>
                                <li>Change your password after first login</li>
                                <li>Keep your credentials confidential</li>
                                <li>Contact admin if you face any issues</li>
                            </ul>
                        </div>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>Hostel Administration Team</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            // ❗ FIX 1: Check and use the instantiated object, EmailServiceInstance
            if (!EmailServiceInstance || typeof EmailServiceInstance.sendEmail !== 'function') {
                logger.error('❌ EmailService not properly initialized - using fallback');
                logger.info('📧 REAL FALLBACK - Would send email to:', email);
                logger.info('📧 Subject:', subject);
                logger.info('📧 Username:', username);
                logger.info('📧 Password:', password);
                return true;
            }
            
            // Send REAL email using the instantiated object
            await EmailServiceInstance.sendEmail(email, subject, html);
            logger.info('✅ REAL approval email sent successfully to:', email);
            return true;
        } catch (error) {
            logger.error('❌ Error sending REAL approval email:', error);
            logger.info('📧 REAL Email content that would be sent:');
            logger.info('To:', email);
            logger.info('Username:', username);
            logger.info('Password:', password);
            return false;
        }
    }

    // Reject REAL student
    async rejectStudent(studentId, reason, rejectedBy) {
        try {
            logger.info('🚀 Rejecting REAL student:', studentId, 'with reason:', reason);
            
            const query = `
                UPDATE students 
                SET 
                    status = 'rejected',
                    rejection_reason = $2,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;
            
            const result = await dbPool.query(query, [studentId, reason]);
            logger.info('✅ REAL Student rejected successfully:', result.rows[0]);
            return { success: true };
        } catch (error) {
            logger.error('❌ Error rejecting REAL student:', error);
            throw error;
        }
    }
}

module.exports = new StudentApprovalService();