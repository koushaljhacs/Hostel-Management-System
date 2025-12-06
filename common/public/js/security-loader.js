/**
 * SECURITY LOADER - SAFE VERSION
 * Client-side security that reports violations to the backend firewall.
 */

(function() {
    'use strict';
    // Security configuration
    const SECURITY_CONFIG = {
        enableEventProtection: true,
        enableDOMProtection: true,
        enableInspectionProtection: true,
        showAlerts: true,
        alertCooldown: 3000 // 3 seconds between alerts
    };
    
    let lastAlertTime = 0;
    let lastReportTime = 0; // <-- NEW: Last time a report was sent
    const REPORT_COOLDOWN = 5000; // <-- NEW: 5 second cooldown for reporting
    
    // ==================== EVENT PROTECTION ====================
    if (SECURITY_CONFIG.enableEventProtection) {
        // Right-click protection
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showSafeAlert('Right-click disabled for security');
            reportViolation('CONTEXT_MENU_DISABLED'); 
            return false;
        });
        
        // Text selection protection
        document.addEventListener('selectstart', function(e) {
            e.preventDefault();
            return false;
        });
        
        // Drag protection
        document.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });
        
        // DevTools keyboard protection
        document.addEventListener('keydown', function(e) {
            const blockedCombinations = [
                { ctrl: true, shift: true, key: 'i' }, // DevTools
                { ctrl: true, shift: true, key: 'j' }, // Console
                { ctrl: true, shift: true, key: 'c' }, // Copy
                { ctrl: true, key: 'u' },              // View Source
                { key: 'F12' },                        // DevTools
                { key: 'F11' }                         // Full screen
            ];
            
            for (const combo of blockedCombinations) {
                if (checkKeyCombo(e, combo)) {
                    e.preventDefault();
                    e.stopPropagation();
                    showSafeAlert('Developer tools are disabled');
                    reportViolation('DEVTOOLS_KEY_COMBO'); 
                    return false;
                }
            }
        });
    }
    
    // ==================== DOM PROTECTION ====================
    if (SECURITY_CONFIG.enableDOMProtection) {
        // Apply CSS protections
        applySafeCSSProtections();
        
        // Safe DOM monitoring without recursion
        setupSafeMutationObserver();
    }
    
    // ==================== INSPECTION PROTECTION ====================
    if (SECURITY_CONFIG.enableInspectionProtection) {
        // DevTools detection
        setupSafeDevToolsDetection();
    }
    
    // ==================== NEW: SECURITY REPORTING FUNCTION ====================
    
    /**
     * Sends a violation report to the backend server to increment the strike count.
     * This is a fire-and-forget request.
     * @param {string} reason The specific reason for the strike (e.g., 'DEVTOOLS_KEY_COMBO')
     */
    function reportViolation(reason) {
        // --- COOLDOWN CHECK ---
        const now = Date.now();
        if (now - lastReportTime < REPORT_COOLDOWN) {
            return;
        }
        lastReportTime = now;
        // ----------------------

        const payload = {
            reason: reason,
            page: window.location.pathname
        };
        // Use a non-blocking fetch call
        fetch('/api/report-violation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => {
            // This is a silent failure, as the main goal is just to send the signal.
        });
    }
    
    // ==================== SAFE UTILITY FUNCTIONS ====================
    
    function checkKeyCombo(event, combo) {
        // SAFE VERSION: Add comprehensive null checks to prevent TypeError
        if (!event || !combo || typeof combo !== 'object') return false;
        
        try {
            // Safe key access with fallbacks
            const eventKey = event.key || '';
            const comboKey = combo.key || '';
            
            // If either key is empty, return false
            if (!eventKey || !comboKey) return false;
            
            return (
                (combo.ctrl === undefined || combo.ctrl === event.ctrlKey) &&
                (combo.shift === undefined || combo.shift === event.shiftKey) &&
                (combo.alt === undefined || combo.alt === event.altKey) &&
                (combo.meta === undefined || combo.meta === event.metaKey) &&
                eventKey.toLowerCase() === comboKey.toLowerCase()
            );
        } catch (error) {
            reportViolation('SECURITY_KEY_CHECK_ERROR');
            return false;
        }
    }
    
    function showSafeAlert(message) {
        if (!SECURITY_CONFIG.showAlerts) return;
        
        // Cooldown check to prevent spam
        const now = Date.now();
        if (now - lastAlertTime < SECURITY_CONFIG.alertCooldown) return;
        lastAlertTime = now;
        
        // --- REPORTING (General Alert Trigger) ---
        reportViolation('CLIENT_ALERT_TRIGGERED'); 
        // ----------------------------------------
        
        try {
            const alertDiv = document.createElement('div');
            alertDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff4444;
                color: white;
                padding: 12px 18px;
                border-radius: 6px;
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 13px;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: safeSlideIn 0.3s ease;
            `;
            
            // Add animation keyframes safely
            if (!document.querySelector('#safe-security-animations')) {
                const style = document.createElement('style');
                style.id = 'safe-security-animations';
                style.textContent = `
                    @keyframes safeSlideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            alertDiv.textContent = `🔒 ${message}`;
            document.body.appendChild(alertDiv);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 3000);
            
        } catch (error) {
            reportViolation('SECURITY_ALERT_ERROR');
        }
    }
    
    function applySafeCSSProtections() {
        try {
            const style = document.createElement('style');
            style.textContent = `
                /* Disable text selection */
                * {
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                    -webkit-touch-callout: none !important;
                }
                
                /* Allow selection only in inputs */
                input, textarea, [contenteditable="true"] {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                }
                
                /* Disable image dragging */
                img {
                    -webkit-user-drag: none !important;
                    -moz-user-drag: none !important;
                    user-drag: none !important;
                }
            `;
            document.head.appendChild(style);
        } catch (error) {
            reportViolation('CSS_PROTECTION_ERROR');
        }
    }
    
    function setupSafeMutationObserver() {
        try {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes') {
                        showSafeAlert('DOM modification detected');
                        reportViolation('DOM_MODIFICATION'); // <-- ADDED REPORT
                    }
                });
            });
            
            observer.observe(document, {
                attributes: true,
                childList: false, // Disabled to prevent recursion
                subtree: false
            });
        } catch (error) {
            reportViolation('MUTATION_OBSERVER_ERROR');
        }
    }
    
    function setupSafeDevToolsDetection() {
        try {
            const checkDevTools = () => {
                const widthThreshold = window.outerWidth - window.innerWidth > 200;
                const heightThreshold = window.outerHeight - window.innerHeight > 200;
                
                if (widthThreshold || heightThreshold) {
                    showSafeAlert('Developer tools detected');
                    reportViolation('DEVTOOLS_RESIZE_DETECTED'); // <-- ADDED REPORT
                }
            };
            
            // Check every 5 seconds (not too frequently)
            setInterval(checkDevTools, 5000);
        } catch (error) {
            reportViolation('DEVTOOLS_DETECTION_ERROR');
        }
    }
    
    // ==================== INITIALIZATION ====================
    function initializeSecurity() {
        // Add security badge
        try {
            const badge = document.createElement('div');
            badge.style.cssText = `
                position: fixed;
                bottom: 15px;
                left: 15px; /* <-- MOVED FROM 'right' TO 'left' */
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 12px;
                font-family: Arial, sans-serif;
                font-weight: bold;
                z-index: 9998;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            `;
            badge.textContent = '🔒 Secured';
            badge.title = 'Security System Active';
            document.body.appendChild(badge);
        } catch (error) {
            reportViolation('SECURITY_BADGE_ERROR');
        }
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSecurity);
    } else {
        initializeSecurity();
    }
    
    // Export safe methods for external use
    window.safeSecurity = {
        enableAlerts: function() { SECURITY_CONFIG.showAlerts = true; },
        disableAlerts: function() { SECURITY_CONFIG.showAlerts = false; },
        getConfig: function() { return {...SECURITY_CONFIG}; }
    };
    
})();