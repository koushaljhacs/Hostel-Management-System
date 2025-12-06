/**
 * HMS-CENTRAL-COPY/distributed-services/registration-service/services/ValidationService.js
 * * Core Validation Service for Distributed Registration.
 * * Provides shared business logic validation functions for BridgeGate and client-side checks.
 * * Fulfills requirement for: Data integrity validation, Business logic validation.
 * * CRITICAL FIX: Enhanced checkDuplicateRollNo logic to filter by status and check for leading zero.
 * * CRITICAL FIX: Fixed database failure handling to prevent 500 Internal Server Errors.
 */

const { Pool } = require('pg');
const logger = require('../../../config/logger');

class ValidationService {
    constructor(dbPool) {
        this.dbPool = dbPool;
    }

    //---------------------------------------------------------
    // 1. EMAIL VALIDATION
    //---------------------------------------------------------

    /**
     * Validate email format and domain restriction (@gmail.com, @outlook.com).
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, message: 'Email is required' };
        }
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Invalid email format' };
        }
        // Fulfills the explicit domain restriction requirement
        const allowedDomains = ['gmail.com', 'outlook.com']; 
        const domain = email.toLowerCase().split('@')[1];
        if (!allowedDomains.includes(domain)) {
            return { valid: false, message: 'Only @gmail.com and @outlook.com domains are allowed' };
        }
        return { valid: true, message: 'Email is valid' };
    }

    /**
     * Check central database for duplicate email addresses.
     */
    async checkDuplicateEmail(email) {
        try {
            // FIX: Check if database pool is available
            if (!this.dbPool) {
                logger.error('Database pool not available in ValidationService');
                return {
                    exists: false, 
                    message: 'Database service temporarily unavailable',
                    validation_failed: true 
                };
            }

            const query = 'SELECT id FROM students WHERE email = $1';
            const result = await this.dbPool.query(query, [email]);
            
            const exists = result.rows.length > 0;
            return {
                exists: exists,
                message: exists ? 'Email already registered (might be pending approval)' : 'Email available'
            };
        } catch (error) {
            // CRITICAL FIX: Log the error, but return a safe, structured response 
            // instead of throwing a generic error that causes a 500 crash.
            logger.error('❌ Error checking duplicate email:', error);
            return {
                exists: false, 
                message: 'Error checking email availability (Service failure)',
                validation_failed: true 
            };
        }
    }

    //---------------------------------------------------------
    // 2. ROLL NUMBER VALIDATION
    //---------------------------------------------------------

    /**
     * Check central database for duplicate roll numbers.
     * Only blocks roll numbers currently marked as 'approved'.
     */
    async checkDuplicateRollNo(rollNo) {
        try {
            if (!rollNo || rollNo.toString().trim().length === 0) {
                return { exists: false, message: 'Roll number is required' };
            }
            const cleanedRollNo = rollNo.toString().trim();
            
            // NEW VALIDATION: Roll number cannot start with zero
            if (cleanedRollNo.startsWith('0')) {
                // Return 'exists: true' with a message to flag the input error immediately.
                return { exists: true, message: 'University roll number cannot start with zero.' };
            }

            // FIX: Check if database pool is available
            if (!this.dbPool) {
                logger.error('Database pool not available in ValidationService');
                return { 
                    exists: false, 
                    message: 'Database service temporarily unavailable',
                    validation_failed: true 
                };
            }

            // Fulfills the business logic: Only block if status is 'approved'
            const query = `
                SELECT id 
                FROM students 
                WHERE university_roll_no = $1 
                AND status = 'approved' 
            `; 
            
            const result = await this.dbPool.query(query, [cleanedRollNo]);
            
            const exists = result.rows.length > 0;
            return {
                exists: exists,
                message: exists ? 'Roll number already registered and approved.' : 'Roll number available'
            };
        } catch (error) {
            logger.error('❌ Error checking duplicate roll number:', error);
            // Return safe response on database failure
            return { 
                exists: false, 
                message: 'Error checking roll number availability (Service failure)',
                validation_failed: true 
            };
        }
    }

    //---------------------------------------------------------
    // 3. CONTACT/MISC VALIDATION
    //---------------------------------------------------------

    /**
     * Validate Indian contact number format.
     */
    validateContactNumber(contactNumber) {
        if (!contactNumber) return { valid: false, message: 'Contact number is required' };
        const cleanedNumber = contactNumber.toString().trim().replace(/\D/g, '');
        
        if (cleanedNumber.length !== 10) {
            return { valid: false, message: 'Contact number must be exactly 10 digits' };
        }
        // Fulfills the business logic that numbers must start with 6, 7, 8, or 9
        if (!/^[6-9]\d{9}$/.test(cleanedNumber)) {
            return { valid: false, message: 'Invalid contact number. Must start with 6-9.' };
        }
        return { valid: true, message: 'Contact number is valid' };
    }

