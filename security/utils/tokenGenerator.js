const jwt = require('jsonwebtoken');
const logger = require('../../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_EXPIRATION = process.env.TOKEN_EXPIRATION || '15m';

/**
 * Generates a JWT token with optional per-role expiration overrides.
 * @param {object} payload - Data to include in the token (e.g., user ID, role).
 * @param {object} options - Additional signing options ({ expiresIn?: string | number | null }).
 * @returns {string} The signed JWT token.
 */
const generateToken = (payload, options = {}) => {
    if (!JWT_SECRET) {
        logger.error('CRITICAL: Attempted to generate token but JWT_SECRET is missing.');
        throw new Error('Token generation failed: Security configuration missing.');
    }

    const signOptions = {
        algorithm: 'HS256'
    };

    const expiresIn = Object.prototype.hasOwnProperty.call(options, 'expiresIn')
        ? options.expiresIn
        : DEFAULT_EXPIRATION;

    if (expiresIn) {
        signOptions.expiresIn = expiresIn;
    }

    try {
        return jwt.sign(payload, JWT_SECRET, signOptions);
    } catch (error) {
        logger.error('Error generating JWT token:', error);
        throw new Error('Token generation failed due to internal signing error.');
    }
};

module.exports = {
    generateToken
};