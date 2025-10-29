// Maintenance page functionality
class MaintenanceManager {
    constructor() {
        this.checkInterval = 30000; // Check every 30 seconds
        this.maintenanceStatus = null;
        this.init();
    }

    async init() {
        this.startCountdown();
        this.startStatusChecker();
        this.setupAutoRefresh();
    }

    // Calculate and display countdown
    startCountdown() {
        function updateCountdown() {
            const now = new Date();
            let target = new Date();
            
            // Set target to 00:30 of next day
            if (now.getHours() >= 23) {
                target.setDate(target.getDate() + 1);
            }
            target.setHours(0, 30, 0, 0);
            
            const diff = target - now;
            
            if (diff <= 0) {
                document.getElementById('countdownTimer').textContent = '00:00:00';
                document.getElementById('completionTime').textContent = 'Any moment now';
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
            
            // Update completion time display
            const completionTime = target.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
            document.getElementById('completionTime').textContent = completionTime + ' hours';
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // Check if maintenance is still active
    async startStatusChecker() {
        const checkStatus = async () => {
            try {
                const response = await fetch('/api/maintenance-status');
                const data = await response.json();
                
                this.maintenanceStatus = data;
                
                // If maintenance is over, redirect to homepage
                if (!data.maintenanceMode) {
                    this.redirectToHomepage();
                }
            } catch (error) {
                console.log('Could not check maintenance status:', error);
            }
        };

        await checkStatus();
        setInterval(checkStatus, this.checkInterval);
    }

    // Setup auto-refresh when maintenance ends
    setupAutoRefresh() {
        const refreshCheck = setInterval(() => {
            if (!this.maintenanceStatus || !this.maintenanceStatus.maintenanceMode) {
                this.redirectToHomepage();
                clearInterval(refreshCheck);
            }
        }, 10000); // Check every 10 seconds
    }

    // Redirect to homepage with success message
    redirectToHomepage() {
        // Add a small delay to show the "maintenance complete" state
        setTimeout(() => {
            window.location.href = '/?maintenanceComplete=true';
        }, 2000);
    }
}

// Client-side maintenance checker for other pages
class MaintenanceChecker {
    static async checkMaintenanceStatus() {
        try {
            const response = await fetch('/api/maintenance-status');
            const data = await response.json();
            
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

    static async checkTransactionBlock() {
        try {
            const response = await fetch('/api/maintenance-status');
            const data = await response.json();
            
            if (data.blockTransactions) {
                this.showTransactionAlert();
                return true;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    static showTransactionAlert() {
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            font-family: Arial, sans-serif;
        `;
        
        alertDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 1.2rem;"></i>
                <div>
                    <strong>Transaction Blocked</strong><br>
                    <small>System maintenance in progress. Please try after 00:30 hours.</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    static initPageProtection() {
        // Check maintenance status on page load
        this.checkMaintenanceStatus();
        
        // Check before form submissions
        document.addEventListener('submit', async (e) => {
            const isBlocked = await this.checkTransactionBlock();
            if (isBlocked) {
                e.preventDefault();
                e.stopPropagation();
                this.showTransactionAlert();
            }
        });
        
        // Check periodically
        setInterval(() => {
            this.checkMaintenanceStatus();
        }, 60000); // Check every minute
    }
}

// Initialize maintenance page
if (window.location.pathname.includes('/maintenance')) {
    new MaintenanceManager();
} else {
    // Initialize maintenance protection for other pages
    document.addEventListener('DOMContentLoaded', () => {
        MaintenanceChecker.initPageProtection();
    });
}