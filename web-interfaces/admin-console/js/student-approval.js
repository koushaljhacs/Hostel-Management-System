/**
 * HMS-CENTRAL-COPY/web-interfaces/admin-console/js/student-approval.js
 * * Student Approval System for Hostel Admin - PRODUCTION READY
 * * Handles individual and bulk student approvals with AWS-style interface
 * * COMPLETE REAL DATA VERSION - No Dummy Data
 * * PRODUCTION FIX: Added proper CSRF token handling and authentication
 * * CRITICAL FIX: Corrected JWT retrieval method to use localStorage directly.
 */

const STUDENT_API_BASE = '/api/admin/students';

class StudentApprovalSystem {
    constructor() {
        this.selectedStudents = new Set();
        this.currentPage = 1;
        this.pageSize = 50;
        this.currentFilters = {};
        this.currentStudentId = null;
        this.generatedPassword = null;
        this.csrfToken = this.getCSRFToken();
        this.init();
    }

    init() {
        this.checkAuthStatus(); // Debug auth status
        this.setupEventListeners();
        this.loadPendingCount();
        this.loadPendingStudents();
        this.loadFilters();
    }

    // PRODUCTION FIX: Get CSRF token from meta tag
    getCSRFToken() {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    }

    // 💥 CRITICAL FIX APPLIED HERE 💥
    async fetchWithAuth(url, options = {}) {
        // FIX: Retrieve token directly from localStorage, aligning with admin-dashboard.js
        const token = localStorage.getItem('adminJwtToken');
        
        if (!token) {
            // Throwing this error triggers the console log you saw, 
            // and should ideally be followed by a redirect to login.
            throw new Error('No authentication token available');
        }
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            // Adding CSRF token to headers if present, though JWT is primary auth
            ...(this.csrfToken && { 'X-CSRF-Token': this.csrfToken }), 
            ...options.headers
        };
        
        const response = await fetch(url, {
            ...options,
            headers: headers
        });
        
        if (response.status === 401) {
            // Token expired or invalid
            console.error('API 401: Token expired or invalid in student-approval.js');
            this.redirectToLogin();
            return;
        }
        
