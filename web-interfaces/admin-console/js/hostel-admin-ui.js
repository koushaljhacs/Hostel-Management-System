/*
 * HMS-CENTRAL-COPY/web-interfaces/admin-console/js/hostel-admin-ui.js
 * * CRITICAL FIX: Prevents redundant double load of the main dashboard on startup
 * * CRITICAL FIX: Ensures 'Global System Dashboard' is ALWAYS handled by the dedicated loader, resolving the 404 error.
 */

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-links li');
    const contentArea = document.getElementById('mainBodyContent');
    
    // Store the path to the main dashboard file
    const MAIN_DASHBOARD_PATH = '/admin-console/hostel-admin-dashboard.html';

    // --- STATIC MODULE PATH MAPPING (CRITICAL: 'Global System Dashboard' MUST NOT be in this map) ---
    const MODULE_MAP = {
        // ... (all module mappings remain here, excluding Global System Dashboard) ...
        'API Performance Analytics': 'performance-analytics',
        'System Alerts (Critical)': 'system-alerts',
        'Data Synchronization Status': 'system-alerts', 
        'High Load Traffic Trends': 'trend-analysis',
        'Maintenance Mode Control': 'system-settings', 
        'Live Console Logs': 'console', 
        'Database Workspace (SQL)': 'db-workspace', 
        'Live Server Terminal': 'terminal', 
        
        // --- Security Engine ---
        'Firewall & Threat Detection (L0)': 'security-approval', 
        'Run Firewall Test': 'security-approval', 
        'GateGuard (L1) - IP Reputation': 'blacklist-management', 
        'BuildingWatchman (L2) - Behavior': 'user-activity-monitoring', 
        'BridgeGate (L3) - Data Validation': 'security-approval', 
        'Trust System Analytics': 'performance-analytics', 
        'Access Control (Global)': 'access-control',
        'Complete Access Logs': 'access-logs',
        'Global Block List (IPs/Users)': 'blacklist-management',
        'Attack Vector Monitor': 'incident-reports', 

        // --- Database Cluster ---
        'Primary DB (OLTP) Status': 'system-alerts', 
        'Read Replica (AI/Reporting) Status': 'system-alerts', 
        'Backup DB (DR) Status': 'system-alerts', 
        'Schema Management (Migrations)': 'system-settings', 
        'Transaction Log Viewer': 'user-activity-logs', 
        'Query Performance Analyzer': 'performance-analytics', 
        'Global Data Export (Full Dump)': 'data-export',
        'Data Retention & Cleanup': 'data-cleanup',
        'Manage Replication & Sync': 'system-settings', 

        // --- GLOBAL OPERATIONS (USER/EMPLOYEE/STUDENT) ---
        'View All User Accounts': 'all-user-accounts',
        'User Creation': 'user-creation',
        'Edit User Profile (Root)': 'edit-user-profiles',
        'Manage User Roles': 'designation-roles',
        'Set Role Permissions': 'permission-management',
        'View User Activity Logs': 'user-activity-logs',
        'View Admin Activity Logs': 'user-activity-monitoring',
        'Suspend/Unsuspend User': 'suspend-delete-users',
        'Delete User (Root)': 'suspend-delete-users',
        'Global Password Reset': 'password-reset-controls',
        'Manage Admin Privileges': 'admin-privileges',
        'Scan Active Sessions': 'user-session-management',
        'Terminate User Session': 'user-session-management',
        'Impersonate User (Root)': 'user-activity-monitoring',

        // --- Hostel ---
        'View All Hostels': 'hostel-configuration',
        'Create New Hostel': 'create-new-hostel',
        'Edit Hostel Details': 'hostel-configuration',
        'View Hostel Occupancy': 'occupancy-reports',
        'Manage Hostel Floors': 'add-floors',
        'Manage Hostel Rooms': 'room-setup',
        'Create/Edit Room Types': 'room-setup', 
        'Manage Hostel Amenities': 'amenities-setup',
        'Manage Hostel Services': 'service-configuration',
        'Manage Fee Structures': 'fee-structure',
        'View Student Admissions': 'student-admissions',
        'Approve/Reject Admission': 'student-admissions',
        'Manually Admit Student': 'add-new-employee',
        'Run Room Allocation': 'room-allocation',
        'Manually Allocate Room': 'room-allocation',
        'View Room Transfers': 'room-transfers',
        'Approve/Reject Transfers': 'room-transfers',
        'Manage Check-in/Check-out': 'check-in-check-out',
        'View Student Leave': 'leave-management',
        'Approve/Reject Leave': 'leave-management',
        'Suspend/Terminate Student': 'suspension-termination',
        'Manage ID Cards (Global)': 'id-card-management',
        'Print/Revoke ID Cards': 'id-card-management',
        'View Academic Records': 'academic-records',

        // --- Financial & Billing ---
        'Fee Structure': 'fee-structure',
        'Fee Collection': 'fee-collection',
        'Record Manual Payment': 'fee-collection',
        'Payment Records': 'payment-records',
        'Refund Processing': 'refund-processing',
        'Financial Reports': 'financial-reports',
        'Expense Management': 'expense-management',
        'Log New Expense': 'expense-management',
        'Invoice Generation': 'invoice-generation',
        'Payment Gateway Config': 'payment-gateway',
        'Discount Management': 'discount-management',
        'Financial Audits': 'financial-audits',
        
        // --- Mess & Dining ---
        'Create New Mess': 'create-new-mess',
        'Mess Configuration': 'mess-configuration',
        'Menu Planning': 'menu-planning', // Missing File - Will show 404
        'Set Daily Menu': 'menu-planning', // Missing File - Will show 404
        'Manage Mess Inventory': 'inventroy-setup-mess', // Using Filename Typo
        'Add Inventory Stock': 'inventroy-setup-mess', // Using Filename Typo
        'Meal Timing Setup': 'meal-timing-setup',
        'Mess Fee Setup': 'mess-fee-setup',
        'Manage Mess Staff': 'staff-allocation-mess',
        'Special Diets': 'special-diets',
        'Supplier Management': 'supplier-management', // Using provided Filename
        
        // --- Laundry Services ---
        'View Laundry Orders': 'laundary-management', // Using Filename Typo
        'View Billing & Payments': 'billing-payments',
        'Manage Pickup/Delivery': 'pickup-delivery',
        'Track Service Status': 'service-tracking',
        'Manage Laundry Inventory': 'inventory-management',
        'Manage Laundry Staff': 'staff-allocation',
        'View Service Analytics': 'service-analytics',
        'Configure Laundry Settings': 'service-settings',
        'Add Laundry Service': 'service-configuration',

        // --- Transport Services ---
        'View All Vehicles': 'vehicle-management',
        'Add New Vehicle': 'vehicle-management',
        'Manage Routes': 'route-planning',
        'Manage Drivers': 'driver-management',
        'Manage Fuel Logs': 'fuel-management',
        'Manage Schedules': 'schedule-management',
        'Manage Stops': 'stop-management',
        'Manage Transport Passes': 'pass-management',
        'Manage Transport Fees': 'transport-fees',
        'Vehicle Maintenance Logs': 'vehicle-management',

        // --- Visitor & Gate ---
        'Register New Visitor': 'visitor-registration',
        'Gate Pass System': 'gate-pass-system',
        'Visitor Logs': 'visitor-logs',
        'Security Approval': 'security-approval',
        'Visit Scheduling': 'visit-scheduling',
        'Blacklist Management': 'blacklist-management',
        'Visitor Analytics': 'visitor-analytics',
        'Configure Visitor Policies': 'visitor-policies',
        'Security Personnel': 'security-personnel',
        'CCTV Management': 'cctv-management',
        'Biometric Systems': 'biometric-systems',

        // --- Health & Safety ---
        'Medical Facilities': 'medical-facilities',
        'Safety Compliance': 'safety-compliance',
        'Health Records': 'health-records',
        'Add Medical Record': 'medical-records',
        'Medical Staff': 'medical-staff',
        'Medical Supplies': 'medical-supplies',
        'Emergency Protocols': 'emergency-protocols', // Generic
        'Incident Reports': 'incident-reports',
        'File Incident Report': 'incident-reports',
        'Pandemic Management': 'pandemic-management',

        // --- Audit & Compliance ---
        'Internal Audits': 'internal-audits',
        'Compliance Reports': 'compilance-reports', // Using Filename Typo
        'Regulatory Compliance': 'regulatory-compliance',
        'Complete Audit Trail': 'complete-audit-trail',
        'User Activity Monitoring': 'user-activity-monitoring',
        'Financial Audits': 'financial-audits',

        // --- Emergency Management ---
        'Emergency Protocols': 'emergency-protocols-emergency',
        'Crisis Management': 'crisis-management',
        'Mass Alert System': 'mass-alert-system',
        'Emergency Contacts': 'emergency-contacts',
        'Evacuation Plans': 'evacuation-plans',
        'Emergency Drills': 'emergency-drills',

        // --- Data Management ---
        'Data Backup': 'data-backup', // Missing File - Will show 404
        'Data Export': 'data-export',
        'Data Import': 'data-import',
        'Data Cleanup': 'data-cleanup',
        'Report Archives': 'report-archieves', // Using Filename Typo

        // --- Reports & Analytics ---
        'Occupancy Reports': 'occupancy-reports',
        'Revenue Analytics': 'revenue-analytics',
        'Performance Metrics': 'performance-metrics',
        'Report Generation': 'report-generation',
        'Trend Analysis': 'trend-analysis',

        // --- Communication ---
        'Announcements': 'Announcements', // Using Case Mismatch Filename
        'Email System': 'email-system',
        'SMS Gateway': 'sms-gateway',
        'Notification System': 'notification-system',
        'Chat System': 'chat-system',
        'Event Management': 'event-management',
    };
    
    // --- PATH RESOLUTION FUNCTION ---
    function getModulePath(linkText) {
        const cleanText = linkText.trim();
        const fileNameBase = MODULE_MAP[cleanText];

        if (fileNameBase) {
            if (fileNameBase === 'Announcements') {
                 return `modules/${fileNameBase}.html`; 
            }
            return `modules/${fileNameBase.toLowerCase()}.html`;
        }
        
        const fallbackName = cleanText.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
        return `modules/${fallbackName}.html`;
    }
    
    // --- SCRIPT RE-EXECUTION CORE LOGIC ---
    function reExecuteScripts(targetElement, moduleBaseUrl) {
        targetElement.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            let src = oldScript.getAttribute('src');

            if (src) {
                if (!src.startsWith('http') && !src.startsWith('/')) {
                    src = '/admin-console/' + src;
                }
                newScript.setAttribute('src', src);
            } else {
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            }

            Array.from(oldScript.attributes).forEach(attr => {
                if (attr.name !== 'src' || !src) {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });

            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    // --- UPDATE BROWSER URL WITHOUT RELOAD ---
    function updateBrowserURL(linkText) {
        const moduleParam = linkText.toLowerCase().replace(/\s+/g, '+');
        const newURL = `${window.location.origin}${window.location.pathname}?module=${moduleParam}`;
        window.history.pushState({ module: linkText }, '', newURL);
    }

    // --- SET ACTIVE NAV ITEM ---
    function setActiveNavItem(linkText) {
        navLinks.forEach(link => {
            const linkSpan = link.querySelector('span');
            if (linkSpan && linkSpan.textContent.trim() === linkText) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
    }

    // --- LOAD MAIN DASHBOARD (CRITICAL FIX APPLIED HERE) ---
    async function loadMainDashboard() {
        const linkText = 'Global System Dashboard';
        
        try {
            // Show loading state
            contentArea.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-sync fa-spin"></i> Loading ${linkText}...</h2>
                </div>
                <div style="text-align: center; padding: 60px; height: 100%;">
                    <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--primary-color);"></i>
                    <p style="margin-top: 15px; color: var(--text-muted);">Loading main dashboard from: ${MAIN_DASHBOARD_PATH}</p>
                </div>
            `;
            
            const response = await fetch(MAIN_DASHBOARD_PATH);
            if (!response.ok) {
                 throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const fullHtml = await response.text();
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = fullHtml;
            
            // CRITICAL FIX: Target the inner content (#mainBodyContent) of the fetched dashboard HTML
            // This prevents the duplication of the entire outer HTML structure (sidebar, header, footer).
            const extractedContent = tempDiv.querySelector('#mainBodyContent')?.innerHTML;

            const finalContent = extractedContent || fullHtml;

            contentArea.innerHTML = finalContent; 
            updateBrowserURL(linkText);
            
            reExecuteScripts(contentArea, '/admin-console/');
            
            if (window.loadDashboardData) {
                window.loadDashboardData();
            }

            console.log('Main Dashboard content re-rendered and scripts re-executed successfully.');

        } catch (error) {
            console.error('Failed to load main dashboard (Double dashboard prevention):', error);
            contentArea.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> Dashboard Display Error</h2>
                </div>
                <div style="background: #ffdddd; border: 1px solid #f44336; border-radius: 8px; padding: 30px; margin: 20px 0;">
                    <h4 style="color: var(--error-color); margin-bottom: 15px;">
                        CRITICAL: Failed to Isolate Dashboard Content.
                    </h4>
                    <p>The system is trying to prevent a double dashboard by reloading the HTML, but it couldn't find the inner content to safely inject.</p>
                    <p style="font-size: 13px; color: var(--error-color);"><strong>Details:</strong> ${error.message}</p>
                </div>
            `;
        }
    }

    // --- LOAD MODULE CONTENT ---
    async function loadModuleContent(linkText) {
        // CRITICAL FIX: Always reroute the dashboard click to the dedicated loader
        if (linkText === 'Global System Dashboard' || linkText === 'Main Dashboard') {
            return loadMainDashboard();
        }
        
        const moduleRelativePath = getModulePath(linkText);
        // Path is constructed as /admin-console/modules/filename.html
        const modulePath = `/admin-console/${moduleRelativePath}`; 
        const moduleBaseUrl = '/admin-console/'; 

        try {
            // Show loading state
            contentArea.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-sync fa-spin"></i> Loading ${linkText}...</h2>
                </div>
                <div style="text-align: center; padding: 60px; height: 100%;">
                    <i class="fas fa-spinner fa-spin fa-2x" style="color: var(--primary-color);"></i>
                    <p style="margin-top: 15px; color: var(--text-muted);">Loading ${linkText} module from: ${modulePath}</p>
                </div>
            `;

            const response = await fetch(modulePath);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`File Not Found: ${modulePath}`);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            contentArea.innerHTML = content;
            updateBrowserURL(linkText);
            
            reExecuteScripts(contentArea, moduleBaseUrl);
            
            console.log('Module loaded successfully:', linkText);
            
        } catch (error) {
            console.error('Failed to load module:', error);
            const isMissing = error.message.includes('File Not Found');
            const isUnauthorized = error.message.includes('HTTP 401');

            let errorTitle = isMissing ? 'Module File Missing (404)' : 'Module Integration Error';
            let errorDetails = error.message;

            if (isUnauthorized) {
                errorTitle = 'Authentication Required (401)';
                errorDetails = 'Access to this module requires a valid Administrator JWT token. Please ensure you are logged in.';
            }

            contentArea.innerHTML = `
                <div class="dashboard-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> ${linkText}</h2>
                </div>
                <div style="background: ${isMissing ? '#ffdddd' : '#fff3cd'}; border: 1px solid ${isMissing ? '#f44336' : '#ffeaa7'}; border-radius: 8px; padding: 30px; margin: 20px 0;">
                    <h4 style="color: ${isMissing ? 'var(--error-color)' : '#856404'}; margin-bottom: 15px;">
                        ${errorTitle}
                    </h4>
                    <p style="color: ${isMissing ? 'var(--error-color)' : '#856404'}; margin-bottom: 15px;">
                        The **${linkText}** module could not be loaded.
                    </p>
                    <p style="font-size: 13px; color: ${isMissing ? 'var(--error-color)' : '#856404'};"><strong>Expected File:</strong> <code>${modulePath}</code></p>
                    <p style="font-size: 13px; color: ${isMissing ? 'var(--error-color)' : '#856404'};"><strong>Details:</strong> ${errorDetails}</p>
                </div>
            `;
        }
    }

    // --- HANDLE BROWSER BACK/FORWARD ---
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.module) {
            const moduleName = event.state.module;
            setActiveNavItem(moduleName);
            
            if (moduleName === 'Global System Dashboard' || moduleName === 'Main Dashboard') {
                loadMainDashboard(); 
            } else {
                loadModuleContent(moduleName);
            }
        } else {
            loadMainDashboard();
        }
    });

    // --- CHECK URL ON PAGE LOAD ---
    function checkInitialURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const moduleParam = urlParams.get('module');
        
        if (moduleParam) {
            const moduleName = moduleParam.replace(/\+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            setActiveNavItem(moduleName);
            
            if (moduleName === 'Global System Dashboard') {
                // Initial load: Content is already present, just ensure active state and data loading is triggered.
                // We rely on the initial script execution for data fetching.
                console.log('Initial URL Check: Dashboard loaded via URL. Skipping fetch and relying on initial script execution.');
            } else {
                loadModuleContent(moduleName);
            }
        } else {
            setActiveNavItem('Global System Dashboard');
            console.log('Initial URL Check: No module requested. Dashboard content is in DOM.');
        }
    }
    
    // --- GLOBAL TAB SWITCHING HELPER ---
    function switchTab(targetPanelId) {
        const targetId = targetPanelId.startsWith('#') ? targetPanelId.substring(1) : targetPanelId;
        const targetPanel = document.getElementById(targetId);

        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.dataset.tabTarget === `#${targetId}`);
        });

        document.querySelectorAll('.tab-panel[data-tab-content]').forEach(panel => {
            panel.classList.toggle('active', panel.id === targetId);
        });
        
        document.querySelectorAll('.sidebar .nav-links li').forEach(link => {
            link.classList.remove('active');
        });
        
        if (targetPanel && targetId === 'terminal-panel') {
            const terminalInput = document.getElementById('terminalInput');
            if(terminalInput) terminalInput.focus();
        }
    }

    // --- NAVIGATION HANDLERS ---
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const linkText = this.querySelector('span').textContent.trim();
            
            navLinks.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            const targetTab = this.dataset.tabTarget;
            
            if (targetTab) {
                switchTab(targetTab);
                updateBrowserURL(linkText);
            } else if (linkText === 'Global System Dashboard' || linkText === 'Main Dashboard') {
                // When clicking the sidebar link, reload the content to refresh data
                loadMainDashboard(); 
            } else {
                loadModuleContent(linkText);
            }
        });
    });

    // --- MAIN TAB SWITCHING IN HEADER ---
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const linkText = button.textContent.trim();
            switchTab(button.dataset.tabTarget);
            updateBrowserURL(linkText);
        });
    });

    // Initialize
    checkInitialURL();
});