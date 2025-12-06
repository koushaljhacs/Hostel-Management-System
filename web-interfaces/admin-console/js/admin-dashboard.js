/**
 * HMS-CENTRAL-COPY/web-interfaces/admin-console/js/hostel-admin-dashboard.js
 * * 100% PRODUCTION CODE - REAL BACKEND CONNECTION
 * * COMPLETELY REPLACES ALL DUMMY DATA WITH REAL DATABASE QUERIES
 * * FIXES "unknown unknown" student name issue
 * * CRITICAL FIX: Enhanced API fetching with detailed error logging to console.
 * * CRITICAL FIX: Add explicit 401 Unauthorized handling to force logout/re-login.
 */

const API_BASE = '/api/admin';

const ADMIN_PORTAL_ROLE = window.ADMIN_PORTAL_ROLE || 'general';
const ROLE_TIMEOUTS = {
    general: 15 * 60 * 1000,
    'hostel-admin': 30 * 60 * 1000,
    'it-admin': null
};

const INACTIVITY_TIMEOUT_MS = ROLE_TIMEOUTS[ADMIN_PORTAL_ROLE] ?? ROLE_TIMEOUTS.general;
let inactivityTimer;

function logoutUser() {
    console.log('🚨 SECURITY: Inactivity timeout reached or 401 received. Logging out...');
    localStorage.removeItem('adminJwtToken');
    // Use a delay to ensure console messages are logged before redirect
    setTimeout(() => {
        window.location.href = '/student-login';
    }, 100);
}

function resetTimer() {
    if (!INACTIVITY_TIMEOUT_MS) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutUser, INACTIVITY_TIMEOUT_MS);
}

function setupInactivityWatcher() {
    if (!INACTIVITY_TIMEOUT_MS) {
        console.info('Inactivity timeout disabled for this portal role.');
        return;
    }
    resetTimer();
    document.addEventListener('mousemove', resetTimer, false);
    document.addEventListener('keypress', resetTimer, false);
    document.addEventListener('click', resetTimer, false);
    document.addEventListener('scroll', resetTimer, false);
    
    // FIX: Use safe element checking
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => { 
            e.preventDefault();
            logoutUser();
        });
    } else {
        console.warn('Logout button not found in DOM - skipping event listener');
    }
}
// ===============================================
// 🚀 REAL BACKEND API CALLS - ENHANCED DEBUGGING
// ===============================================

async function fetchApi(endpoint) {
    const token = localStorage.getItem('adminJwtToken') || '';
    
    // Quick pre-check for token before fetch
    if (!token && endpoint.includes('/admin/')) {
        console.warn(`🔗 REAL API CALL: Aborting request to ${endpoint}. No admin token found.`);
        // Force logout/redirect if no token is present for a protected route
        logoutUser();
        throw new Error('API Error: Authentication required. Please login to access this resource.');
    }

    try {
        console.log(`🔗 REAL API CALL: Fetching data from ${endpoint}`);
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // CRITICAL DEBUG: If response is not OK, throw error with status
        if (!response.ok) {
            let errorDetails = `HTTP ${response.status} (${response.statusText})`;
            
            // Attempt to get specific error message from server response body if available
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorDetails += `: ${errorData.message}`;
                } else if (errorData.errors) {
                    errorDetails += `: ${JSON.stringify(errorData.errors)}`;
                }
                
                // CRITICAL FIX: If 401 is received, and the message indicates auth failure, force client-side logout.
                // This covers expired tokens and unauthorized access.
                if (response.status === 401 && errorDetails.includes('Authentication required.')) {
                    console.error('🚨 401 RECEIVED: Token expired or invalid. Forcing client-side logout...');
                    logoutUser();
                    // Prevent further dashboard loading/updates
                    throw new Error(`API Error: ${errorDetails}`); 
                }
                
            } catch (e) {
                // Ignore JSON parsing error if body is not JSON
            }
            
            console.error(`💥 REAL API FAILED: ${endpoint} -> Status ${response.status} - ${errorDetails}`);
            throw new Error(`API Error: ${errorDetails}`);
        }
        
        const data = await response.json();
        console.log(`✅ REAL API SUCCESS: ${endpoint}`, data);
        return data;
        
    } catch (error) {
        // Log the failure in the console with endpoint
        console.error(`❌ REAL API FAILED: Could not complete request to ${endpoint} API Error: ${error.message}`);
        
        // Return a standardized failure object
        return { 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString() 
        };
    }
}

// ===============================================
// 📊 REAL DASHBOARD DATA LOADING
// ===============================================

