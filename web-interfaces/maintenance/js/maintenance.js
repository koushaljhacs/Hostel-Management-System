/**
 * HMS-CENTRAL-COPY/web-interfaces/maintenance/js/maintenance.js
 * * Client-Side Logic for Maintenance Page and Transaction Blocking.
 * * This script is responsible for: 
 * * 1. Displaying the countdown on the maintenance page.
 * * 2. Polling the server to detect the end of the maintenance window.
 * * 3. Enforcing client-side security deterrents (Dev Tools, Copy/Paste).
 * * 4. Checking the transaction block status for other pages.
 */

// Maintenance page functionality with enhanced security and performance
class MaintenanceManager {
    constructor() {
        this.checkInterval = 30000; // Check every 30 seconds
        this.maintenanceStatus = null;
        this.apiEndpoint = '/api/maintenance/status';
        this.serverTime = null; // To store the server time
        this.init();
    }

    async init() {
        // Fetch initial data to populate fields
        await this.fetchStatusAndUpdateFields();
        
        // Start countdown based on fetched data
        this.startCountdown();
        
        // Start polling to check if maintenance is over
        this.startStatusChecker();
        
        // Secure the page
        this.enableSecurityProtection();
    }

    // Fetch status and update static fields
    async fetchStatusAndUpdateFields() {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            this.maintenanceStatus = data;

            // Populate static fields
            // NOTE: The maintenance status logic in the backend (MaintenanceMiddleware.js)
            // uses data.maintenanceWindow for the schedule information.
            const schedule = `${data.maintenanceWindow.startTime} - ${data.maintenanceWindow.endTime}`;
            
            document.getElementById('scheduleInfo').textContent = schedule || '22:00 - 08:00 IST';
            document.getElementById('contactInfoEmail').textContent = 'koushal2023@gmail.com'; 
            document.getElementById('contactInfoPhone').textContent = '+91 8298163299'; 

            // *** NEW FIX: Start the server clock ***
            if (data.serverTime) {
                this.startServerClock(data.serverTime);
            }
            
            // Check if maintenance is already over (race condition fix)
            if (!data.maintenanceMode) {
                this.redirectToHomepage();
            }


        } catch (error) {
            console.error('Failed to fetch initial maintenance status:', error);
            // Use defaults if fetch fails
            document.getElementById('scheduleInfo').textContent = '22:00 - 08:00 IST';
            document.getElementById('contactInfoEmail').textContent = 'koushal2023@gmail.com';
            document.getElementById('contactInfoPhone').textContent = '+91 8298163299';
        }
    }

    // To update the server time clock
    startServerClock(serverTimeString) {
        // Parse the server time string.
        try {
             // Attempt to parse the time provided by the server API
             this.serverTime = new Date(serverTimeString); 
             if (isNaN(this.serverTime.getTime())) {
                 this.serverTime = new Date(); // Fallback to local time if parsing fails
             }
        } catch (e) {
            console.error("Could not parse server time: ", serverTimeString);
            this.serverTime = new Date();
        }

        const serverTimeEl = document.getElementById('serverTime');
        
        const updateClock = () => {
            if (this.serverTime) {
                // Increment the server time by 1 second
                this.serverTime.setSeconds(this.serverTime.getSeconds() + 1);

                // Format the time as HH:MM:SS
                const hours = this.serverTime.getHours().toString().padStart(2, '0');
                const minutes = this.serverTime.getMinutes().toString().padStart(2, '0');
                const seconds = this.serverTime.getSeconds().toString().padStart(2, '0');
                
                serverTimeEl.textContent = `${hours}:${minutes}:${seconds} IST`;
            }
        };

        updateClock(); // Run once immediately
        setInterval(updateClock, 1000); // Update every second
    }


    // Calculate and display countdown
    startCountdown() {
        const updateCountdown = () => {
            const now = new Date();
            let target = new Date();

            // Determine target time: the end time of the maintenance window
            let targetTime = this.maintenanceStatus?.maintenanceWindow.endTime || '08:00';
            
            const [targetHour, targetMinute] = targetTime.split(':').map(Number);

            target.setHours(targetHour, targetMinute, 0, 0);

            // Logic to handle overnight target (e.g., end time 08:00)
            const [startHour] = (this.maintenanceStatus?.maintenanceWindow.startTime || '22:00').split(':').map(Number);
            
            // If the target time is earlier than the start time, and we are currently
            // after the start time (i.e., we are between 22:00 and 23:59), the target is tomorrow.
            if (targetHour < startHour && now.getHours() >= startHour) {
                target.setDate(target.getDate() + 1);
            }
            
            // If we are past the target time, set the target for tomorrow's window end.
            if (now.getTime() > target.getTime()) {
                 target.setDate(target.getDate() + 1);
            }
            
            const diff = target - now;
            
            if (diff <= 0) {
                document.getElementById('countdownTimer').textContent = '00:00:00';
                document.getElementById('completionTime').textContent = 'Resuming service now...';
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const timerString = 
                hours.toString().padStart(2, '0') + ':' +
                minutes.toString().padStart(2, '0') + ':' +
                seconds.toString().padStart(2, '0');
            
            document.getElementById('countdownTimer').textContent = timerString;
            document.getElementById('completionTime').textContent = `Estimated completion by: ${targetTime} hours IST`;
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // Check if maintenance is still active
    async startStatusChecker() {
        const checkStatus = async () => {
            try {
                const response = await fetch(this.apiEndpoint, {
                    method: 'GET',
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
                });
                
                if (!response.ok) throw new Error('Network response was not ok');
                
                const data = await response.json();
                this.maintenanceStatus = data; // Update status
                
                // If maintenance is over, redirect to homepage
                if (!data.maintenanceMode) {
                    this.redirectToHomepage();
                }
            } catch (error) {
                console.log('Could not check maintenance status (still in maintenance or network error):', error);
            }
        };

        setInterval(checkStatus, this.checkInterval);
    }

    // Redirect to homepage with success message
    redirectToHomepage() {
        const okButton = document.querySelector('.ok-button');
        if (okButton) {
            okButton.innerHTML = '<i class="fas fa-check-circle"></i> Maintenance Complete!';
            okButton.style.background = '#4caf50'; // Success green
            okButton.style.color = 'white';
            okButton.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.5)';
        }
        
        setTimeout(() => {
            // Redirect to the homepage with a flag to show the success message
            window.location.href = '/?maintenanceComplete=true';
        }, 2000);
    }

    // Enhanced Security Functions (Dev Tool, Copy/Paste Blocking)
    enableSecurityProtection() {
        // Blocks right-click context menu
        document.addEventListener('contextmenu', this.blockCopyActions);
        document.addEventListener('selectstart', this.blockCopyActions);
        document.addEventListener('copy', this.blockCopyActions);
        document.addEventListener('cut', this.blockCopyActions);
        document.addEventListener('paste', this.blockCopyActions);
        document.addEventListener('dragstart', this.blockCopyActions);
        document.addEventListener('drop', this.blockCopyActions);
        document.addEventListener('keydown', this.handleKeyDown);
        this.blockDevTools();
    }

    blockCopyActions(e) {
        e.preventDefault();
        return false;
    }

    handleKeyDown(e) {
        // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, PrintScreen
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'u') ||
            e.key === 'PrintScreen') {
            e.preventDefault();
            return false;
        }
        
        // Block Ctrl+A, Ctrl+C, Ctrl+X, Ctrl+V
        if ((e.ctrlKey || e.metaKey) && 
            (e.key === 'a' || e.key === 'c' || e.key === 'x' || e.key === 'v')) {
            e.preventDefault();
            return false;
        }
    }

    blockDevTools() {
        // Simple deterrent based on window size difference
        const checkDevTools = () => {
            const widthThreshold = window.outerWidth - window.innerWidth > 100;
            const heightThreshold = window.outerHeight - window.innerHeight > 100;
            if (widthThreshold || heightThreshold) {
                // Silently block
            }
        };
        setInterval(checkDevTools, 1000);
    }
}