        return response;
    }

    // PRODUCTION FIX: Handle authentication errors gracefully
    handleAuthError(message = 'Authentication failed') {
        console.log('🔄 Handling auth error:', message);
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--error-color);
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            z-index: 10002;
            box-shadow: var(--shadow-medium);
            max-width: 400px;
            word-wrap: break-word;
            cursor: pointer;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>Authentication Required</strong><br>
                    <small>${message}</small>
                </div>
            </div>
        `;
        
        notification.addEventListener('click', () => {
            document.body.removeChild(notification);
            this.redirectToLogin();
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
            this.redirectToLogin();
        }, 3000);
    }

    // PRODUCTION FIX: Handle CSRF token errors
    handleCSRFError() {
        console.log('🔄 Handling CSRF error');
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--warning-color);
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            z-index: 10002;
            box-shadow: var(--shadow-medium);
            max-width: 400px;
            word-wrap: break-word;
            cursor: pointer;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-sync-alt"></i>
                <div>
                    <strong>Session Refresh Needed</strong><br>
                    <small>Click to refresh your session</small>
                </div>
            </div>
        `;
        
        notification.addEventListener('click', () => {
            document.body.removeChild(notification);
            window.location.reload();
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
            window.location.reload();
        }, 5000);
    }

    // PRODUCTION FIX: Redirect to login page
    redirectToLogin() {
        console.log('🔐 Redirecting to login page');
        
        localStorage.removeItem('adminJwtToken');
        sessionStorage.clear();
        
        window.location.href = '/student-login';
    }

    // PRODUCTION FIX: Debug method to check authentication status
    checkAuthStatus() {
        const token = localStorage.getItem('adminJwtToken');
        const csrfToken = this.getCSRFToken();
        
        console.log('🔐 Auth Status Check:');
        console.log('  - JWT Token:', token ? 'Present' : 'Missing');
        console.log('  - CSRF Token:', csrfToken ? 'Present' : 'Missing');
        console.log('  - Token Length:', token ? token.length : 0);
        
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiry = payload.exp ? new Date(payload.exp * 1000) : null;
                console.log('  - Token Expiry:', expiry);
                console.log('  - Time until expiry:', expiry ? (expiry - new Date()) / 1000 + ' seconds' : 'Unknown');
            } catch (e) {
                console.error('  - Token parsing failed:', e);
            }
        }
        
        return {
            hasJWT: !!token,
            hasCSRF: !!csrfToken,
            tokenLength: token ? token.length : 0
        };
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-item[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.getAttribute('data-tab'));
            });
        });

        // Bulk actions
        document.getElementById('selectAll')?.addEventListener('click', () => this.toggleSelectAll());
        document.getElementById('bulkApprove')?.addEventListener('click', () => this.showBulkPasswordModal());
        document.getElementById('bulkReject')?.addEventListener('click', () => this.bulkReject());

        // Filters
        document.getElementById('hostelFilter')?.addEventListener('change', (e) => this.applyFilters());
        document.getElementById('courseFilter')?.addEventListener('change', (e) => this.applyFilters());
        document.getElementById('sortFilter')?.addEventListener('change', (e) => this.applyFilters());

        // Modal
        document.getElementById('cancelApproval')?.addEventListener('click', () => this.hideModal());
        document.getElementById('confirmApproval')?.addEventListener('click', () => this.confirmApproval());

        // Quick actions
        document.getElementById('approveStudents')?.addEventListener('click', () => {
            this.switchTab('approval-tab');
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.nav-item[data-tab]').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-tab="${tabId}"]`)?.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId)?.classList.add('active');

        if (tabId === 'approval-tab') {
            this.loadPendingCount();
            this.loadPendingStudents();
        }
    }

    async loadPendingCount() {
        try {
            const response = await this.fetchWithAuth(`${STUDENT_API_BASE}/pending-count`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                const count = data.count || data.pendingCount || data.total || 0;
                
                const pendingCountElement = document.getElementById('pendingCount');
                if (pendingCountElement) {
                    pendingCountElement.className = '';
                    pendingCountElement.textContent = count;
                }

                const pendingBadge = document.getElementById('pendingBadge');
                if (pendingBadge) {
                    if (count > 0) {
                        pendingBadge.textContent = count > 99 ? '99+' : count;
                        pendingBadge.style.display = 'flex';
                    } else {
                        pendingBadge.style.display = 'none';
                    }
                }

                if (typeof updatePendingCounter === 'function') {
                    updatePendingCounter(count);
                }
            }
        } catch (error) {
            console.error('Error loading REAL pending count:', error);
            const pendingCountElement = document.getElementById('pendingCount');
            if (pendingCountElement) {
                pendingCountElement.className = '';
                pendingCountElement.textContent = '0';
                pendingCountElement.style.color = 'var(--error-color)';
            }
        }
    }

    async loadPendingStudents() {
        const container = document.getElementById('pendingStudentsList');
        if (!container) return;
    
        try {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-sync fa-spin fa-2x" style="color: var(--primary-color); margin-bottom: 15px;"></i>
                    <p style="color: var(--text-muted);">Loading REAL pending students...</p>
                </div>
            `;
    
            const queryParams = new URLSearchParams({
                limit: this.pageSize,
                offset: (this.currentPage - 1) * this.pageSize,
                ...this.currentFilters
            });
    
            const response = await this.fetchWithAuth(`${STUDENT_API_BASE}/pending?${queryParams}`);
    
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication required. Please login again.');
                } else if (response.status === 403) {
                    throw new Error('Access denied. You do not have permission.');
                } else if (response.status === 404) {
                    throw new Error('API endpoint not found.');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            const data = await response.json();
    
            if (data.success) {
                const students = data.students || data.data || data.pendingStudents || [];
                console.log(`✅ Loaded ${students.length} REAL pending students`);
                this.renderPendingStudents(students, container);
            } else if (data.pendingStudents) {
                console.log(`✅ Loaded ${data.pendingStudents.length} REAL pending students (alternative format)`);
                this.renderPendingStudents(data.pendingStudents, container);
            } else if (Array.isArray(data)) {
                console.log(`✅ Loaded ${data.length} REAL pending students (array format)`);
                this.renderPendingStudents(data, container);
            } else {
                console.warn('⚠️ Unexpected REAL response format:', data);
                if (data.students && Array.isArray(data.students)) {
                    console.log(`✅ Loaded ${data.students.length} REAL pending students (fallback)`);
                    this.renderPendingStudents(data.students, container);
                } else {
                    throw new Error(data.message || 'Unexpected response format from server');
                }
            }
        } catch (error) {
            console.error('❌ Error loading REAL pending students:', error);
            
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--error-color);">
                    <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom: 15px;"></i>
                    <p>Failed to load REAL pending students</p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 5px;">${error.message}</p>
                    <button class="btn" onclick="studentApproval.loadPendingStudents()" style="margin-top: 10px;">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    renderPendingStudents(students, container) {
        if (students.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-check-circle fa-2x" style="margin-bottom: 15px;"></i>
                    <p>No REAL pending student approvals</p>
                    <p style="font-size: 12px; margin-top: 5px;">All REAL student applications have been processed</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="margin-bottom: 15px; font-size: 12px; color: var(--text-muted);">
                ${students.length} REAL student(s) pending approval
            </div>
        `;

        students.forEach(student => {
            const isSelected = this.selectedStudents.has(student.id);
            html += `
                <div class="student-item ${isSelected ? 'selected' : ''}" data-student-id="${student.id}">
                    <div class="student-checkbox">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="studentApproval.toggleStudentSelection(${student.id}, this.checked)">
                    </div>
                    <div class="student-info">
                        <div class="student-name">
                            ${student.first_name} ${student.last_name}
                            ${student.university_roll_no ? `(${student.university_roll_no})` : ''}
                        </div>
                        <div class="student-details">
                            <span><i class="fas fa-envelope"></i> ${student.email}</span>
                            <span><i class="fas fa-phone"></i> ${student.phone || 'N/A'}</span>
                            <span><i class="fas fa-building"></i> ${student.hostel_name || 'No Hostel'}</span>
                            <span><i class="fas fa-calendar"></i> ${this.formatDate(student.request_date)}</span>
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="btn" onclick="studentApproval.showApprovalModal(${student.id})" 
                                style="background: var(--success-color); color: white; font-size: 11px;">
                            <i class="fas fa-user-check"></i> Approve
                        </button>
                        <button class="btn" onclick="studentApproval.rejectStudent(${student.id})" 
                                style="background: var(--error-color); color: white; font-size: 11px;">
                            <i class="fas fa-user-times"></i> Reject
                        </button>
                        <button class="btn" onclick="studentApproval.viewStudentDetails(${student.id})" 
                                style="font-size: 11px;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    toggleStudentSelection(studentId, selected) {
        if (selected) {
            this.selectedStudents.add(studentId);
        } else {
            this.selectedStudents.delete(studentId);
        }

        const studentElement = document.querySelector(`.student-item[data-student-id="${studentId}"]`);
        if (studentElement) {
            studentElement.classList.toggle('selected', selected);
        }

        this.updateBulkActionsState();
    }

    toggleSelectAll() {
        const allCheckboxes = document.querySelectorAll('.student-item input[type="checkbox"]');
        const allSelected = Array.from(allCheckboxes).every(checkbox => checkbox.checked);

        allCheckboxes.forEach(checkbox => {
            const studentId = parseInt(checkbox.closest('.student-item').getAttribute('data-student-id'));
            const shouldSelect = !allSelected;
            
            checkbox.checked = shouldSelect;
            this.toggleStudentSelection(studentId, shouldSelect);
        });

        const selectAllBtn = document.getElementById('selectAll');
        if (selectAllBtn) {
            selectAllBtn.innerHTML = allSelected ? 
                '<i class="fas fa-check-square"></i> Select All' : 
                '<i class="fas fa-times"></i> Deselect All';
        }
    }

    updateBulkActionsState() {
        const hasSelection = this.selectedStudents.size > 0;
        const bulkApproveBtn = document.getElementById('bulkApprove');
        const bulkRejectBtn = document.getElementById('bulkReject');

        if (bulkApproveBtn) {
            bulkApproveBtn.disabled = !hasSelection;
            bulkApproveBtn.style.opacity = hasSelection ? '1' : '0.6';
        }

        if (bulkRejectBtn) {
            bulkRejectBtn.disabled = !hasSelection;
            bulkRejectBtn.style.opacity = hasSelection ? '1' : '0.6';
        }
    }

    async showApprovalModal(studentId) {
        this.currentStudentId = studentId;
        
        try {
            const response = await this.fetchWithAuth(`${STUDENT_API_BASE}/pending`);
            const data = await response.json();
            
            if (data.success) {
                const student = (data.students || []).find(s => s.id === studentId);
                if (student) {
                    this.renderApprovalModal(student);
                    this.showModal();
                }
            }
        } catch (error) {
            console.error('Error loading REAL student details:', error);
            alert('Failed to load REAL student details');
        }
    }

    renderApprovalModal(student) {
        const modalContent = document.getElementById('approvalModalContent');
        modalContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--text-dark); margin-bottom: 15px;">REAL Student Details</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                    <div><strong>Name:</strong> ${student.first_name} ${student.last_name}</div>
                    <div><strong>Email:</strong> ${student.email}</div>
                    <div><strong>Phone:</strong> ${student.phone || 'N/A'}</div>
                    <div><strong>Hostel:</strong> ${student.hostel_name || 'Not assigned'}</div>
                    <div><strong>University Roll No:</strong> ${student.university_roll_no || 'N/A'}</div>
                    <div><strong>Applied On:</strong> ${this.formatDate(student.request_date)}</div>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--text-dark); margin-bottom: 15px;">Account Settings</h4>
                
                <div style="margin-bottom: 15px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9f9f9;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">🔐 AWS-Style Password Generator</label>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <select class="btn" id="passwordOption" style="flex: 1; padding: 8px;">
                            <option value="auto">Auto-generate Secure Password</option>
                            <option value="manual">Set Manual Password</option>
                            <option value="change">Change on First Login</option>
                        </select>
                        <button type="button" id="generatePasswordBtn" class="btn" 
                                style="background: var(--primary-color); color: white; padding: 8px 12px;">
                            <i class="fas fa-bolt"></i> Generate
                        </button>
                    </div>

                    <div id="passwordPreview" style="display: none; margin: 10px 0; padding: 10px; background: #e8f5e8; border-radius: 4px; font-family: monospace; text-align: center; font-weight: bold;"></div>

                    <div id="manualPasswordSection" style="display: none; margin-top: 10px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Manual Password</label>
                        <input type="password" id="manualPassword" class="btn" 
                               style="width: 100%; padding: 8px;" placeholder="Enter REAL password">
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">
                            Password must be at least 8 characters with letters and numbers
                        </div>
                    </div>

                    <div id="passwordOptions" style="display: flex; gap: 10px; margin-top: 10px; font-size: 12px;">
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="radio" name="passwordStrength" value="12" checked> Strong (12 chars)
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="radio" name="passwordStrength" value="16"> Very Strong (16 chars)
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="checkbox" id="includeSpecial" checked> Special Chars
                        </label>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">User Role</label>
                    <select class="btn" id="userRole" style="width: 100%; padding: 8px;">
                        <option value="4">Student</option>
                        <option value="3">Warden</option>
                        <option value="2">Hostel Admin</option>
                    </select>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="sendEmail" checked>
                    <label for="sendEmail" style="font-size: 13px;">Send REAL welcome email with login credentials</label>
                </div>
            </div>
        `;

        // Add event listeners for dynamic sections
        document.getElementById('passwordOption').addEventListener('change', (e) => {
            const manualSection = document.getElementById('manualPasswordSection');
            const passwordOptions = document.getElementById('passwordOptions');
            const passwordPreview = document.getElementById('passwordPreview');
            
            manualSection.style.display = e.target.value === 'manual' ? 'block' : 'none';
            passwordOptions.style.display = e.target.value === 'auto' ? 'flex' : 'none';
            passwordPreview.style.display = e.target.value === 'auto' ? 'block' : 'none';
            
            if (e.target.value === 'auto') {
                this.generateAndDisplayPassword();
            }
        });

        document.getElementById('generatePasswordBtn').addEventListener('click', () => {
            this.generateAndDisplayPassword();
        });

        this.generateAndDisplayPassword();
    }

    generateAndDisplayPassword() {
        const length = parseInt(document.querySelector('input[name="passwordStrength"]:checked')?.value || 12);
        const includeSpecial = document.getElementById('includeSpecial')?.checked || true;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let chars = letters + numbers;
        if (includeSpecial) chars += special;
        
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        const passwordPreview = document.getElementById('passwordPreview');
        if (passwordPreview) {
            passwordPreview.textContent = `Generated REAL Password: ${password}`;
            passwordPreview.style.display = 'block';
        }
        
        this.generatedPassword = password;
    }

    async confirmApproval() {
        const passwordOption = document.getElementById('passwordOption').value;
        const manualPassword = document.getElementById('manualPassword').value;
        const roleId = document.getElementById('userRole').value;
        const sendEmail = document.getElementById('sendEmail').checked;

        let finalPassword = manualPassword;
        if (passwordOption === 'auto' && this.generatedPassword) {
            finalPassword = this.generatedPassword;
        }

        if (passwordOption === 'manual' && (!finalPassword || finalPassword.length < 8)) {
            alert('Please enter a valid REAL password (minimum 8 characters)');
            return;
        }

        try {
            console.log('🚀 Sending REAL approval request for student:', this.currentStudentId);
            
            const response = await this.fetchWithAuth(`${STUDENT_API_BASE}/approve`, {
                method: 'POST',
                body: JSON.stringify({
                    studentId: this.currentStudentId,
                    passwordOption: passwordOption,
                    manualPassword: finalPassword,
                    roleId: parseInt(roleId),
                    sendEmail: sendEmail
                })
            });

            const data = await response.json();

            if (data.success) {
                this.hideModal();
                
                let successDetails = `Username: ${data.username}`;
                if (sendEmail) {
                    successDetails += ` • Email sent to: ${data.email || 'student email'}`;
                }
                
                this.showSuccessMessage(
                    `REAL Student ${data.studentName || ''} approved successfully!`,
                    successDetails
                );
                
                this.loadPendingCount();
                this.loadPendingStudents();
                this.selectedStudents.delete(this.currentStudentId);
            } else {
                throw new Error(data.message || 'REAL Approval failed');
            }
        } catch (error) {
            console.error('❌ Error approving REAL student:', error);
            alert(`Failed to approve REAL student: ${error.message}`);
        }
    }

    showBulkPasswordModal() {
        if (this.selectedStudents.size === 0) return;

        const modalHTML = `
            <div id="bulkPasswordModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
                <div style="background: white; padding: 25px; border-radius: 8px; width: 600px; max-width: 90vw; max-height: 80vh; overflow-y: auto;">
                    <h3 style="margin-bottom: 15px; color: var(--text-dark);">
                        <i class="fas fa-users"></i> Bulk Approval - ${this.selectedStudents.size} REAL Students
                    </h3>
                    
                    <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9f9f9;">
                        <h4 style="margin-bottom: 15px; color: var(--text-dark);">🔐 REAL Password Settings</h4>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Password Strength</label>
                                <select class="btn" id="bulkPasswordStrength" style="width: 100%; padding: 8px;">
                                    <option value="12">Strong (12 characters)</option>
                                    <option value="16">Very Strong (16 characters)</option>
                                    <option value="20">Maximum (20 characters)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Special Characters</label>
                                <select class="btn" id="bulkIncludeSpecial" style="width: 100%; padding: 8px;">
                                    <option value="true">Include</option>
                                    <option value="false">Exclude</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin: 15px 0;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Sample REAL Generated Password</label>
                            <div id="bulkPasswordPreview" style="padding: 12px; background: #e8f5e8; border-radius: 4px; font-family: monospace; text-align: center; font-weight: bold; border: 2px dashed #4CAF50;">
                                Click generate to see REAL sample
                            </div>
                            <button type="button" id="bulkGenerateSample" class="btn" 
                                    style="width: 100%; margin-top: 10px; background: var(--primary-color); color: white;">
                                <i class="fas fa-sync"></i> Generate REAL Sample Password
                            </button>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <input type="checkbox" id="bulkSendEmail" checked>
                            <label for="bulkSendEmail" style="font-weight: 600;">Send REAL welcome emails with credentials</label>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); padding-left: 25px;">
                            Each REAL student will receive a unique username and password via email
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin-bottom: 10px; color: var(--text-dark);">Selected REAL Students</h4>
                        <div style="max-height: 150px; overflow-y: auto; border: 1px solid #eee; padding: 10px; border-radius: 4px; font-size: 12px;">
                            ${this.getSelectedStudentsPreview()}
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #eee; padding-top: 20px;">
                        <button class="btn" onclick="studentApproval.closeBulkPasswordModal()" 
                                style="background: var(--error-color); color: white;">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="btn" id="confirmBulkApprove" 
                                style="background: var(--success-color); color: white; font-weight: bold;">
                            <i class="fas fa-user-check"></i> Approve ${this.selectedStudents.size} REAL Students
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('bulkGenerateSample').addEventListener('click', () => {
            this.generateBulkSamplePassword();
        });
        
        document.getElementById('confirmBulkApprove').addEventListener('click', () => {
            this.executeBulkApprove();
        });
        
        this.generateBulkSamplePassword();
    }

    getSelectedStudentsPreview() {
        let preview = '';
        const studentElements = document.querySelectorAll('.student-item.selected');
        
        studentElements.forEach((element, index) => {
            if (index < 10) {
                const name = element.querySelector('.student-name').textContent;
                preview += `<div style="padding: 5px 0; border-bottom: 1px solid #f0f0f0;">${name}</div>`;
            }
        });
        
        if (this.selectedStudents.size > 10) {
            preview += `<div style="padding: 5px 0; color: var(--text-muted); font-style: italic;">... and ${this.selectedStudents.size - 10} more REAL students</div>`;
        }
        
        return preview || '<div style="color: var(--text-muted);">No REAL students selected</div>';
    }

    generateBulkSamplePassword() {
        const length = parseInt(document.getElementById('bulkPasswordStrength').value);
        const includeSpecial = document.getElementById('bulkIncludeSpecial').value === 'true';
        
        const samplePassword = this.generateRandomPassword(length, includeSpecial);
        document.getElementById('bulkPasswordPreview').textContent = samplePassword;
    }

    generateRandomPassword(length = 12, includeSpecial = true) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let chars = letters + numbers;
        if (includeSpecial) chars += special;
        
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return password;
    }

    async executeBulkApprove() {
        const sendEmail = document.getElementById('bulkSendEmail').checked;
        const passwordLength = parseInt(document.getElementById('bulkPasswordStrength').value);
        const includeSpecial = document.getElementById('bulkIncludeSpecial').value === 'true';

        const confirmBtn = document.getElementById('confirmBulkApprove');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing REAL Approvals...';
        confirmBtn.disabled = true;

        try {
            console.log('🚀 Sending REAL bulk approval for:', this.selectedStudents.size, 'students');
            
            const response = await this.fetchWithAuth(`${STUDENT_API_BASE}/bulk-approve`, {
                method: 'POST',
                body: JSON.stringify({
                    studentIds: Array.from(this.selectedStudents),
                    passwordOption: 'auto',
                    passwordLength: passwordLength,
                    includeSpecial: includeSpecial,
                    sendEmail: sendEmail
                })
            });

            const data = await response.json();

            if (data.success) {
                this.closeBulkPasswordModal();
                
                let successMessage = `✅ Successfully approved ${data.successful.length} REAL student(s)`;
                
                if (data.failed.length > 0) {
                    successMessage += ` (${data.failed.length} failed)`;
                    
                    setTimeout(() => {
                        this.showBulkFailureReport(data.failed);
                    }, 1000);
                }
                
                this.showSuccessMessage(successMessage);
                
                this.selectedStudents.clear();
                this.loadPendingCount();
                this.loadPendingStudents();
                
            } else {
                throw new Error(data.message || 'REAL Bulk approval failed');
            }
        } catch (error) {
            console.error('Error in REAL bulk approval:', error);
            alert(`REAL Bulk approval failed: ${error.message}`);
        } finally {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }

    showBulkFailureReport(failedApprovals) {
        if (failedApprovals.length === 0) return;

        const reportHTML = `
            <div id="bulkFailureModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10001; align-items: center; justify-content: center;">
                <div style="background: white; padding: 25px; border-radius: 8px; width: 500px; max-width: 90vw; max-height: 80vh; overflow-y: auto;">
                    <h3 style="margin-bottom: 15px; color: var(--error-color);">
                        <i class="fas fa-exclamation-triangle"></i> REAL Failed Approvals
                    </h3>
                    <p style="margin-bottom: 15px; color: var(--text-muted);">
                        ${failedApprovals.length} REAL student(s) could not be approved:
                    </p>
                    <div style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;">
                        ${failedApprovals.map(failed => `
                            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                                <strong>REAL Student ID: ${failed.studentId}</strong><br>
                                <span style="color: var(--error-color); font-size: 12px;">${failed.error}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="text-align: right;">
                        <button class="btn" onclick="document.getElementById('bulkFailureModal').remove()" 
                                style="background: var(--primary-color); color: white;">
                            <i class="fas fa-check"></i> Understand
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', reportHTML);
    }

    closeBulkPasswordModal() {
        const modal = document.getElementById('bulkPasswordModal');
        if (modal) modal.remove();
    }

    async bulkReject() {
        if (this.selectedStudents.size === 0) return;

        const reason = prompt('Enter REAL rejection reason:');
        if (!reason) return;

        const confirmed = confirm(`Reject ${this.selectedStudents.size} REAL student(s) with reason: "${reason}"?`);
        if (!confirmed) return;

        try {
            for (const studentId of this.selectedStudents) {
                await this.rejectStudent(studentId, reason);
            }
            
            this.showSuccessMessage(`Successfully rejected ${this.selectedStudents.size} REAL student(s)`);
            this.selectedStudents.clear();
            this.loadPendingCount();
            this.loadPendingStudents();
        } catch (error) {
            console.error('Error in REAL bulk rejection:', error);
            alert('REAL Bulk rejection failed: ' + error.message);
        }
    }

    async rejectStudent(studentId, reason = null) {
        if (!reason) {
            reason = prompt('Enter REAL rejection reason:');
            if (!reason) return;
        }

        try {
            console.log('🚀 Sending REAL rejection for student:', studentId);
            
            const response = await this.fetchWithAuth(`${STUDENT_API_BASE}/reject`, {
                method: 'POST',
                body: JSON.stringify({
                    studentId: studentId,
                    reason: reason
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccessMessage('REAL Student rejected successfully');
                this.loadPendingCount();
                this.loadPendingStudents();
                this.selectedStudents.delete(studentId);
            } else {
                throw new Error(data.message || 'REAL Rejection failed');
            }
        } catch (error) {
            console.error('Error rejecting REAL student:', error);
            alert('Failed to reject REAL student: ' + error.message);
        }
    }

    viewStudentDetails(studentId) {
        alert(`View REAL details for student ID: ${studentId}`);
    }

    applyFilters() {
        this.currentFilters = {
            hostel: document.getElementById('hostelFilter').value,
            course: document.getElementById('courseFilter').value,
            sort: document.getElementById('sortFilter').value
        };
        this.currentPage = 1;
        this.loadPendingStudents();
    }

    async loadFilters() {
        const hostelFilter = document.getElementById('hostelFilter');
        const courseFilter = document.getElementById('courseFilter');

        hostelFilter.innerHTML = '<option value="">Loading REAL filters...</option>';
        courseFilter.innerHTML = '<option value="">Loading REAL filters...</option>';

        try {
            const response = await this.fetchWithAuth(`${STUDENT_API_BASE}/groups`);
            const data = await response.json();
            
            hostelFilter.innerHTML = '<option value="">All REAL Hostels</option>';
            courseFilter.innerHTML = '<option value="">All REAL Courses</option>';

            if (data.success) {
                if (data.groups) {
                    data.groups.forEach(group => {
                        const option = document.createElement('option');
                        option.value = group.hostel_id;
                        option.textContent = `${group.hostel_name} (${group.pending_count} REAL pending)`;
                        hostelFilter.appendChild(option);
                    });
                }

                if (data.courses && Array.isArray(data.courses)) {
                    data.courses.forEach(course => {
                        const option = document.createElement('option');
                        option.value = course.id; 
                        option.textContent = course.name;
                        courseFilter.appendChild(option);
                    });
                } else {
                    console.warn('Backend did not provide REAL courses list');
                }
            } else {
                throw new Error(data.message || 'Failed to fetch REAL filter data');
            }
        } catch (error) {
            console.error('Error loading REAL filters:', error);
            hostelFilter.innerHTML = '<option value="">Error Loading REAL Hostels</option>';
            courseFilter.innerHTML = '<option value="">Error Loading REAL Courses</option>';
        }
    }

    showModal() {
        document.getElementById('approvalModal').style.display = 'flex';
    }

    hideModal() {
        document.getElementById('approvalModal').style.display = 'none';
        this.currentStudentId = null;
        this.generatedPassword = null;
    }

    showSuccessMessage(message, details = null) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            z-index: 10001;
            box-shadow: var(--shadow-medium);
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        let messageHTML = `✅ ${message}`;
        if (details) {
            messageHTML += `<br><small style="opacity: 0.9; font-size: 12px;">${details}</small>`;
        }
        
        notification.innerHTML = messageHTML;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize the REAL student approval system
const studentApproval = new StudentApprovalSystem();
window.studentApproval = studentApproval;