/* admin-console/js/module-loader.js */

const ADMIN_API_BASE = '/api/admin'; 

// --- MOCK DATA MAP (Simplified) ---
// This map simulates the successful JSON data return from your backend API for the cards.
const MOCK_DATA_MAP = {
    // --- Dashboard & Core Management ---
    'room-allocation.html': { pendingallocations: 15, availablerooms: 85, occupancyrate: '88%', transferrequests: 6 },
    'fee-collection.html': { totalcollected: '₹ 1.2M', pendingpayments: 52, collectionrate: '92%', thismonth: '₹ 250K' },
    'occupancy-reports.html': { totalcapacity: 1000, currentoccupancy: 880, occupancyrate: '88%', availablerooms: 85 },
    'hostel-configuration.html': { totalhostels: 4, totalrooms: 400, totalcapacity: 800, activeconfig: 'BH-A' },
    'fee-structure.html': { feeitems: 12, hosteltypes: 4, academicyears: 3, activestructures: 4 },
    'payment-records.html': { totalpayments: 500, successful: 480, failed: 20, pending: 5 },
    'refund-processing.html': { pendingrefunds: 8, approved: 15, rejected: 3, totalrefunded: '₹ 45K' },
    'invoice-generation.html': { totalinvoices: 320, paidinvoices: 280, pendinginvoices: 40, overdue: 12 },
    'expense-management.html': { totalexpenses: '₹ 1.5M', pendingapproval: 5, thismonth: '₹ 250K', overbudget: 1 },
    'discount-management.html': { activediscounts: 4, totaldiscounts: '₹ 70K', beneficiaries: 150, expirings: 2 },
    
    // --- Employee & HR ---
    'all-employees.html': { totalemployees: 45, activetoday: 42, onleave: 3, byhostel: 4 },
    'add-new-employee.html': { totalemployees: 45, totalprofiles: 45, activetoday: 42, byhostel: 4 },
    'designation-roles.html': { totaldesignations: 8, activeroles: 7, customroles: 2 },
    'attendance.html': { presenttoday: 40, absenttoday: 5, latetoday: 2, thismonthavg: '95%' },
    'shift-management.html': { activeshifts: 4, staffpershift: 10, shiftchanges: 3, weeklyroster: 'Ready' },
    'salary-management.html': { totalsalary: '₹ 2.5M', employees: 45, pending: 0, processed: 45 },
    'payroll-processing.html': { currentmonth: 'Apr 2024', employees: 45, totalpayroll: '₹ 2.5M', processed: '35' },
    'performance.html': { avgrating: '4.2', topperformers: 3, needsimprovement: 5, reviewsthismonth: 4 },
    'incentives.html': { totalgiven: 150, thismonth: 12, employees: 45, pending: 2 },
    'suspension-termination.html': { suspendedstudents: 3, terminatedstudents: 1, pendingactions: 4, recentactions: 8 },

    // --- Transport & Laundry ---
    'vehicle-management.html': { totalvehicles: 8, activevehicles: 6, undermaintenance: 2, totalcapacity: 250 },
    'driver-management.html': { totaldrivers: 12, activedrivers: 10, onduty: 8, licenseexpiring: 1 },
    'fuel-management.html': { thismonth: '450 L', fuelcost: '₹ 45K', averagemileage: '8.5 KMPL', lowfuel: 1 },
    'route-planning.html': { totalroutes: 6, stops: 45, studentscovered: 450, averagetime: '45 min' },
    'pass-management.html': { activepasses: 350, expirings: 15, expired: 5, revenue: '₹ 15K' },
    'laundary-management.html': { activeorders: 30, completedtoday: 15, pendingdelivery: 5, dailyrevenue: '₹ 2.5K' },
    'inventory-management.html': { totalitems: 120, lowstock: 10, toreorder: 5, inventoryvalue: '₹ 100K' },
    'billing-payments.html': { pendingbills: 25, paidbills: 450, totalrevenue: '₹ 25K', overdue: 5 },
    
    // --- Security & Health ---
    'visitor-registration.html': { visitorstoday: 45, pendingapproval: 5, approvedtoday: 40, securityalerts: 1 },
    'gate-pass-system.html': { activepasses: 50, expirings: 5, verifiedtoday: 45, securityissues: 1 },
    'cctv-management.html': { totalcameras: 25, online: 23, offline: 2, storageused: '80%' },
    'incident-reports.html': { totalincidents: 12, thismonth: 3, resolved: 9, pending: 3 },
    'health-records.html': { totalrecords: 1500, activecases: 2, contagious: 1, todaysvisits: 5 },
    'medical-facilities.html': { totalfacilities: 3, medicalstaff: 15, availablebeds: 5, todayscases: 3 },
    'medical-supplies.html': { totalitems: 250, lowstock: 15, expirings: 5, lastupdated: '1 hour ago' },
    'emergency-protocols.html': { activeprotocols: 5, lastupdated: '1 week ago', trainedstaff: '95%', nextdrill: '1 month' },

    // --- Communication & Reporting ---
    'Announcements.html': { totalannouncements: 50, active: 10, totalreach: 1500, scheduled: 5 },
    'sms-gateway.html': { smssenttoday: 150, deliverysuccess: '98%', smscredits: 5000, failedsms: 3 },
    'revenue-analytics.html': { totalrevenue: '₹ 15M', thismonth: '₹ 1.2M', growthrate: '5%', avgcollection: '₹ 10K' },
    'trend-analysis.html': { activetrends: 5, positivetrends: 3, negativetrends: 2, alertsgenerated: 1 },
    'data-export.html': { totalexports: 150, successful: 145, failed: 5, storageused: '15 GB' },
};

