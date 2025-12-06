/**
 * HMS-CENTRAL-COPY/web-interfaces/homepage/js/auth.js
 * * Centralized Client-Side Authentication Logic.
 * * Handles: Login for all roles (Student, Warden, Admin), Maintenance Check, 
 * * and Token-based Redirection.
 */

// API Base URL - This points to the Central Command Server's public endpoints
const API_BASE = '/api';

// Current active role (For tracking which panel is active)
let currentRole = '';


// Maintenance check before login
async function checkMaintenanceBeforeLogin() {
    // Check if the MaintenanceChecker is loaded (it should be, via index.html loading maintenance.js)
    if (typeof MaintenanceChecker === 'undefined' || !MaintenanceChecker.checkTransactionBlock) {
        console.warn("MaintenanceChecker not available. Skipping client-side transaction check.");
        return false;
    }
    
    // The checkTransactionBlock function checks the maintenance status API
    const isBlocked = await MaintenanceChecker.checkTransactionBlock();
    
    if (isBlocked) {
        // The checkTransactionBlock function internally displays the warning.
        const messageDiv = document.getElementById('loginMessage');
        if (messageDiv) {
            messageDiv.innerHTML = `<div class="alert alert-danger" role="alert">Login blocked: System is undergoing maintenance.</div>`;
        }
    }
    
    return isBlocked;
}

// Role selection (Used by buttons on the homepage for Staff/Student portals)
document.querySelectorAll('.banking-login-btn').forEach(button => {
    button.addEventListener('click', function() {
        const parentPanel = this.closest('.banking-panel');
        if (parentPanel.classList.contains('personal-panel')) {
             // Student login already redirects via index.html (redirectToStudentLogin())
             return; 
        } else {
             // Institutional Access (Warden/Admin)
             currentRole = 'institutional'; 
             // Simulate login attempt with placeholder credentials for IT Admin (Role 1)
             handleInstitutionalAccess();
        }
    });
});

// Helper function to simulate the login process for Institutional Access
function handleInstitutionalAccess() {
    // These credentials must be used only for DEMO/TESTING after running setup-database.js
    const username = 'it_admin_root';
    const password = 'secure_root_password_123'; 
    
    // Check maintenance status first (CRITICAL CHECK)
    checkMaintenanceBeforeLogin().then(isMaintenance => {
        if (isMaintenance) {
            return;
        }
        
        // This simulates hitting the central login endpoint
        loginAttempt(username, password);
    });
}


// Core login function
async function loginAttempt(username, password) {
    const messageDiv = document.getElementById('loginMessage') || document.querySelector('.login-area #loginMessage');
    
    if (messageDiv) {
        messageDiv.innerHTML = `<div class="alert alert-info">Logging in...</div>`;
    }
    
    try {
        // Hitting the CentralAuthService endpoint defined in server.js
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.token) {
            // Store token securely (In production, use secure HTTP-only cookie)
            localStorage.setItem('hms-token', data.token);
            
            showMessage('Login successful! Redirecting to dashboard...', 'success');
            
            // Redirect based on Role ID (Dual-Admin Hierarchy)
            setTimeout(() => {
                if (data.user.roleId === 1 || data.user.roleId === 2) { // Super Admin (1) or Hostel Admin (2)
                    window.location.href = '/admin/'; 
                } else if (data.user.roleId === 4) { // Student (4)
                    window.location.href = '/student/dashboard'; 
                } else {
                     window.location.href = '/dashboard';
                }
            }, 1000);
            
        } else {
            showMessage(data.error || 'Login failed: Invalid credentials.', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Failed to connect to Central Command Server.', 'danger');
    }
}


// Show message in the respective panel's message area
function showMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    if (messageDiv) {
        const color = type === 'success' ? '#2e7d32' : '#d32f2f';
        const bgColor = type === 'success' ? '#e8f5e8' : '#ffebee';
        const borderColor = type === 'success' ? '#4caf50' : '#f44336';
        
        messageDiv.innerHTML = `
            <div class="alert alert-${type}" role="alert" style="padding: 10px; border-radius: 5px; font-size: 14px; background: ${bgColor}; color: ${color}; border: 1px solid ${borderColor};">
                ${message}
            </div>
        `;
    } else {
         console.log(`Login Status: ${type} - ${message}`);
    }
}

// Initial script load hook
document.addEventListener('DOMContentLoaded', function() {
    // Add a message area dynamically for use by the loginAttempt function
    document.querySelectorAll('.login-area').forEach(area => {
        if (!area.querySelector('#loginMessage')) {
            const messageDiv = document.createElement('div');
            messageDiv.id = 'loginMessage';
            messageDiv.style.marginTop = '15px';
            area.appendChild(messageDiv);
        }
    });

    // Check if the URL has a maintenanceComplete flag and alert user
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('maintenanceComplete')) {
        showMessage('Maintenance window has successfully closed. System is fully operational!', 'success');
    }
});