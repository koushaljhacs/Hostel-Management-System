/**
 * HMS-CENTRAL-COPY/web-interfaces/user-portals/js/session-manager.js
 * * Global utility to intercept 401 Unauthorized errors and enforce session timeout.
 * NOTE: This requires showAlertModal() to be globally available (defined in login.js).
 */

const AUTH_API_URL_PREFIX = '/api/';
const LOGIN_PAGE_URL = '/student-login'; 

/**
 * Handles session expiration: clears token, alerts user, and redirects.
 * Assumes showAlertModal is defined in a globally included script.
 */
function handleSessionExpiration(message) {
    console.warn('[SESSION MANAGER] Session expired. Clearing token and redirecting...');
    
    // 1. Clear the token
    localStorage.removeItem('hmsToken');
    
    // 2. Display Message (Using the existing modal function)
    if (typeof showAlertModal === 'function') {
        showAlertModal('Session Expired', message, true);
    } else {
        // Fallback if modal is not loaded
        alert(message);
    }

    // 3. Redirect after a small delay
    setTimeout(() => {
        window.location.href = LOGIN_PAGE_URL;
    }, 1000); 
}

/**
 * A wrapper for the native fetch API to include the authorization header 
 * and automatically handle 401 responses.
 * * @param {string} endpoint - The API endpoint (e.g., 'student/profile')
 * @param {Object} options - Standard fetch options
 * @returns {Promise<Response>}
 */
async function authenticatedFetch(endpoint, options = {}) {
    const token = localStorage.getItem('hmsToken');
    
    if (!token) {
        // If the token is already gone (e.g., manually cleared), redirect immediately
        if (endpoint !== 'login') {
             handleSessionExpiration("Authentication token missing. Please log in.");
        }
        // For login, proceed without token
        return fetch(AUTH_API_URL_PREFIX + endpoint, options);
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers 
    };

    const response = await fetch(AUTH_API_URL_PREFIX + endpoint, {
        ...options,
        headers: headers,
    });

    // === CRITICAL: INTERCEPT 401 RESPONSE ===
    if (response.status === 401) {
        const errorData = await response.json().catch(() => ({ error: 'Your session has expired.' }));
        handleSessionExpiration(errorData.error || 'Your session has expired. Please log in again.');
        // Return a response that reflects the failed state
        return new Response(JSON.stringify(errorData), { status: 401, headers: response.headers });
    }

    return response;
}

// Ensure utility functions are globally available for the dashboard scripts
window.authenticatedFetch = authenticatedFetch;
window.handleSessionExpiration = handleSessionExpiration;