// --- CORE LOADER FUNCTION ---
function loadModuleContent() {
    // Determine the current module filename (e.g., 'room-allocation.html')
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);
    
    const mockData = MOCK_DATA_MAP[filename] || {}; // Get data or empty object
    const container = document.querySelector('.body-content');

    // 1. Helper to replace ALL spinners with mock data
    const updateSpinners = (container, data) => {
        container.querySelectorAll('.card-loading').forEach(h2 => {
            const h3 = h2.closest('.card').querySelector('h3');
            if (h3) {
                // Normalize card title to match mock data keys
                const key = h3.textContent.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                
                // Find matching key, allowing for variations like 'totalhostels' in mock vs 'totalhostels' in data
                const foundKey = Object.keys(data).find(k => k === key);

                if (foundKey && data[foundKey] !== undefined) {
                    h2.textContent = data[foundKey];
                    h2.classList.remove('card-loading');
                } else {
                    // Fallback to generic status if key not found (e.g., 'Loading...' or 'N/A')
                    h2.textContent = 'N/A';
                    h2.classList.remove('card-loading');
                }
            }
        });
        
        // 2. Clear out sample lists and logs
        container.querySelectorAll('.activity-list').forEach(ul => {
            ul.innerHTML = `
                <li class="activity-item">
                    <div class="activity-icon" style="background: var(--success-color); color: white;"><i class="fas fa-check"></i></div>
                    <div class="activity-details">
                        <div class="activity-title">Data stream linked successfully.</div>
                        <div class="activity-time">Backend API ready (Mocked)</div>
                    </div>
                </li>`;
        });
        
        // 3. Update Quick Stats Grids
        container.querySelectorAll('.quick-stats-item .quick-stats-value').forEach(span => {
             if (span.querySelector('.fa-spin')) {
                span.innerHTML = '100'; // Default mock value
             }
        });
    };

    // --- MOCK API CALL SIMULATION ---
    // Simulate API delay, then execute UI update function
    setTimeout(() => {
        if (container) {
            updateSpinners(container, MOCK_DATA_MAP[filename] || MOCK_DATA_MAP['room-allocation.html']);
        }
    }, 500); 

    // --- SPECIAL MODULE LOGIC HOOKS ---
    // This section is critical for modules that have complex forms or local JS logic (like create-new-users).
    // We rely on the scripts placed inline in the HTML (or linked externally) to define functions
    // which then execute on their own DOMContentLoaded event. The re-execution logic in hostel-admin-ui.js
    // is what makes these inline scripts run after loading.
}

// Attach to DOMContentLoaded to ensure elements are present when the module is loaded into the SPA container
document.addEventListener('DOMContentLoaded', loadModuleContent);