// Client-side maintenance checker for other pages (used by app.js/auth.js)
class MaintenanceChecker {
    static async checkMaintenanceStatus() {
        try {
            const response = await fetch('/api/maintenance/status', {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            
            // If maintenance is active, redirect (and we are not already on the maintenance page)
            if (data.maintenanceMode && !window.location.pathname.includes('/maintenance')) {
                window.location.href = '/maintenance';
                return true;
            }
            return false;
        } catch (error) {
            console.log('Maintenance check failed:', error);
            return false;
        }
    }

    // Checks if POST/PUT/DELETE requests should be blocked (Grace Period or Active Maintenance)
    static async checkTransactionBlock() {
        try {
            const response = await fetch('/api/maintenance/status', {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            
            if (data.blockTransactions) {
                this.showTransactionAlert(data.estimatedCompletion || '08:00');
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    // Displays a user-friendly alert when transactions are blocked
    static showTransactionAlert(completionTime) {
        const existingAlert = document.querySelector('.transaction-alert-overlay');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alertDiv = document.createElement('div');
        // NOTE: In production, the style would be defined in CSS, but this ensures visibility:
        alertDiv.className = 'transaction-alert-overlay'; 
        alertDiv.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0, 0, 0, 0.7); z-index: 10000; 
            display: flex; justify-content: center; align-items: center;
        `; 
        
        const alertContent = document.createElement('div');
        alertContent.style.cssText = `
            background: #fff; padding: 30px; border-radius: 10px; max-width: 400px;
            text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        `; 
        
        alertContent.innerHTML = `
            <div style="color: #dc3545; font-size: 3rem; margin-bottom: 15px;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 style="color: #dc3545; margin-bottom: 15px;">Transaction Blocked</h3>
            <p style="color: #666; margin-bottom: 20px; line-height: 1.5;">
                System maintenance in progress. Please try after ${completionTime} hours.
            </p>
            <button onclick="this.closest('.transaction-alert-overlay').remove()" 
                    class="ok-button"
                    style="background: #720026; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                OK
            </button>
        `;
        
        alertDiv.appendChild(alertContent);
        document.body.appendChild(alertDiv);
    }

    static initPageProtection() {
        this.checkMaintenanceStatus();
        
        // Polling to catch maintenance mode activation
        setInterval(() => {
            this.checkMaintenanceStatus();
        }, 60000); 
    }
}

// Function triggered by the button on the maintenance page.
function handleOkClick() {
    window.location.href = '/student-login';
}

// Initialization Logic: Check if we are on the maintenance page or a live page.
if (window.location.pathname.includes('/maintenance')) {
    document.addEventListener('DOMContentLoaded', function() {
        new MaintenanceManager();
        
        const okButton = document.querySelector('.ok-button');
        if (okButton) {
            okButton.addEventListener('click', handleOkClick);
        }
    });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        MaintenanceChecker.initPageProtection();
    });
}

// Export for use in other modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MaintenanceManager, MaintenanceChecker };
}