async function loadDashboardData() {
    console.log('🔄 ========== LOADING REAL DASHBOARD DATA ==========');
    
    // Clear previous errors/loading states for a fresh start
    updateCardStatusIndicators('loading');
    updateSystemStatsStatusIndicators('loading');
    updateActivityStatusIndicator('loading');
    
    // Initial token check to prevent needless API calls if not logged in
    if (!localStorage.getItem('adminJwtToken')) {
        console.warn('❌ DASHBOARD LOAD FAILED: No token found. Redirecting to login.');
        showAllErrors();
        logoutUser();
        return;
    }
    
    try {
        await Promise.all([
            loadRealStats(),
            loadRealSystemStats(),
            loadRealActivities()
        ]);
        console.log('✅ ========== REAL DASHBOARD DATA LOADED ==========');
        attachCardNavigation();
    } catch (error) {
        // This catch handles critical errors in Promise.all, typically from load functions not returning safely.
        // The fetchApi function now handles the 401 redirect, so this is for other critical failure types.
        console.error('❌ ========== REAL DASHBOARD LOAD FAILED ==========', error);
        showAllErrors();
    }
}

async function loadRealStats() {
    console.log('📊 LOADING REAL STATS FROM DATABASE');
    const data = await fetchApi(`${API_BASE}/dashboard/stats`);
    
    if (data.success && data.stats) {
        updateRealCards(data.stats);
        updateCardStatusIndicators('success');
    } else {
        console.error('❌ REAL STATS FAILED: Check console for API details.');
        showCardErrors();
        updateCardStatusIndicators('error');
    }
}

async function loadRealSystemStats() {
    console.log('🖥️ LOADING REAL SYSTEM STATS');
    const data = await fetchApi(`${API_BASE}/dashboard/system-stats`);
    
    if (data.success && data.stats) {
        updateRealSystemStats(data.stats);
        updateRealFooterStatus(data.stats);
        updateSystemStatsStatusIndicators('success');
    } else {
        console.error('❌ REAL SYSTEM STATS FAILED: Check console for API details.');
        showSystemStatsErrors();
        updateSystemStatsStatusIndicators('error');
    }
}

async function loadRealActivities() {
    console.log('📝 LOADING REAL ACTIVITIES');
    const data = await fetchApi(`${API_BASE}/dashboard/activities`);
    
    if (data.success && Array.isArray(data.activities)) {
        console.log('✅ REAL ACTIVITIES LOADED:', data.activities.length, 'activities');
        updateRealActivities(data.activities);
        updateActivityStatusIndicator('success');
    } else {
        console.warn('⚠️ REAL ACTIVITIES: No data available or API failed. Check console.');
        updateRealActivities([]);
        updateActivityStatusIndicator(data.success ? 'no-data' : 'error');
    }
}


// ===============================================
// 🎯 REAL DATA UI UPDATES
// ===============================================

// New dedicated function for the complex Pending Requests card visuals
function updatePendingCardVisuals(cardElement, count) {
    const h2 = cardElement.querySelector('h2');
    if (!h2) return;

    // Use a string representation for display, or 'Error'
    const displayCount = (count !== undefined && count !== null) ? count.toString() : 'Error';
    
    // Update the counter on the card
    h2.textContent = displayCount;
    h2.classList.remove('card-loading');
    
    const isErrorOrNia = displayCount === 'N/A' || displayCount === 'Error';

    // Visual indicator for pending requests
    if (count > 0 && !isErrorOrNia) {
        cardElement.style.border = '2px solid #ff9800';
        cardElement.style.background = 'linear-gradient(135deg, #fff8e1 0%, #ffffff 100%)';
        cardElement.title = `Click to manage ${count} pending student requests`;
        h2.style.color = '';
    } else {
        cardElement.style.border = '1px solid var(--border-light)';
        cardElement.style.background = 'var(--bg-card)';
        cardElement.title = 'Click to manage pending student requests';
        
        if (isErrorOrNia) {
            h2.style.color = '#f44336';
        } else {
            h2.style.color = '';
        }
    }
}


