/* admin-console/js/user-creation-wizard.js */
const API_BASE = '/api/admin';

class UserCreationWizard {
    constructor() {
        this.currentStep = 1;
        this.userType = null; // student or employee
        this.userData = {};
        
        this.initialize();
    }

    initialize() {
        this.bindEvents();
        this.loadPermissions();
    }

    bindEvents() {
        // Step Navigation
        document.getElementById('nextStep1')?.addEventListener('click', () => this.nextStep(2));
        document.getElementById('nextStep2')?.addEventListener('click', () => this.nextStep(3));
        document.getElementById('nextStep3')?.addEventListener('click', () => this.nextStep(4));
        document.getElementById('nextStep4')?.addEventListener('click', () => this.nextStep(5));
        document.getElementById('nextStep5')?.addEventListener('click', () => this.nextStep(6));
        document.getElementById('nextStep6')?.addEventListener('click', () => this.nextStep(7));
        
        document.getElementById('prevStep2')?.addEventListener('click', () => this.previousStep(1));
        document.getElementById('prevStep3')?.addEventListener('click', () => this.previousStep(2));
        document.getElementById('prevStep4')?.addEventListener('click', () => this.previousStep(3));
        document.getElementById('prevStep5')?.addEventListener('click', () => this.previousStep(4));
        document.getElementById('prevStep6')?.addEventListener('click', () => this.previousStep(5));
        document.getElementById('prevStep7')?.addEventListener('click', () => this.previousStep(6));

        // User Type Selection (Step 1)
        document.getElementById('userTypeStudent')?.addEventListener('change', () => this.selectUserType('student'));
        document.getElementById('userTypeEmployee')?.addEventListener('change', () => this.selectUserType('employee'));
        
        // Gender & Hostel (Step 2)
        document.getElementById('selectGender')?.addEventListener('change', (e) => this.selectGender(e.target.value));
        document.getElementById('selectHostel')?.addEventListener('change', (e) => this.selectHostel(e.target.value));

        // Step 3 (Conditional Fields)
        document.getElementById('generateId')?.addEventListener('click', () => this.generateEmployeeId());
        document.getElementById('rollNo')?.addEventListener('input', () => this.validateStep3());
        
        // Personal Info (Step 4)
        document.getElementById('fullName')?.addEventListener('input', () => this.validateStep4());
        document.getElementById('dob')?.addEventListener('input', () => this.validateStep4());

        // Contact Validation (Step 5)
        document.getElementById('email')?.addEventListener('input', () => this.validateEmail());
        document.getElementById('mobile')?.addEventListener('input', (e) => this.validateMobile(e.target));

        // Password Validation (Step 6)
        document.getElementById('password')?.addEventListener('input', () => this.updatePasswordStrength());
        document.getElementById('confirmPassword')?.addEventListener('input', () => this.validatePasswords());
        
        // Final Creation
        document.getElementById('createUserBtn')?.addEventListener('click', () => this.createUser());
        document.getElementById('successOk')?.addEventListener('click', () => this.resetWizard());
        document.getElementById('clearForm')?.addEventListener('click', () => this.resetWizard());
    }
    
    selectUserType(type) {
        this.userType = type;
        document.getElementById('nextStep1').disabled = false;
        
        const studentFields = document.getElementById('studentFields');
        const employeeFields = document.getElementById('employeeFields');
        
        if (studentFields && employeeFields) {
            studentFields.style.display = (type === 'student') ? 'block' : 'none';
            employeeFields.style.display = (type === 'employee') ? 'block' : 'none';
        }
    }

    // Step Navigation
    nextStep(step) {
        this.hideStep(this.currentStep);
        this.showStep(step);
        this.updateProgress(step);
        this.currentStep = step;
        if (step === 7) this.reviewDetails();
    }

    previousStep(step) {
        this.hideStep(this.currentStep);
        this.showStep(step);
        this.updateProgress(step);
        this.currentStep = step;
    }

