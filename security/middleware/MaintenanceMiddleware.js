// 1. Maintenance Middleware - Pure middleware function only
const maintenanceSystem = require('./MaintenanceSystem');

// Simple middleware function - no attached methods
const maintenanceMiddleware = (req, res, next) => {
    return maintenanceSystem.maintenanceMiddleware(req, res, next);
};

module.exports = maintenanceMiddleware;