function updateRealCards(stats) {
    console.log('🎴 UPDATING REAL CARDS UI');
    
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
        const h3 = card.querySelector('h3');
        const h2 = card.querySelector('h2');
        
        if (h3 && h2) {
            const title = h3.textContent.trim();
            let value = 'N/A';
            
            // Map card titles to real stats
            if (title === 'Total Hostels') value = stats.totalHostels !== undefined ? stats.totalHostels : 'N/A';
            else if (title === 'Occupancy Rate') value = stats.occupancyRate !== undefined ? stats.occupancyRate : 'N/A';
            else if (title === 'Total Students') value = stats.totalStudents !== undefined ? stats.totalStudents : 'N/A';
            else if (title === 'Available Rooms') value = stats.availableRooms !== undefined ? stats.availableRooms : 'N/A';
            
            // ** FIXED: Handle Pending Requests card directly using stats.pendingRequests **
            else if (title === 'Pending Requests') {
                const pendingCount = stats.pendingRequests !== undefined ? stats.pendingRequests : 'Error';
                updatePendingCardVisuals(card, pendingCount);
                // Ensure the indicator updates as well
                updatePendingStatusIndicator('success');
                // The rest of the generic logic is skipped for this specialized card
                return;
            } 
            // ** END FIXED LOGIC **
            
            else if (title === 'Security Incidents') value = stats.securityIncidents !== undefined ? stats.securityIncidents : 'N/A';
            else if (title === 'Fee Collection %') value = stats.feeCollection !== undefined ? stats.feeCollection : 'N/A';
            else if (title === 'Maintenance Issues') value = stats.maintenanceIssues !== undefined ? stats.maintenanceIssues : 'N/A';
            else if (title === 'Transport Vehicles') value = stats.transportVehicles !== undefined ? stats.transportVehicles : 'N/A';
            else if (title === 'Laundry Orders') value = stats.laundryOrders !== undefined ? stats.laundryOrders : 'N/A';
            else if (title === 'Active Visitors') value = stats.activeVisitors !== undefined ? stats.activeVisitors : 'N/A';
            else if (title === 'Mess Active') value = stats.messActive !== undefined ? stats.messActive : 'N/A';
            else value = 'N/A';
            
            h2.classList.remove('card-loading');
            h2.textContent = value;
            h2.style.color = value === 'N/A' || value === 'Error' ? '#ff9800' : '';
        }
    });
}

function navigateToModule(moduleName) {
    const url = new URL(window.location.href);
    url.searchParams.set('module', moduleName.replace(/\s+/g, '+').toLowerCase());
    window.location.href = url.toString();
}

function attachCardNavigation() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
        const titleElement = card.querySelector('h3');
        if (!titleElement) return;
        const title = titleElement.textContent.trim();

        let moduleTarget = null;
        if (title === 'Total Hostels') {
            moduleTarget = 'View All Hostels';
        } else if (title === 'Occupancy Rate' || title === 'Available Rooms') {
            moduleTarget = 'Occupancy Reports';
        } else if (title === 'Total Students') {
            moduleTarget = 'Student Admissions';
        } else if (title === 'Pending Requests') {
            moduleTarget = 'Student Admissions';
        } else if (title === 'Fee Collection %') {
            moduleTarget = 'Fee Collection';
        } else if (title === 'Maintenance Issues') {
            moduleTarget = 'System Alerts (Critical)';
        } else if (title === 'Security Incidents') {
            moduleTarget = 'Attack Vector Monitor';
        } else if (title === 'Transport Vehicles') {
            moduleTarget = 'View All Vehicles';
        } else if (title === 'Laundry Orders') {
            moduleTarget = 'View Laundry Orders';
        } else if (title === 'Active Visitors') {
            moduleTarget = 'Visitor Logs';
        } else if (title === 'Mess Active') {
            moduleTarget = 'Mess Configuration';
        }

        if (moduleTarget) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => navigateToModule(moduleTarget));
        }
    });
}

function updateRealSystemStats(stats) {
    console.log('⚙️ UPDATING REAL SYSTEM STATS UI');
    
    const mapping = [
        { label: 'Active Sessions', key: 'activeSessions' },
        { label: 'Storage Used', key: 'storageUsed' },
        { label: 'API Response', key: 'apiResponse' },
        { label: 'System Uptime', key: 'systemUptime' },
        { label: 'Total Users', key: 'totalUsers' },
        { label: 'Pending Tasks', key: 'pendingTasks' },
        { label: 'Server Load', key: 'serverLoad' },
        { label: 'Memory Usage', key: 'memoryUsage' }
    ];

    const items = document.querySelectorAll('.quick-stats-item');
    items.forEach((item, index) => {
        if (index >= mapping.length) return;
        const valElement = item.querySelector('.quick-stats-value');
        const key = mapping[index].key;

        if (valElement && stats[key] !== undefined) {
            const value = stats[key] || 'N/A';
            valElement.innerHTML = value;
            valElement.style.color = value === 'N/A' || value === 'Error' ? '#ff9800' : '';
        }
    });
}

