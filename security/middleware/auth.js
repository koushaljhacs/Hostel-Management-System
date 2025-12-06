const jwt = require('jsonwebtoken');
const logger = require('../../config/logger');

// ** PRODUCTION FIX 1: Ensure JWT Secret is present at startup **
if (!process.env.JWT_SECRET) {
    logger.error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set. Exiting.");
    process.exit(1); 
}

// FIX: Define the mapping between numeric Role IDs (from the database) and string Role Names (used in the routes).
// Assuming the Role ID 2 is intended for the admin dashboard access.
const ROLE_MAP = {
    // These IDs should match your 'roles' table in schema.sql
    1: 'system_admin',
    2: 'admin', // Your current testadmin user has role_id 2
    3: 'chief_warden',
    4: 'warden',
    5: 'student',
    // Add other roles as necessary
};

/**
 * Helper function to convert numeric role ID (as string) to role name.
 * @param {string} roleId - The role ID (as a string, e.g., '2') from the JWT payload.
 * @returns {string} The corresponding role name (e.g., 'admin') or null.
 */
function getRoleName(roleId) {
    // Ensure the input is treated as an integer key
    return ROLE_MAP[parseInt(roleId)] || null;
}


/**
 * Middleware to verify JWT token and attach user data to the request. (Authentication)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const authenticateToken = (req, res, next) => {
    // Check for token in the Authorization header: Bearer <token>
    const authHeader = req.headers['authorization'];
    
    // ** PRODUCTION FIX 2: Check for Authorization header format **
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token or incorrect format provided. Use 401 for "Authentication required."
        logger.warn('Access Denied: Missing or malformed Authorization header.');
        return res.status(401).json({ message: 'Authentication required. Please login to access this resource.' });
    }
    
    // Extract the token part
    const token = authHeader.split(' ')[1];

    if (!token) {
        // Should be caught by the block above, but keeping for safety.
        return res.status(401).json({ message: 'Authentication required. Please login to access this resource.' });
    }

    try {
        // The token is verified using the secret key
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        // Log detailed error for debugging purposes
        logger.error('JWT verification failed:', error.message);

        // Respond with specific errors for the client
        if (error.name === 'TokenExpiredError') {
            // Use 401 for expired token, as it requires a fresh login
            return res.status(401).json({ message: 'Authentication required: Token expired. Please login again.' });
        }
        if (error.name === 'JsonWebTokenError') {
            // This covers invalid signature, malformed token, etc. Use 401 as the token itself is bad.
            return res.status(401).json({ message: 'Authentication required: Invalid token signature or format.' });
        }
        
        // General error handling
        return res.status(401).json({ message: 'Authentication failed. Please login to continue.' });
    }
};

/**
 * Middleware to check if the user has a required role or one of the required roles. (Authorization)
 * @param {string|string[]} requiredRole - The role string(s) required (e.g., 'admin', or ['admin', 'chief_warden'] for the dashboard)
 */
const authorizeRole = (requiredRole) => {
    // Convert single string role to an array for unified handling
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    return (req, res, next) => {
        // Assumes authenticateToken has already run and populated req.user
        if (!req.user || !req.user.role) {
            // If authentication succeeded but role is missing, something is wrong with the token payload
            logger.error('Authorization error: User data or role missing after authentication.');
            // Using 403 (Forbidden) here is correct because the user *is* authenticated but *not authorized*.
            return res.status(403).json({ message: 'Forbidden: User context failed to load.' });
        }

        // FIX: Convert the numeric role ID from the JWT (req.user.role) to a Role Name string
        const userRoleName = getRoleName(req.user.role);

        if (!userRoleName) {
            logger.error(`Authorization failed: Role ID ${req.user.role} does not map to a known role name.`);
            return res.status(403).json({ message: 'Forbidden: Unknown user role.' });
        }

        // Check if the user's role name is included in the list of allowed roles
        if (!roles.includes(userRoleName)) {
            logger.warn(`Authorization failed: User ${req.user.id} tried to access protected route with role '${userRoleName}'.`);
            return res.status(403).json({ message: 'Forbidden: Insufficient privileges.' });
        }

        // Attach the string role name to the request for easy use in subsequent middleware/routes
        req.user.roleName = userRoleName;
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRole
};