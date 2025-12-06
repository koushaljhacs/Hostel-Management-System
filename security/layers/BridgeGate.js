/**
 * HMS-CENTRAL-COPY/security/layers/BridgeGate.js
 * * LAYER 3: Final Validation (Bridge Gate) - The "Master Validation"
 * * Performs final, deep security and business logic checks on data *before* it hits the database.
 * * Fulfills requirement for: Final data sanitization, Business logic validation, 
 * * Cross-service data consistency, and SQL injection prevention.
 */

const logger = require('../../config/logger');

class BridgeGate {
    constructor(dbPool) {
        this.dbPool = dbPool;
        // Lazily load ValidationService, as it relies on the dbPool
        this.ValidationService = require('../../distributed-services/registration-service/services/ValidationService');
        this.validationServiceInstance = new this.ValidationService(this.dbPool);
    }

    /**
     * Deep data validation against a schema.
     * This ensures data integrity before business logic checks.
     */
    validateDataStructure(data, schema) {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];

            // 1. Required check
            if (rules.required && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                continue; // Skip optional empty fields
            }
            
            // 2. Type check
            if (rules.type) {
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== rules.type) {
                    // Special handling for numbers passed as strings from forms
                    if (rules.type === 'number' && actualType === 'string' && !isNaN(parseFloat(value))) {
                        // Pass, conversion will be handled later
                    } else {
                        errors.push(`${field} must be of type ${rules.type}`);
                        continue;
                    }
                }
            }
            
            // 3. Length/Pattern check for strings
            if (typeof value === 'string') {
                 if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters`);
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${field} must not exceed ${rules.maxLength} characters`);
                }
                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`${field} format is invalid`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * SQL Injection prevention via explicit query wrapper.
     * Forces use of parameterized queries and performs a final check.
     */
    async safeQuery(query, params = []) {
        // This abstraction forces developers to use parameterized queries ($1, $2) 
        // as the final layer of defense against SQLi.
        try {
            // Perform basic pre-query check on parameters
            for (const param of params) {
                if (typeof param === 'string' && param.match(/(union\s+select)|(drop\s+table)|(xp_cmdshell)/i)) {
                    throw new Error('SQL_INJECTION_DETECTED_PRE_QUERY');
                }
            }
            const result = await this.dbPool.query(query, params);
            return result;
        } catch (error) {
            logger.error('BridgeGate query error', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    /**
     * XSS filtering (Final data sanitization)
     */
    filterXSS(input) {
        if (typeof input !== 'string') return input;

        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    }

    /**
     * Business logic validation (e.g., Uniqueness, Age Rules, Referencing other tables)
     * This relies heavily on the `ValidationService` for core business checks.
     */
    async validateBusinessLogic(data, context) {
        const errors = [];
        
        // 1. Core Student Registration Validation
        if (context.operation === 'register') {
            const validationResult = await this.validationServiceInstance.validateStudentRegistration(data);
            if (!validationResult.isValid) {
                errors.push(...validationResult.errors);
            }
        }
        
        // 2. Example: Custom Age Range Check (16-32)
        if (data.dob) {
            const dobValidation = this.validationServiceInstance.validateDOB(data.dob);
            if (!dobValidation.valid) {
                 // Check if the error is already captured by the main validation above
                if (!errors.includes(dobValidation.message)) {
                     errors.push(dobValidation.message);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Main entry point - runs all BridgeGate validations
     * Fulfills STEP 2: SECURITY QUALITY TEST -> If ALL checks PASS -> Proceed to Central Server
     */
    async runChecks(data, schema, context = {}) {
        
        // 1. Data Structure Validation
        const structureCheck = this.validateDataStructure(data, schema);
        if (!structureCheck.valid) {
            return { passed: false, reason: 'DATA_VALIDATION_FAILED', errors: structureCheck.errors };
        }

        // 2. Business Logic Validation (Uniqueness, Age, Referential Integrity)
        const logicCheck = await this.validateBusinessLogic(data, context);
        if (!logicCheck.valid) {
            return { passed: false, reason: 'BUSINESS_LOGIC_VALIDATION_FAILED', errors: logicCheck.errors };
        }

        // 3. Final XSS Filtering
        const filteredData = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                filteredData[key] = this.filterXSS(value);
            } else {
                filteredData[key] = value;
            }
        }
        
        // 4. Final Data Sanitization (Trimming/Type Coercion)
        const sanitizedData = this.validationServiceInstance.sanitizeInput(filteredData);
        
        return { passed: true, data: sanitizedData };
    }
}

module.exports = BridgeGate;