    hideStep(step) {
        const stepPanel = document.querySelector(`.step-panel[data-panel="${step}"]`);
        if(stepPanel) stepPanel.classList.remove('active');
    }

    showStep(step) {
        const stepPanel = document.querySelector(`.step-panel[data-panel="${step}"]`);
        if(stepPanel) stepPanel.classList.add('active');
    }

    updateProgress(step) {
        document.querySelectorAll('.wizard-progress .step').forEach(stepEl => {
            stepEl.classList.remove('active', 'complete');
            if (parseInt(stepEl.dataset.step) < step) {
                stepEl.classList.add('complete');
            } else if (parseInt(stepEl.dataset.step) === step) {
                stepEl.classList.add('active');
            }
        });
    }

    // Hostel/Gender Logic (Step 2)
    async selectGender(gender) {
        this.userData.gender = gender;
        document.getElementById('selectHostel').disabled = false;
        this.loadHostels(gender);
        this.checkStep2Validity();
    }

    selectHostel(hostelId) {
        this.userData.hostelId = hostelId;
        this.checkStep2Validity();
    }
    
    checkStep2Validity() {
        const nextBtn = document.getElementById('nextStep2');
        if (nextBtn) {
            const hostelVal = document.getElementById('selectHostel').value;
            const genderVal = document.getElementById('selectGender').value;
            nextBtn.disabled = !(hostelVal && genderVal);
        }
    }
    