function updateRealActivities(activities) {
    console.log('📝 UPDATING REAL ACTIVITIES UI');
    const activityList = document.getElementById('activityList');
    const summary = document.getElementById('activitySummary');
    
    if (!activityList) return;

    activityList.innerHTML = '';

    const safeActivities = Array.isArray(activities) ? activities : [];
    
    if (safeActivities.length === 0) {
        activityList.innerHTML = `
            <li class="activity-item">
                <div class="activity-icon" style="color: #ff9800;"><i class="fas fa-info-circle"></i></div>
                <div class="activity-details">
                    <div class="activity-title">No activities recorded yet</div>
                    <div class="activity-time">System monitoring active</div>
                </div>
            </li>
        `;
    } else {
        safeActivities.forEach((activity) => {
            const li = document.createElement('li');
            li.className = 'activity-item';
            
            // Determine icon based on activity type
            let icon = 'fa-check-circle';
            let iconColor = '#4caf50';
            
            if (activity.type === 'error') {
                icon = 'fa-exclamation-triangle';
                iconColor = '#f44336';
            } else if (activity.type === 'warning') {
                icon = 'fa-exclamation-circle';
                iconColor = '#ff9800';
            }
            
            li.innerHTML = `
                <div class="activity-icon" style="color: ${iconColor};"><i class="fas ${icon}"></i></div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title || 'System Activity'}</div>
                    <div class="activity-time">${activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString() : 'Unknown Time'}</div>
                </div>
            `;
            activityList.appendChild(li);
        });
    }

    if (summary) {
        const count = safeActivities.length;
        summary.innerHTML = count > 0 
            ? `<i class="fas fa-check-circle"></i> ${count} activities`
            : `<i class="fas fa-info-circle"></i> No activities`;
    }
}


function updateRealFooterStatus(stats) {
    console.log('👣 UPDATING REAL FOOTER STATUS');
    
    // Update status dots
    const statusDots = document.querySelectorAll('.status-dot');
    statusDots.forEach((dot) => {
        const isHealthy = stats.databaseStatus === 'Connected' && stats.apiServices === 'Active';
        if (isHealthy) {
            dot.className = 'status-dot status-online';
        } else {
            dot.className = 'status-dot status-warning';
        }
    });
    
    // Update status values
    const statusValues = document.querySelectorAll('.status-value');
    statusValues.forEach((element) => {
        const parentItem = element.closest('.status-item');
        const labelElement = parentItem?.querySelector('.status-label');
        const label = labelElement?.textContent?.trim();
        
        if (label && stats) {
            let value = 'N/A';
            
            if (label === 'Database:') value = stats.databaseStatus || 'N/A';
            else if (label === 'Payment Gateway:') value = stats.paymentGateway || 'N/A';
            else if (label === 'Backup System:') value = stats.backupSystem || 'N/A';
            else if (label === 'API Services:') value = stats.apiServices || 'N/A';
            else if (label === 'Security Systems:') value = stats.securitySystems || 'N/A';
            else if (label === 'Network Services:') value = stats.networkServices || 'N/A';
            else if (label === 'Email Services:') value = stats.emailServices || 'N/A';
            else if (label === 'SMS Gateway:') value = stats.smsGateway || 'N/A';
            else if (label === 'Active Sessions:') value = stats.activeSessions || '0';
            else if (label === 'Storage Used:') value = stats.storageUsed || 'N/A';
            else if (label === 'Uptime:') value = stats.systemUptime || 'N/A';
            else if (label === 'Server Load:') value = stats.serverLoad || 'N/A';
            else if (label === 'Memory Usage:') value = stats.memoryUsage || 'N/A';
            else if (label === 'Last Backup:') value = stats.lastBackup || 'N/A';
            
            element.textContent = value;
            element.style.color = (value === 'N/A' || value === 'Error' || value === 'Not Running') ? '#ff9800' : '#4caf50';
        }
    });
}

// ===============================================
// 🔧 STATUS INDICATORS AND ERROR HANDLING
// ===============================================

function updateCardStatusIndicators(status) {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
        const icon = card.querySelector('.card-icon');
        if (icon) {
            if (status === 'success') {
                icon.style.background = 'rgba(76, 175, 80, 0.1)';
                icon.style.color = '#4caf50';
            } else if (status === 'error') {
                icon.style.background = 'rgba(244, 67, 54, 0.1)';
                icon.style.color = '#f44336';
            } else if (status === 'loading') {
                 icon.style.background = 'rgba(33, 150, 243, 0.1)';
                 icon.style.color = '#2196f3';
            }
        }
    });
}

