/**
 * HMS-CENTRAL-COPY/distributed-services/registration-service/services/EmailService.js
 * * Centralized Email Service for Sending Notifications.
 * * FIX: ADDED getServiceStatus() for dashboard reporting.
 * * CRITICAL FIX: Removed conflicting 'service' option from Nodemailer transporter.
 * * CRITICAL FIX: Added sendWelcomeCredentials function for Admin Approval.
 */

const nodemailer = require('nodemailer');
const logger = require('../../../config/logger');

class EmailService {
    constructor(dbPool) {
        this.transporter = null;
        this.dbPool = dbPool;
        this.status = 'Initializing'; // New status field
        this.initialize();
    }

    initialize() {
        try {
            // Configure email transporter using .env variables
            this.transporter = nodemailer.createTransport({
                // CRITICAL FIX: Removed 'service' option to prevent conflict with host/port/secure settings
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT) || 587,
                secure: false, // Use TLS (Port 587). Change to 'true' if using Port 465.
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS // App password for security
                }
            });
            this.status = 'Active'; // Update status on success
            logger.info('✅ Email Service Initialized');
        } catch (error) {
            this.status = 'Offline: ' + error.message.substring(0, 50); // Update status on failure
            logger.error('❌ Error initializing EmailService:', error.message);
        }
    }

    // === NEW METHOD: STATUS CHECK (FIXES N/A) ===
    getServiceStatus() {
        // Return detailed status based on initialization result
        if (this.status.startsWith('Active')) {
            return {
                status: 'Active',
                details: `${process.env.EMAIL_SERVICE || 'Gmail'} via Port ${process.env.EMAIL_PORT || 587}`
            };
        }
        return {
            status: 'Offline',
            details: this.status
        };
    }
    // ===========================================

    /**
     * Send OTP email to user.
     */
    async sendOTPEmail(recipientEmail, otp, userName = 'Student') {
        if (!this.transporter) throw new Error('Email service is offline.');
        try {
            // NOTE: In a real system, you would load the template content from a file or service.
            // Mocking simple HTML content for demonstration
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #720026; background: #fff8e1;">
                    <h2 style="color: #720026;">🔑 Your OTP Verification Code</h2>
                    <p>Hello ${userName},</p>
                    <p>Please use the following One-Time Password (OTP) to verify your email address:</p>
                    <div style="background: #720026; color: white; padding: 15px; font-size: 24px; text-align: center; border-radius: 5px; margin: 20px 0;">
                        <strong>${otp}</strong>
                    </div>
                    <p style="color: #f44336; font-weight: bold;">This code is valid for 10 minutes.</p>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
            `;
            
            const mailOptions = {
                from: `"Hostel MS (No-Reply)" <${process.env.EMAIL_USER}>`,
                to: recipientEmail,
                subject: '🔑 Your OTP Verification Code',
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            await this.logEmailToDatabase(recipientEmail, otp, result.messageId, 'OTP', 'sent');
            return { success: true, messageId: result.messageId };
        } catch (error) {
            logger.error('❌ Error sending OTP:', error);
            await this.logEmailToDatabase(recipientEmail, otp, null, 'OTP', 'failed', error.message);
            throw error;
        }
    }

    /**
     * FIX: New function to send welcome email with login credentials after admin approval.
     */
    async sendWelcomeCredentials(studentEmail, studentName, username, password) {
        if (!this.transporter) {
             logger.error('Email service is offline for credentials email.');
             return { success: false, error: 'Email service is offline.' };
        }
        
        try {
            const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/student-dashboard`;

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #4CAF50; background: #e8f5e8;">
                    <h2 style="color: #4CAF50;">✅ Welcome to HMS! Your Account is Approved!</h2>
                    <p>Hello ${studentName},</p>
                    <p>Your admission request has been **approved** by the Hostel Administration team.</p>
                    <p>You can now log in to your dashboard using the following credentials:</p>
                    <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Username:</strong> <code>${username}</code></p>
                        <p style="margin: 0 0 10px 0;"><strong>Password:</strong> <code>${password}</code></p>
                        <a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">
                            Go to Your Dashboard
                        </a>
                    </div>
                    <p>For security, we recommend changing your password after your first login.</p>
                    <p>Thank you.</p>
                </div>
            `;
            
            const mailOptions = {
                from: `"Hostel MS (Admin)" <${process.env.EMAIL_USER}>`,
                to: studentEmail,
                subject: '✅ Account Approved: Your HMS Login Credentials',
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            await this.logEmailToDatabase(studentEmail, null, result.messageId, 'CREDENTIALS', 'sent');
            logger.info(`Credentials email sent to ${studentEmail} with ID: ${result.messageId}`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            logger.error('❌ Error sending welcome credentials:', error);
            await this.logEmailToDatabase(studentEmail, null, null, 'CREDENTIALS', 'failed', error.message);
            throw error;
        }
    }


    /**
     * FIX: Generic function to send email with custom content.
     */
    async sendEmail(recipientEmail, subject, content) {
        if (!this.transporter) throw new Error('Email service is offline.');
        try {
            const mailOptions = {
                from: `"Hostel MS (No-Reply)" <${process.env.EMAIL_USER}>`,
                to: recipientEmail,
                subject: subject,
                // Assume content can be text or HTML
                html: content.includes('<div') ? content : content.replace(/\n/g, '<br>'),
            };

            const result = await this.transporter.sendMail(mailOptions);
            await this.logEmailToDatabase(recipientEmail, null, result.messageId, 'CUSTOM', 'sent');
            return { success: true, messageId: result.messageId };
        } catch (error) {
            logger.error('❌ Error sending generic email:', error);
            await this.logEmailToDatabase(recipientEmail, null, null, 'CUSTOM', 'failed', error.message);
            throw error;
        }
    }


    /**
     * Send registration confirmation email (The "Car Certification" step).
     */
    async sendRegistrationConfirmation(studentData) {
        if (!this.transporter) return { success: false, error: 'Email service is offline.' };
        try {
            const fullName = `${studentData.firstName} ${studentData.lastName}`;
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ffc400; background: #fffdf5;">
                    <h2 style="color: #a37f00;">📋 Registration Submitted - Pending Approval</h2>
                    <p>Hello ${fullName},</p>
                    <p>Your registration for the Hostel Management System has been successfully submitted and is now in the **Dual-Admin Approval Queue**.</p>
                    <ul style="list-style: none; padding: 0; margin: 15px 0;">
                        <li><strong>Roll No:</strong> ${studentData.rollNo}</li>
                        <li><strong>Email:</strong> ${studentData.email}</li>
                        <li><strong>Status:</strong> <span style="color: #ff9800; font-weight: bold;">Pending IT Admin Review</span></li>
                    </ul>
                    <p>Once approved by an Admin, you will receive a final confirmation with your login details.</p>
                    <p>Thank you.</p>
                </div>
            `;

            const mailOptions = {
                from: `"Hostel MS (No-Reply)" <${process.env.EMAIL_USER}>`,
                to: studentData.email,
                subject: '📋 Registration Submitted - Pending Approval',
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            await this.logEmailToDatabase(studentData.email, null, result.messageId, 'CONFIRMATION', 'sent');
            return { success: true, messageId: result.messageId };
        } catch (error) {
            logger.error('❌ Error sending confirmation:', error);
            await this.logEmailToDatabase(studentData.email, null, null, 'CONFIRMATION', 'failed', error.message);
            return { success: false };
        }
    }

    /**
     * Log email activity to the email_logs table (Admin Audit Trail).
     */
    async logEmailToDatabase(email, content, messageId, type, status, errorMsg = null) {
        if (!this.dbPool) return;
        try {
            const query = `
                INSERT INTO email_logs 
                (email_address, otp_code, message_id, email_type, status, error_message, sent_at) 
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `;
            await this.dbPool.query(query, [email, content, messageId, type, status, errorMsg]);
        } catch (err) {
            logger.error('⚠️ Failed to log email to DB:', err.message);
        }
    }
}

module.exports = EmailService;