    async loadHostels(gender) {
        const hostelSelect = document.getElementById('selectHostel');
        hostelSelect.innerHTML = '<option value="">Loading...</option>';
        
        try {
            // FIX: Use the actual API endpoint with Authorization header
            const token = localStorage.getItem('adminJwtToken') || '';
            const response = await fetch(`${API_BASE}/users/hostels?gender=${gender}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            hostelSelect.innerHTML = '<option value="">-- Select Hostel --</option>';
            
            if (data.success && data.hostels && data.hostels.length > 0) {
                data.hostels.forEach(hostel => {
                    const option = document.createElement('option');
                    option.value = hostel.id;
                    option.textContent = hostel.name;
                    hostelSelect.appendChild(option);
                });
            } else {
                 hostelSelect.innerHTML = `<option value="">No ${gender} hostels found</option>`;
            }
        } catch (error) {
            hostelSelect.innerHTML = '<option value="">Error loading hostels</option>';
            console.error('Error loading hostels:', error);
        }
    }

    // Step 3 Validation
    validateStep3() {
        let isValid = false;
        
        if (this.userType === 'student') {
            const rollNo = document.getElementById('rollNo')?.value.trim();
            isValid = !!rollNo;
            this.userData.rollNo = rollNo;
        } else {
            const employeeId = document.getElementById('employeeID')?.value.trim();
            isValid = !!employeeId;
            this.userData.employeeID = employeeId;
        }
        
        document.getElementById('nextStep3').disabled = !isValid;
    }

    // Employee ID Generation
    async generateEmployeeId() {
        // Implementation remains mock/placeholder until /users/last-id is used
        const employeeIdInput = document.getElementById('employeeID');
        if (employeeIdInput) {
            employeeIdInput.value = 'EHM' + Math.floor(Math.random() * 10000).toString().padStart(5, '0');
            this.validateStep3();
        }
    }

    // Personal Info Validation (Step 4)
    validateStep4() {
        const fullName = document.getElementById('fullName').value.trim();
        const dob = document.getElementById('dob').value;
        const isValid = fullName.length > 0 && dob;
        
        document.getElementById('nextStep4').disabled = !isValid;
        
        if (isValid) {
            this.userData.fullName = fullName;
            this.userData.dob = dob;
            this.userData.fatherName = document.getElementById('fatherName')?.value.trim();
        }
    }

    // Contact Validation (Step 5)
    validateEmail() {
        const email = document.getElementById('email').value.trim();
        // Simple regex check
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        
        const nextBtn = document.getElementById('nextStep5');
        if(nextBtn) nextBtn.disabled = !(emailValid && (document.getElementById('mobile')?.value.length === 10));
    }
    
    validateMobile(input) {
        input.value = input.value.replace(/[^0-9]/g, '');
        if (input.value.length > 10) input.value = input.value.slice(0, 10);
        
        const email = document.getElementById('email').value.trim();
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        const nextBtn = document.getElementById('nextStep5');
        if(nextBtn) nextBtn.disabled = !(emailValid && input.value.length === 10);
        
        if (input.value.length === 10) this.userData.mobile = input.value;
    }

    // Password Validation (Step 6)
    validatePasswords() {
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirmPassword').value;
        
        const nextBtn = document.getElementById('nextStep6');
        if (nextBtn) {
            // Require password length >= 8
            nextBtn.disabled = !(password && confirm && password === confirm && password.length >= 8);
        }
    }

    // Final Review (Step 7)
    reviewDetails() {
        const reviewDiv = document.getElementById('reviewDetails');
        if(reviewDiv) {
            reviewDiv.innerHTML = `
                <p><strong>Type:</strong> ${this.userType.toUpperCase()}</p>
                <p><strong>Name:</strong> ${this.userData.fullName || 'N/A'}</p>
                <p><strong>Email:</strong> ${this.userData.email || 'N/A'}</p>
                <p><strong>Mobile:</strong> ${this.userData.mobile || 'N/A'}</p>
                <p><strong>Hostel ID:</strong> ${this.userData.hostelId || 'N/A'}</p>
                <p><strong>Status:</strong> Pending Admin Approval</p>
            `;
            // Enable final button after review is populated
            document.getElementById('createUserBtn').disabled = false;
        }
    }


    // Final User Creation
    async createUser() {
        const createBtn = document.getElementById('createUserBtn');
        const originalHtml = createBtn.innerHTML;
        
        createBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Creating...';
        createBtn.disabled = true;

        try {
            const token = localStorage.getItem('adminJwtToken');
            
            const userDataPayload = {
                ...this.userData,
                password: document.getElementById('password').value,
                // Add conditional fields based on user type
                rollNo: this.userType === 'student' ? document.getElementById('rollNo')?.value : undefined,
                employeeID: this.userType === 'employee' ? document.getElementById('employeeID')?.value : undefined,
            };

            const response = await fetch(`${API_BASE}/users/create-request`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userDataPayload)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccessModal(this.userData.fullName || "User");
                createBtn.innerHTML = '<i class="fas fa-check"></i> Created';
            } else {
                throw new Error(result.error || "Creation failed");
            }
            
        } catch (error) {
            console.error('Error creating user:', error);
            document.getElementById('createUserBtn').innerHTML = '<i class="fas fa-times"></i> Error';
            setTimeout(() => {
                document.getElementById('createUserBtn').innerHTML = originalHtml;
                document.getElementById('createUserBtn').disabled = false;
            }, 2000);
        }
    }

    showSuccessModal(username) {
        document.getElementById('successUsername').textContent = username;
        document.getElementById('successModal').style.display = 'flex';
    }

    resetWizard() {
        // Reset to step 1
        this.currentStep = 1;
        document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
        this.showStep(1);
        this.updateProgress(1);
        
        // Clear all data and UI
        document.getElementById('successModal').style.display = 'none';
        this.userData = {};
        
        const inputs = document.querySelectorAll('.wizard-content input, .wizard-content select');
        inputs.forEach(input => {
            if(input.type === 'radio' || input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        
        // Reset buttons
        document.querySelectorAll('button[id^="nextStep"]').forEach(btn => btn.disabled = true);
        const createBtn = document.getElementById('createUserBtn');
        if(createBtn) {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create User';
        }
        
        // Hide conditional fields again
        const studentFields = document.getElementById('studentFields');
        const employeeFields = document.getElementById('employeeFields');
        if (studentFields) studentFields.style.display = 'none';
        if (employeeFields) employeeFields.style.display = 'none';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UserCreationWizard();
});