function updateSystemStatsStatusIndicators(status) {
    const items = document.querySelectorAll('.quick-stats-item');
    items.forEach(item => {
        if (status === 'success') {
            item.style.borderLeft = '3px solid #4caf50';
        } else if (status === 'error') {
            item.style.borderLeft = '3px solid #f44336';
        } else if (status === 'loading') {
            item.style.borderLeft = '3px solid #2196f3';
        }
    });
}

function updateActivityStatusIndicator(status) {
    const indicator = document.querySelector('.activity-footer .realtime-indicator');
    if (indicator) {
        if (status === 'success') {
            indicator.style.background = '#4caf50';
        } else if (status === 'error') {
            indicator.style.background = '#f44336';
        } else if (status === 'no-data') {
            indicator.style.background = '#ff9800';
        } else if (status === 'loading') {
            indicator.style.background = '#2196f3';
        }
    }
}

function updatePendingStatusIndicator(status) {
    const pendingCard = Array.from(document.querySelectorAll('.card')).find(card => 
        card.querySelector('h3')?.textContent.includes('Pending Requests')
    );
    
    if (pendingCard) {
        const icon = pendingCard.querySelector('.card-icon');
        if (icon) {
            if (status === 'success') {
                icon.style.background = 'rgba(76, 175, 80, 0.1)';
                icon.style.color = '#4caf50';
            } else if (status === 'error') {
                icon.style.background = 'rgba(244, 67, 54, 0.1)';
                icon.style.color = '#f44336';
            } else if (status === 'loading') {
                icon.style.background = 'rgba(33, 150, 243, 0.1)';
                icon.style.color = '#2196f3';
            }
        }
    }
}

function showAllErrors() {
    showCardErrors();
    showSystemStatsErrors();
}

function showCardErrors() {
    const cards = document.querySelectorAll('.card h2');
    cards.forEach(h2 => {
        // Only target elements that haven't been successfully updated
        if (h2.textContent.includes('...')) {
            h2.classList.remove('card-loading');
            h2.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            h2.style.color = '#f44336';
        }
    });
}

function showSystemStatsErrors() {
    const items = document.querySelectorAll('.quick-stats-value');
    items.forEach(element => {
        if (element.innerHTML.includes('fa-spin')) {
            element.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            element.style.color = '#f44336';
        }
    });
}

// ===============================================
// 🎛️ BUTTON CONTROLS AND EVENT HANDLERS
// ===============================================

function setupButtonListeners() {
    console.log('🔘 SETTING UP REAL BUTTON LISTENERS');
    
    const refreshActivitiesBtn = document.getElementById('refreshActivities');
    const refreshStatsBtn = document.getElementById('refreshStats');
    
    if (refreshActivitiesBtn) {
        refreshActivitiesBtn.addEventListener('click', () => {
            console.log('🔄 REFRESH ACTIVITIES CLICKED');
            refreshActivitiesBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Refreshing';
            loadRealActivities().finally(() => {
                setTimeout(() => {
                    refreshActivitiesBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                }, 1000);
            });
        });
    }
    
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', () => {
            console.log('🔄 REFRESH STATS CLICKED');
            refreshStatsBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Updating';
            loadDashboardData().finally(() => {
                setTimeout(() => {
                    refreshStatsBtn.innerHTML = '<i class="fas fa-chart-line"></i> Live';
                }, 1000);
            });
        });
    }
}

// ===============================================
// 🚀 INITIALIZATION
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 ========== REAL HOSTEL ADMIN DASHBOARD INITIALIZED ==========');
    console.log('🕒 Started at:', new Date().toLocaleTimeString());
    
    // Start security inactivity watcher
    setupInactivityWatcher();
    
    // Load real data immediately
    loadDashboardData();
    
    // Set up auto-refresh every 30 seconds
    setInterval(loadDashboardData, 30000);
    
    // Set up button listeners
    setupButtonListeners();
    
    console.log('✅ ========== REAL DASHBOARD READY ==========');
});

// Export for global access (Used by hostel-admin-ui.js CRITICAL FIX)
window.loadDashboardData = loadDashboardData;
window.loadRealStats = loadRealStats;
window.loadRealSystemStats = loadRealSystemStats;
window.loadRealActivities = loadRealActivities;
window.updatePendingCardVisuals = updatePendingCardVisuals; // Export new helper function

console.log('🌐 REAL Dashboard functions exported to window scope');