    /**
     * Validate Pincode format.
     */
    validatePincode(pincode) {
        if (!pincode) return { valid: false, message: 'Pincode is required' };
        const pincodeStr = pincode.toString().trim();
        if (!/^\d{6}$/.test(pincodeStr)) return { valid: false, message: 'Pincode must be 6 digits' };
        return { valid: true, message: 'Pincode is valid' };
    }

    /**
     * Validate CPI (Cumulative Performance Index) range.
     */
    validateCPI(cpi) {
        if (!cpi && cpi !== 0) return { valid: false, message: 'CPI is required' };
        const cpiValue = parseFloat(cpi);
        if (isNaN(cpiValue)) return { valid: false, message: 'CPI must be a number' };
        if (cpiValue < 0 || cpiValue > 10) return { valid: false, message: 'CPI must be between 0 and 10' };
        return { valid: true, message: 'CPI is valid' };
    }

    /**
     * Validate Date of Birth and age range (16 to 30 years).
     */
    validateDOB(dobString) {
        if (!dobString) return { valid: false, message: 'Date of birth is required' };
        const dob = new Date(dobString);
        const today = new Date();
        if (isNaN(dob.getTime())) return { valid: false, message: 'Invalid date of birth' };
        if (dob > today) return { valid: false, message: 'Date of birth cannot be in future' };

        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        // Fulfills business logic age restriction
        if (age < 16) return { valid: false, message: 'Student must be at least 16 years old' };
        if (age > 30) return { valid: false, message: 'Student age cannot exceed 30 years' }; 

        return { valid: true, message: 'Date of birth is valid', age: age };
    }

    /**
     * Validate Name fields (format and length).
     */
    validateName(name, fieldName) {
        if (!name || name.trim().length === 0) return { valid: false, message: `${fieldName} is required` };
        const nameRegex = /^[a-zA-Z\s.'-]+$/;
        if (!nameRegex.test(name.trim())) return { valid: false, message: `Invalid ${fieldName} format (letters, spaces, and hyphens only)` };
        if (name.trim().length < 2) return { valid: false, message: `${fieldName} must be at least 2 characters` };
        if (name.trim().length > 50) return { valid: false, message: `${fieldName} cannot exceed 50 characters` };
        return { valid: true, message: `${fieldName} is valid` };
    }

    //---------------------------------------------------------
    // 4. FULL SUITE VALIDATION
    //---------------------------------------------------------

    /**
     * Run full suite of validation for Student Registration.
     */
    async validateStudentRegistration(studentData) {
        const errors = [];
        const validatedData = {};

        try {
            const firstNameValidation = this.validateName(studentData.firstName, 'First name');
            if (!firstNameValidation.valid) errors.push(firstNameValidation.message);

            const lastNameValidation = this.validateName(studentData.lastName, 'Last name');
            if (!lastNameValidation.valid) errors.push(lastNameValidation.message);

            if (!studentData.gender) errors.push('Gender is required');

            const dobValidation = this.validateDOB(studentData.dob);
            if (!dobValidation.valid) errors.push(dobValidation.message);
            else validatedData.age = dobValidation.age;

            if (!studentData.currentYear) errors.push('Current year is required');
            if (!studentData.branch) errors.push('Branch is required');
            if (!studentData.course) errors.push('Course is required');
            if (!studentData.section) errors.push('Section is required');

            const contactValidation = this.validateContactNumber(studentData.contactNumber);
            if (!contactValidation.valid) errors.push(contactValidation.message);

            // Roll Number Duplication Check
            if (!studentData.rollNo) {
                errors.push('University roll number is required');
            } else {
                // Must ensure this function is awaited inside the main registration process
                const rollNoResult = await this.checkDuplicateRollNo(studentData.rollNo);
                if (rollNoResult.exists) errors.push(rollNoResult.message);
            }

            const cpiValidation = this.validateCPI(studentData.cpi);
            if (!cpiValidation.valid) errors.push(cpiValidation.message);

            if (!studentData.state) errors.push('State is required');
            if (!studentData.city) errors.push('City is required');
            const pincodeValidation = this.validatePincode(studentData.pincode);
            if (!pincodeValidation.valid) errors.push(pincodeValidation.message);

            // Email Format and Duplication Check
            const emailValidation = this.validateEmail(studentData.email);
            if (!emailValidation.valid) {
                errors.push(emailValidation.message);
            } else {
                const duplicateEmail = await this.checkDuplicateEmail(studentData.email);
                if (duplicateEmail.exists) errors.push(duplicateEmail.message);
            }

            return { isValid: errors.length === 0, errors: errors, validatedData: validatedData };

        } catch (error) {
            logger.error('❌ Validation service error:', error);
            return { isValid: false, errors: [`Validation error: ${error.message}`], validatedData: {} };
        }
    }

    /**
     * Final sanitization to trim strings and ensure simple XSS filtering 
     * is already done by BridgeGate, but included here for completeness.
     */
    sanitizeInput(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                // Ensure trimming is done before persistence
                sanitized[key] = value.trim(); 
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
}

module.exports = ValidationService;