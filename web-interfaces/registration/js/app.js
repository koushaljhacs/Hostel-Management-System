// Registration form functionality - BROWSER COMPATIBLE VERSION
document.addEventListener('DOMContentLoaded', function () {
    console.log('Registration form loaded successfully!');

    // Language texts
    const languageTexts = {
        en: {
            subtitle: "Complete each section in order. The next section will unlock once the current one is completed.",
            progressText: "Progress:",
            personalTitle: "Personal Information",
            academicTitle: "Academic Information",
            addressTitle: "Address Information",
            firstNameLabel: "First Name",
            middleNameLabel: "Middle Name",
            lastNameLabel: "Last Name",
            genderLabel: "Gender",
            dobLabel: "Date of Birth",
            ageLabel: "Age",
            currentYearLabel: "Current Year",
            branchLabel: "Branch",
            courseLabel: "Course",
            sectionLabel: "Section",
            contactLabel: "Contact Number",
            rollnoLabel: "University Roll No",
            cpiLabel: "CPI",
            stateLabel: "State",
            cityLabel: "City",
            pincodeLabel: "Pincode",
            emailLabel: "Email Address",
            emailHint: "Only @gmail.com and @outlook.com domains are allowed",
            sendOtp: "Send OTP",
            verifyOtp: "Verify OTP",
            enterOtp: "Enter OTP",
            nextToAcademic: "Continue to Academic",
            nextToAddress: "Continue to Address",
            back: "Back",
            completeRegistration: "Complete Registration",
            footerNote: "By submitting this form, you agree to our terms and conditions.",
            statusCurrent: "Current",
            statusLocked: "Locked",
            statusCompleted: "Completed",
            //
            // ======================================================
            // ========= 🚨 MODIFIED BLOCK STARTS HERE 🚨 =========
            // ======================================================
            //
            ageWarning: '<i class="fas fa-exclamation-triangle"></i> Student must be between 16 and 32 years old',
            ageBlocked: '<i class="fas fa-ban"></i> Student must be between 16 and 32 years old to register',
            emailDuplicate: '<i class="fas fa-times-circle"></i> This email is already registered',
            emailAvailable: '<i class="fas fa-check-circle"></i> Email is available',
            contactInvalid: '<i class="fas fa-times-circle"></i> Please enter a valid 10-digit contact number',
            contactValid: '<i class="fas fa-check-circle"></i> Contact number is valid',
            pincodeInvalid: '<i class="fas fa-times-circle"></i> Please enter a valid 6-digit pincode',
            pincodeValid: '<i class="fas fa-check-circle"></i> Pincode is valid',
            cpiInvalid: '<i class="fas fa-times-circle"></i> CPI must be between 0 and 10',
            cpiValid: '<i class="fas fa-check-circle"></i> CPI is valid',
            rollnoInvalid: '<i class="fas fa-times-circle"></i> Roll number must be exactly 10 digits',
            rollnoValid: '<i class="fas fa-check-circle"></i> Roll number format is valid',
            rollnoDuplicate: '<i class="fas fa-times-circle"></i> Roll number already registered',
            rollnoAvailable: '<i class="fas fa-check-circle"></i> Roll number available',
            //
            // ======================================================
            // ========= 🚨 MODIFIED BLOCK ENDS HERE 🚨 ===========
            // ======================================================
            //
            botCheck: "Please wait before trying again.",
            termsRequired: "You must accept the Terms and Conditions to register.",
            nameInvalidLength: "Name must be at least 2 characters.",
            nameInvalidChars: "Name must only contain letters and spaces.",
            sidebarPersonal: "Personal Information",
            sidebarAcademic: "Academic Information",
            sidebarAddress: "Address & Verification"
        },
        hi: {
            subtitle: "प्रत्येक अनुभाग को क्रम में पूरा करें। वर्तमान अनुभाग पूरा होने के बाद अगला अनुभाग अनलॉक हो जाएगा।",
            progressText: "प्रगति:",
            personalTitle: "व्यक्तिगत जानकारी",
            academicTitle: "शैक्षणिक जानकारी",
            addressTitle: "पता जानकारी",
            firstNameLabel: "पहला नाम",
            middleNameLabel: "मध्य नाम",
            lastNameLabel: "अंतिम नाम",
            genderLabel: "लिंग",
            dobLabel: "जन्म तिथि",
            ageLabel: "आयु",
            currentYearLabel: "वर्तमान वर्ष",
            branchLabel: "शाखा",
            courseLabel: "पाठ्यक्रम",
            sectionLabel: "अनुभाग",
            contactLabel: "संपर्क नंबर",
            rollnoLabel: "विश्वविद्यालय रोल नंबर",
            cpiLabel: "सीपीआई",
            stateLabel: "राज्य",
            cityLabel: "शहर",
            pincodeLabel: "पिन कोड",
            emailLabel: "ईमेल पता",
            emailHint: "केवल @gmail.com और @outlook.com डोमेन की अनुमति है",
            sendOtp: "OTP भेजें",
            verifyOtp: "OTP सत्यापित करें",
            enterOtp: "OTP दर्ज करें",
            nextToAcademic: "शैक्षणिक पर जारी रखें",
            nextToAddress: "पते पर जारी रखें",
            back: "वापस",
            completeRegistration: "पंजीकरण पूरा करें",
            footerNote: "इस फॉर्म को सबमिट करके, आप हमारे नियमों और शर्तों से सहमत होते हैं।",
            statusCurrent: "वर्तमान",
            statusLocked: "लॉक",
            statusCompleted: "पूर्ण",
            //
            // ======================================================
            // ========= 🚨 MODIFIED BLOCK STARTS HERE 🚨 =========
            // ======================================================
            //
            ageWarning: '<i class="fas fa-exclamation-triangle"></i> छात्र की आयु 16 से 32 वर्ष के बीच होनी चाहिए',
            ageBlocked: '<i class="fas fa-ban"></i> पंजीकरण के लिए छात्र की आयु 16 से 32 वर्ष के बीच होनी चाहिए',
            emailDuplicate: '<i class="fas fa-times-circle"></i> यह ईमेल पहले से पंजीकृत है',
            emailAvailable: '<i class="fas fa-check-circle"></i> ईमेल उपलब्ध है',
            contactInvalid: '<i class="fas fa-times-circle"></i> कृपया एक वैध 10-अंकीय संपर्क नंबर दर्ज करें',
            contactValid: '<i class="fas fa-check-circle"></i> संपर्क नंबर वैध है',
            pincodeInvalid: '<i class="fas fa-times-circle"></i> कृपया एक वैध 6-अंकीय पिन कोड दर्ज करें',
            pincodeValid: '<i class="fas fa-check-circle"></i> पिन कोड वैध है',
            cpiInvalid: '<i class="fas fa-times-circle"></i> CPI 0 और 10 के बीच होना चाहिए',
            cpiValid: '<i class="fas fa-check-circle"></i> CPI मान्य है',
            rollnoInvalid: '<i class="fas fa-times-circle"></i> रोल नंबर बिल्कुल 10 अंकों का होना चाहिए',
            rollnoValid: '<i class="fas fa-check-circle"></i> रोल नंबर प्रारूप वैध है',
            rollnoDuplicate: '<i class="fas fa-times-circle"></i> रोल नंबर पहले से पंजीकृत है',
            rollnoAvailable: '<i class="fas fa-check-circle"></i> रोल नंबर उपलब्ध है',
            //
            // ======================================================
            // ========= 🚨 MODIFIED BLOCK ENDS HERE 🚨 ===========
            // ======================================================
            //
            botCheck: "कृपया पुनः प्रयास करने से पहले प्रतीक्षा करें।",
            termsRequired: "पंजीकरण के लिए आपको नियम और शर्तें स्वीकार करनी होंगी।",
            nameInvalidLength: "नाम कम से कम 2 अक्षर का होना चाहिए।",
            nameInvalidChars: "नाम में केवल अक्षर और स्थान होने चाहिए।",
            sidebarPersonal: "व्यक्तिगत जानकारी",
            sidebarAcademic: "शैक्षणिक जानकारी",
            sidebarAddress: "पता और सत्यापन"
        }
    };

    // ======================================================
    // STATE AND GLOBAL ELEMENTS
    // ======================================================
    let currentLanguage = 'en';
    let emailVerified = false; // Tracks if email OTP is verified
    let otpSent = false;
    let emailCheckTimeout;
    let lastOtpClick = 0; // For bot detection

    // Form elements
    const registrationForm = document.getElementById('registrationForm');
    const submitBtn = document.getElementById('submit-form');
    const termsCheckbox = document.getElementById('terms-checkbox');

    // OTP elements
    const emailInput = document.getElementById('email');
    const sendOtpBtn = document.getElementById('send-otp');
    const verifyOtpBtn = document.getElementById('verify-otp');
    const verificationCodeInput = document.getElementById('verificationCode');
    const verificationStatus = document.getElementById('verification-status');
    const otpSection = document.getElementById('otp-section');
    const emailHint = document.getElementById('email-hint');
    
    // Language buttons
    const langEnBtn = document.querySelector('.lang-btn[data-lang="en"]');
    const langHiBtn = document.querySelector('.lang-btn[data-lang="hi"]');


    // ======================================================
    // NEW: Function to control the submit button state
    // ======================================================
    function updateSubmitButtonState() {
        // This function now ALSO calls the address progress bar update.
        
        // We get all required fields for the final step
        const pincode = document.getElementById("pincode");
        const state = document.getElementById("state");
        const city = document.getElementById("city");

        // Check for full form completion
        const allAddressFieldsValid = emailVerified &&
                                      termsCheckbox.checked &&
                                      pincode.value.length === 6 &&
                                      state.value.trim() !== '' &&
                                      city.value.trim() !== '';

        if (allAddressFieldsValid) {
            submitBtn.disabled = false;
            console.log('Submit button enabled');
        } else {
            submitBtn.disabled = true;
            console.log(`Submit button disabled (Email: ${emailVerified}, Terms: ${termsCheckbox.checked}, Pincode: ${pincode.value.length === 6}, State: ${state.value.trim() !== ''}, City: ${city.value.trim() !== ''})`);
        }
        
        // Call the address progress update function whenever state changes
        if (window.updateAddressSectionState) {
            window.updateAddressSectionState();
        }
    }

    // ======================================================
    // BROUGHT BACK STATE/CITY MAP FOR HYBRID FUNCTIONALITY
    // ======================================================
    const stateCityMap = {
        "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
        "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
        "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum"],
        "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"],
        "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
        "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Allahabad", "Mathura"],
        "Andaman and Nicobar Islands": [], "Andhra Pradesh": [], "Arunachal Pradesh": [],
        "Assam": [], "Bihar": [], "Chandigarh": [], "Chhattisgarh": [],
        "Dadra and Nagar Haveli and Daman and Diu": [], "Goa": [], "Gujarat": [],
        "Haryana": [], "Himachal Pradesh": [], "Jammu and Kashmir": [], "Jharkhand": [],
        "Kerala": [], "Ladakh": [], "Lakshadweep": [], "Madhya Pradesh": [],
        "Manipur": [], "Meghalaya": [], "Mizoram": [], "Nagaland": [], "Odisha": [],
        "Puducherry": [], "Punjab": [], "Rajasthan": [], "Sikkim": [], "Telangana": [],
        "Tripura": [], "Uttarakhand": []
    };


    // Section options (A to Z, then AA to AF)
    const sections = [];
    for (let i = 65; i <= 90; i++) {
        sections.push(String.fromCharCode(i));
    }
    for (let i = 65; i <= 70; i++) {
        sections.push('A' + String.fromCharCode(i));
    }

    // Populate section dropdown
    const sectionSelect = document.getElementById('section');
    if (sectionSelect) {
        sections.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            sectionSelect.appendChild(option);
        });
    }

    /**
     * NEW: Helper function to convert string to Title Case
     */
    function toTitleCase(str) {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }

    // Calculate age based on date of birth
    // MODIFIED: This function now correctly finds and fills the ageInput.
    function calculateAge(dobString) {
        const dob = new Date(dobString);
        const today = new Date();
        const ageInput = document.getElementById('age'); // Find the age input

        // Check if the date is valid
        if (isNaN(dob.getTime())) {
            console.error("Invalid date selected");
            if (ageInput) ageInput.value = ''; // Clear age field
            return '';
        }

        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();

        // Adjust age if birthday hasn't occurred this year yet
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        if (ageInput) ageInput.value = age; // Fill the age field
        return age;
    }

    // ==================== REAL-TIME ROLL NUMBER VALIDATION (UPDATED) ====================
    function setupRollNumberValidation() {
        const rollNoInput = document.getElementById('rollNo');

        if (!rollNoInput) {
            console.error('❌ Roll number input not found!');
            return;
        }

        console.log('✅ Setting up roll number validation...');

        // Create roll number status element
        const rollNoStatus = document.createElement('div');
        rollNoStatus.className = 'rollno-status';
        rollNoStatus.style.cssText = `
        margin-top: 8px;
        font-size: 14px;
        padding: 6px 10px;
        border-radius: 4px;
        display: none;
    `;

        // Insert after roll number input
        const rollNoContainer = rollNoInput.closest('.form-group');
        if (rollNoContainer) {
            rollNoContainer.appendChild(rollNoStatus);
            console.log('✅ Roll number status element added');
        } else {
            console.error('❌ Could not find roll number container');
            rollNoInput.parentNode.appendChild(rollNoStatus);
        }

        let rollNoCheckTimeout;

        async function validateRollNumber(rollNo) {
            // Clean input (only allow digits)
            const cleanedRollNo = rollNo.replace(/\D/g, '');
            rollNoInput.value = cleanedRollNo; // Update the input field

            if (!cleanedRollNo) {
                rollNoStatus.style.display = 'none';
                rollNoInput.style.borderColor = '';
                rollNoInput.dataset.valid = "false";
                // Notify academic state updater
                if (window.updateAcademicSectionState) window.updateAcademicSectionState();
                return;
            }

            // Check length (must be 10 digits)
            if (cleanedRollNo.length !== 10) {
                rollNoStatus.innerHTML = languageTexts[currentLanguage].rollnoInvalid;
                rollNoStatus.style.cssText =
                    "background:#ffebee;border:1px solid #f44336;color:#d32f2f;display:block";
                rollNoInput.style.borderColor = "#f44336";
                rollNoInput.dataset.valid = "false";
                
                // If length is 10, proceed to check duplication
                if (cleanedRollNo.length > 10) {
                     rollNoInput.value = cleanedRollNo.substring(0, 10); // Trim
                } else {
                     // Notify academic state updater
                    if (window.updateAcademicSectionState) window.updateAcademicSectionState();
                    return; // Don't check API if not 10 digits
                }
            }
            
            // At this point, rollNo is exactly 10 digits. Show checking status.
            const checkingText = currentLanguage === 'en' ? 'Checking roll number availability...' : 'रोल नंबर उपलब्धता जांची जा रही है...';
            rollNoStatus.innerHTML = `<i class="fas fa-spinner"></i> ${checkingText}`;
            rollNoStatus.style.cssText = 'background-color: #fff3e0; border: 1px solid #ff9800; color: #ef6c00; display: block;';
            rollNoInput.style.borderColor = '#ff9800';

            try {
                console.log('🔍 Checking roll number:', cleanedRollNo);

                const response = await fetch('/api/validate-field', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        field: 'rollNo',
                        value: cleanedRollNo
                    })
                });

                const result = await response.json();
                console.log('📊 Roll number validation result:', result);

                if (result.valid) {
                    // ✅ Roll number not registered
                    rollNoStatus.innerHTML = languageTexts[currentLanguage].rollnoAvailable;
                    rollNoStatus.style.cssText =
                        "background:#e8f5e8;border:1px solid #4caf50;color:#2e7d32;display:block";
                    rollNoInput.style.borderColor = "#4caf50";
                    rollNoInput.dataset.valid = "true";   // <-- IMPORTANT FLAG
                } else {
                    // ❌ Already registered
                    rollNoStatus.innerHTML = languageTexts[currentLanguage].rollnoDuplicate;
                    rollNoStatus.style.cssText =
                        "background:#ffebee;border:1px solid #f44336;color:#d32f2f;display:block";
                    rollNoInput.style.borderColor = "#f44336";
                    rollNoInput.dataset.valid = "false";  // <-- IMPORTANT FLAG
                }

            } catch (error) {
                console.error('❌ Roll number check error:', error);
                // FIX 1: Reverted to original user code. No user-facing network error.
                rollNoStatus.style.display = 'none';
                rollNoInput.style.borderColor = '#ff9800';
                rollNoInput.dataset.valid = "false"; // Assume invalid on network error
            }
            
            // Notify academic state updater
            if (window.updateAcademicSectionState) window.updateAcademicSectionState();
        }

        rollNoInput.addEventListener('input', function () {
            const rollNo = this.value;

            // Clear previous timeout
            if (rollNoCheckTimeout) {
                clearTimeout(rollNoCheckTimeout);
            }

            // Hide status when empty
            if (!rollNo) {
                rollNoStatus.style.display = 'none';
                rollNoInput.style.borderColor = '';
                rollNoInput.dataset.valid = "false";
                // Notify academic state updater
                if (window.updateAcademicSectionState) window.updateAcademicSectionState();
                return;
            }

            // Debounce the API call
            rollNoCheckTimeout = setTimeout(() => {
                validateRollNumber(rollNo);
            }, 800);
        });

        rollNoInput.addEventListener('blur', function () {
            validateRollNumber(this.value);
        });

        // Validate on page load if there's already a value
        setTimeout(() => {
            if (rollNoInput.value) {
                validateRollNumber(rollNoInput.value);
            }
        }, 100);

        console.log('✅ Roll number validation setup complete');
    }

    // ==================== CHECK IF AGE IS VALID ====================
    // MODIFIED: Updated to check for 16-32 range
    function isAgeValid() {
        const dobInput = document.getElementById('dob');
        if (!dobInput || !dobInput.value) return false;

        const age = calculateAge(dobInput.value);
        return age >= 16 && age <= 32;
    }

    // ==================== EMAIL DUPLICATION CHECK WITH OTP FLOW ====================
    
    // Helper function to reset OTP/Email state
    function resetVerificationState() {
        emailVerified = false;
        otpSent = false;
        
        if (otpSection) otpSection.classList.remove('active');

        if (verificationStatus) {
            verificationStatus.innerHTML = '';
            verificationStatus.className = 'verification-status';
        }
        
        if (verificationCodeInput) {
             verificationCodeInput.value = '';
             verificationCodeInput.disabled = false;
        }

        if (sendOtpBtn) {
            sendOtpBtn.disabled = true; // Disabled until email is valid
            sendOtpBtn.textContent = languageTexts[currentLanguage].sendOtp;
        }

        if (verifyOtpBtn) {
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.textContent = languageTexts[currentLanguage].verifyOtp;
        }
        
        if (window.otpCountdownInterval) {
            clearInterval(window.otpCountdownInterval);
        }

        // MODIFICATION: Update submit button state on reset
        updateSubmitButtonState();
    }


    function setupEmailDuplicationCheck() {
        if (!emailInput || !sendOtpBtn) return;

        // Create email status element
        const emailStatus = document.createElement('div');
        emailStatus.className = 'email-status';
        emailStatus.style.cssText = `
        margin-top: 8px;
        font-size: 14px;
        padding: 6px 10px;
        border-radius: 4px;
        display: none;
    `;

        // Insert after email input container
        const emailContainer = document.querySelector('.email-input-container');
        if (emailContainer && emailContainer.parentNode) {
            emailContainer.parentNode.insertBefore(emailStatus, emailContainer.nextSibling);
        }

        async function checkEmailDuplication(email) {
            if (!isValidEmail(email)) {
                emailStatus.style.display = 'none';
                sendOtpBtn.disabled = true;
                return;
            }

            // Show checking status
            const checkingText = currentLanguage === 'en' ? 'Checking email availability...' : 'ईमेल उपलब्धता जांची जा रही है...';
            emailStatus.innerHTML = `<i class="fas fa-spinner"></i> ${checkingText}`;
            emailStatus.style.cssText += 'background-color: #fff3e0; border: 1px solid #ff9800; color: #ef6c00; display: block;';
            emailStatus.style.display = 'block';
            
            if (emailHint) emailHint.style.display = 'none';

            try {
                // Call API to check email duplication
                const response = await fetch('/api/validate-field', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        field: 'email',
                        value: email
                    })
                });

                const result = await response.json();

                if (result.success) {
                    if (result.valid) {
                        // Email is available (not registered)
                        emailStatus.innerHTML = languageTexts[currentLanguage].emailAvailable;
                        emailStatus.style.cssText += 'background-color: #e8f5e8; border: 1px solid #4caf50; color: #2e7d32; display: block;';
                        sendOtpBtn.disabled = false;
                    } else {
                        // Email is already registered
                        emailStatus.innerHTML = languageTexts[currentLanguage].emailDuplicate;
                        emailStatus.style.cssText += 'background-color: #ffebee; border: 1px solid #f44336; color: #d32f2f; display: block;';
                        sendOtpBtn.disabled = true; // Disable OTP button
                    }
                } else {
                    emailStatus.style.display = 'none';
                    sendOtpBtn.disabled = true; // Disable on error
                }
            } catch (error) {
                console.error('Email check error:', error);
                emailStatus.style.display = 'none';
                sendOtpBtn.disabled = true; // Disable on error
            }
        }

        emailInput.addEventListener('input', function () {
            // Reset verification status on email change
            resetVerificationState();
            
            const email = this.value.trim();

            // Clear previous timeout
            if (emailCheckTimeout) {
                clearTimeout(emailCheckTimeout);
            }
            
            // Reset email hint and status
            emailStatus.style.display = 'none';
            if (emailHint) emailHint.style.display = 'none'; // Hide by default

            // Hide status when email is empty
            if (!email) {
                sendOtpBtn.disabled = true;
                return;
            }

            // Validate email format first
            if (!isValidEmail(email)) {
                sendOtpBtn.disabled = true;
                if (emailHint) {
                    const errorText = currentLanguage === 'en'
                        ? 'Only @gmail.com and @outlook.com domains are allowed'
                        : 'केवल @gmail.com और @outlook.com डोमेन की अनुमति है';
                    emailHint.innerHTML = `<i class="fas fa-times-circle"></i> ${errorText}`;
                    emailHint.className = 'verification-status verification-error';
                    emailHint.style.display = 'block'; // Show error
                }
                return;
            }

            // Debounce the API call
            emailCheckTimeout = setTimeout(() => {
                checkEmailDuplication(email);
            }, 800);
        });
        
        // Show default hint on focus if empty
        emailInput.addEventListener('focus', function() {
            if(emailInput.value.length === 0 && emailHint.style.display === 'none') {
                 if (emailHint) {
                    emailHint.textContent = languageTexts[currentLanguage].emailHint;
                    emailHint.className = 'verification-status verification-pending';
                    emailHint.style.display = 'block';
                }
            }
        });

        // Also check when user focuses out
        emailInput.addEventListener('blur', function () {
            const email = this.value.trim();
            if (email && isValidEmail(email)) {
                checkEmailDuplication(email);
            }
        });
    }
    // ==================== REAL-TIME CONTACT NUMBER VALIDATION ====================
    function setupContactNumberValidation() {
        const contactInput = document.getElementById("contactNumber");

        if (!contactInput) return;

        const contactStatus = document.createElement("div");
        contactStatus.className = "contact-status";
        contactStatus.style.cssText = `
        margin-top: 8px;
        font-size: 14px;
        padding: 6px 10px;
        border-radius: 4px;
        display: none;
    `;
        contactInput.parentNode.appendChild(contactStatus);

        function validateContact(contact) {
            const cleaned = contact.replace(/\D/g, "");   // remove anything except digits
            contactInput.value = cleaned;                // overwrite input with cleaned version

            // Empty input
            if (!cleaned) {
                contactStatus.style.display = "none";
                contactInput.style.borderColor = "";
                return false;
            }

            // Show invalid message while typing
            if (cleaned.length < 10) {
                contactStatus.innerHTML = languageTexts[currentLanguage].contactInvalid;
                contactStatus.style.cssText =
                    "background:#ffebee;border:1px solid #f44336;color:#c62828;display:block";
                contactInput.style.borderColor = "#f44336";
                return false;
            }

            // Must start with 6/7/8/9
            if (!/^[6-9]/.test(cleaned)) {
                contactStatus.innerHTML = '<i class="fas fa-times-circle"></i> Must start with 6, 7, 8, or 9';
                contactStatus.style.cssText =
                    "background:#ffebee;border:1px solid #f44336;color:#c62828;display:block";
                contactInput.style.borderColor = "#f44336";
                return false;
            }
            
            // Trim if more than 10 digits
             if (cleaned.length > 10) {
                contactInput.value = cleaned.substring(0, 10);
            }

            // ✅ Valid number
            contactStatus.innerHTML = languageTexts[currentLanguage].contactValid;
            contactStatus.style.cssText =
                "background:#e8f5e8;border:1px solid #4caf50;color:#2e7d32;display:block";
            contactInput.style.borderColor = "#4caf50";

            return true;
        }
        
        // Add listeners and link to academic state update
        contactInput.addEventListener("input", () => {
             validateContact(contactInput.value);
             if (window.updateAcademicSectionState) window.updateAcademicSectionState();
        });
        contactInput.addEventListener("blur", () => {
            validateContact(contactInput.value);
            if (window.updateAcademicSectionState) window.updateAcademicSectionState();
        });
    }

    // ==================== ADDRESS DATALIST LOGIC ====================
    function setupStateCityDatalist() {
        const stateInput = document.getElementById("state");
        const cityDatalist = document.getElementById("city-list");
        const cityInput = document.getElementById("city"); // Get city input

        if (!stateInput || !cityDatalist) return;

        stateInput.addEventListener('input', function() {
            const enteredState = this.value;
            cityDatalist.innerHTML = ''; // Clear previous city options

            // Find a matching state in the map
            const matchedState = Object.keys(stateCityMap).find(state => 
                state.toLowerCase() === enteredState.toLowerCase()
            );

            if (matchedState && stateCityMap[matchedState].length > 0) {
                stateCityMap[matchedState].forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    cityDatalist.appendChild(option);
                });
            }
            
            // Notify the address progress bar to update
            if (window.updateAddressSectionState) window.updateAddressSectionState();
        });
        
        // Add listener for city input
        if (cityInput) {
             cityInput.addEventListener('input', () => {
                if (window.updateAddressSectionState) window.updateAddressSectionState();
             });
        }
    }

    // ==================== REAL-TIME PINCODE VALIDATION ====================
    function setupPincodeValidation() {
        const pincodeInput = document.getElementById("pincode");
        const stateInput = document.getElementById("state"); // <-- CHANGED
        const cityInput = document.getElementById("city");

        if (!pincodeInput) return;

        const pincodeStatus = document.createElement("div");
        pincodeStatus.className = "pincode-status";
        pincodeStatus.style.cssText = `
        margin-top: 8px;
        font-size: 14px;
        padding: 6px 10px;
        border-radius: 4px;
        display: none;
    `;
        pincodeInput.parentNode.appendChild(pincodeStatus);
        
        let pincodeTimeout;

        async function fetchPincodeDetails(pincode) {
            pincodeStatus.innerHTML = '<i class="fas fa-spinner"></i> Fetching location...';
            pincodeStatus.style.cssText = "background:#fff3e0;border:1px solid #ff9800;color:#ef6c00;display:block";
            pincodeInput.style.borderColor = '#ff9800';
            
            pincodeInput.dataset.valid = "false"; // Assume invalid while fetching

            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
                const data = await response.json();

                if (data[0].Status === "Success") {
                    const office = data[0].PostOffice[0]; // using first result
                    const detectedState = office.State;
                    const detectedCity = office.District;
                    
                    // Find the state value from the datalist
                    const stateOption = Array.from(document.getElementById('state-list').options).find(opt => 
                        opt.value.toLowerCase() === detectedState.toLowerCase()
                    );
                    
                    if (stateOption) {
                        stateInput.value = stateOption.value; // Set the input value
                        cityInput.value = detectedCity; // Set the city input value
                        
                        // Manually trigger input event on state to populate city datalist
                        stateInput.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        pincodeStatus.innerHTML = `<i class="fas fa-check-circle"></i> Auto-filled: ${detectedCity}, ${detectedState}`;
                        pincodeStatus.style.cssText = "background:#e8f5e8;border:1px solid #4caf50;color:#2e7d32;display:block";
                        pincodeInput.style.borderColor = '#4caf50';
                        cityInput.style.borderColor = '#4caf50';
                        stateInput.style.borderColor = '#4caf50';
                        pincodeInput.dataset.valid = "true"; // Mark as valid
                        
                    } else {
                        // Fallback if state not in our list (e.g., "Dadra and Nagar Haveli")
                        stateInput.value = detectedState;
                        cityInput.value = detectedCity;
                        pincodeStatus.innerHTML = `<i class="fas fa-check-circle"></i> Auto-filled: ${detectedCity}, ${detectedState}`;
                        pincodeStatus.style.cssText = "background:#e8f5e8;border:1px solid #4caf50;color:#2e7d32;display:block";
                        pincodeInput.style.borderColor = '#4caf50';
                        pincodeInput.dataset.valid = "true"; // Mark as valid
                    }

                } else {
                    pincodeStatus.innerHTML = languageTexts[currentLanguage].pincodeInvalid;
                    pincodeStatus.style.cssText = "background:#ffebee;border:1px solid #f44336;color:#d32f2f;display:block";
                    pincodeInput.style.borderColor = '#f44336';
                    pincodeInput.dataset.valid = "false";
                }

            } catch (error) {
                pincodeStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Unable to fetch location';
                pincodeStatus.style.cssText = "background:#fff3e0;border:1px solid #ff9800;color:#ef6c00;display:block";
                pincodeInput.style.borderColor = '#ff9800';
                pincodeInput.dataset.valid = "false";
            }
            
            // Notify the address progress bar to update AFTER fetch
            if (window.updateAddressSectionState) window.updateAddressSectionState();
        }

        pincodeInput.addEventListener("input", function () {
            const pincode = this.value.replace(/\D/g, ""); // Remove non-digits
            this.value = pincode;
            
            clearTimeout(pincodeTimeout);
            pincodeInput.dataset.valid = "false"; // Invalid while typing
            
            if (pincode.length === 0) {
                 pincodeStatus.style.display = "none";
                 pincodeInput.style.borderColor = '';
                 if (window.updateAddressSectionState) window.updateAddressSectionState();
                 return;
            }

            // Show invalid message while typing
            if (pincode.length < 6) {
                pincodeStatus.innerHTML = languageTexts[currentLanguage].pincodeInvalid;
                pincodeStatus.style.cssText = "background:#ffebee;border:1px solid #f44336;color:#d32f2f;display:block";
                pincodeInput.style.borderColor = '#f44336';
                if (window.updateAddressSectionState) window.updateAddressSectionState();
                return;
            }

            // Only fetch if pincode is 6 digits
            if (pincode.length === 6) {
                 pincodeInput.dataset.valid = "true"; // Tentatively valid
                 pincodeTimeout = setTimeout(() => fetchPincodeDetails(pincode), 500);
            }
            
            if (window.updateAddressSectionState) window.updateAddressSectionState();
        });
    }
    
    // ==================== REAL-TIME CPI VALIDATION ====================
    function setupCpiValidation() {
        const cpiInput = document.getElementById("cpi");
        if (!cpiInput) return;

        // Change input type to text to allow for better manual validation
        cpiInput.type = "text";

        const cpiStatus = document.createElement("div");
        cpiStatus.className = "cpi-status";
        cpiStatus.style.cssText = `
        margin-top: 8px;
        font-size: 14px;
        padding: 6px 10px;
        border-radius: 4px;
        display: none;
    `;
        cpiInput.parentNode.appendChild(cpiStatus);
        
        function validateCpi(value) {
            // Allow only numbers and one decimal
            value = value.replace(/[^\d.]/g, ''); 
            
            // Prevent multiple decimals
            const parts = value.split('.');
            if (parts.length > 2) {
                value = `${parts[0]}.${parts.slice(1).join('')}`;
            }

            // Restrict to 2 decimal places
            if (parts[1] && parts[1].length > 2) {
                value = `${parts[0]}.${parts[1].substring(0, 2)}`;
            }
            
            cpiInput.value = value;
            const cpiValue = parseFloat(value);

            if (value === '') {
                cpiStatus.style.display = "none";
                cpiInput.style.borderColor = '';
                return false;
            }

            // Check range
            if (isNaN(cpiValue) || cpiValue < 0 || cpiValue > 10) {
                cpiStatus.innerHTML = languageTexts[currentLanguage].cpiInvalid;
                cpiStatus.style.cssText = "background:#ffebee;border:1px solid #f44336;color:#d32f2f;display:block";
                cpiInput.style.borderColor = '#f44336';
                return false;
            } else {
                cpiStatus.innerHTML = languageTexts[currentLanguage].cpiValid;
                cpiStatus.style.cssText = "background:#e8f5e8;border:1px solid #4caf50;color:#2e7d32;display:block";
                cpiInput.style.borderColor = '#4caf50';
                return true;
            }
        }

        cpiInput.addEventListener("input", () => {
             validateCpi(cpiInput.value);
             if (window.updateAcademicSectionState) window.updateAcademicSectionState();
        });
        
         cpiInput.addEventListener("blur", () => {
             validateCpi(cpiInput.value);
             if (window.updateAcademicSectionState) window.updateAcademicSectionState();
        });
    }


    // Language switcher functionality
    // MODIFIED: Added sidebar text element IDs
    function switchLanguage(lang) {
        currentLanguage = lang;
        const texts = languageTexts[lang];

        // Update all text elements
        const elementsToUpdate = {
            'subtitle': texts.subtitle,
            'personal-title': texts.personalTitle,
            'academic-title': texts.academicTitle,
            'address-title': texts.addressTitle,
            'middle-name-label': texts.middleNameLabel,
            'age-label': texts.ageLabel,
            'email-hint': texts.emailHint,
            'terms-label': null, // Special handling for terms label
            // NEW: Sidebar text elements
            'sidebar-personal-text': texts.sidebarPersonal,
            'sidebar-academic-text': texts.sidebarAcademic,
            'sidebar-address-text': texts.sidebarAddress
        };

        // Update simple text elements
        Object.keys(elementsToUpdate).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'terms-label') {
                    // MODIFICATION: Rebuild terms label with links
                    element.innerHTML = `
                        ${lang === 'en' ? 'I agree to the' : 'मैं'}
                        <a href="#" id="terms-link" class="terms-link">${lang === 'en' ? 'Terms and Conditions' : 'नियम और शर्तें'}</a> 
                        ${lang === 'en' ? 'and' : 'और'} 
                        <a href="#" id="privacy-link" class="terms-link">${lang === 'en' ? 'Privacy Policy' : 'गोपनीयता नीति'}</a>.
                    `;
                    // Re-attach listeners since we overwrote the HTML
                    setupModalListeners();
                } else if (id === 'email-hint') {
                    // Email hint must use innerHTML now if it contains an icon
                    if (element.style.display !== 'none') { // Only update if visible
                         element.innerHTML = texts.emailHint;
                    }
                }
                else {
                    element.textContent = elementsToUpdate[id];
                }
            }
        });

        // Update progress text
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            // Find the span *inside* the progress text
            const progressPercentSpan = document.getElementById('progress-percent');
            const currentPercent = progressPercentSpan ? progressPercentSpan.textContent : '0%';
            progressText.innerHTML = `${texts.progressText} <span id="progress-percent">${currentPercent}</span>`;
        }


        // Update labels with required markers
        const labelUpdates = {
            'first-name-label': texts.firstNameLabel,
            'last-name-label': texts.lastNameLabel,
            'gender-label': texts.genderLabel,
            'dob-label': texts.dobLabel,
            'current-year-label': texts.currentYearLabel,
            'branch-label': texts.branchLabel,
            'course-label': texts.courseLabel,
            'section-label': texts.sectionLabel,
            'contact-label': texts.contactLabel,
            'rollno-label': texts.rollnoLabel,
            'cpi-label': texts.cpiLabel,
            'state-label': texts.stateLabel,
            'city-label': texts.cityLabel,
            'pincode-label': texts.pincodeLabel,
            'email-label': texts.emailLabel
        };

        Object.keys(labelUpdates).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Preserve the required marker
                const isRequired = element.classList.contains('required');
                element.innerHTML = `${labelUpdates[id]} ${isRequired ? '<span class="required">*</span>' : ''}`;
            }
        });

        // Update buttons and inputs
        const buttonUpdates = {
            'send-otp': texts.sendOtp,
            'verify-otp': texts.verifyOtp,
            'next-to-academic': texts.nextToAcademic,
            'next-to-address': texts.nextToAddress,
            'back-to-personal': texts.back,
            'back-to-academic': texts.back,
            'submit-form': texts.completeRegistration
        };

        Object.keys(buttonUpdates).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = buttonUpdates[id];
        });

        // Update OTP input placeholder
        if (verificationCodeInput) verificationCodeInput.placeholder = texts.enterOtp;

        // Update status texts
        const personalStatus = document.getElementById('personal-status');
        const academicStatus = document.getElementById('academic-status');
        const addressStatus = document.getElementById('address-status');

        if (personalStatus && personalStatus.textContent !== texts.statusCompleted) personalStatus.textContent = texts.statusCurrent;
        if (academicStatus && academicStatus.textContent !== texts.statusCompleted) academicStatus.textContent = texts.statusLocked;
        if (addressStatus && addressStatus.textContent !== texts.statusCompleted) addressStatus.textContent = texts.statusLocked;

        // Update active language button
        if (lang === 'en') {
            if (langEnBtn) langEnBtn.classList.add('active');
            if (langHiBtn) langHiBtn.classList.remove('active');
        } else {
            if (langHiBtn) langHiBtn.classList.add('active');
            if (langEnBtn) langEnBtn.classList.remove('active');
        }
        
        // NEW: Re-run validation functions to update error message language
        if (window.updatePersonalSectionState) {
            window.updatePersonalSectionState();
        }
         // NEW: Re-run academic validation
        if (window.updateAcademicSectionState) {
            window.updateAcademicSectionState();
        }
        // Re-run address validation
        if (window.updateAddressSectionState) {
            window.updateAddressSectionState();
        }
    }
    
    // NEW: Make switchLanguage globally accessible for the header button
    // This connects the header script to this app.js script
    window.setRegistrationLanguage = switchLanguage;

    if (langEnBtn) langEnBtn.addEventListener('click', () => {
        if(window.setLanguage) window.setLanguage('en'); // Call header script
        else switchLanguage('en'); // Fallback
    });
    if (langHiBtn) langHiBtn.addEventListener('click', () => {
        if(window.setLanguage) window.setLanguage('hi'); // Call header script
        else switchLanguage('hi'); // Fallback
    });


    // Section Navigation Logic
    const personalSection = document.getElementById('personal-section');
    const academicSection = document.getElementById('academic-section');
    const addressSection = document.getElementById('address-section');

    const personalStatus = document.getElementById('personal-status');
    const academicStatus = document.getElementById('academic-status');
    const addressStatus = document.getElementById('address-status');

    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    
    // Sidebar Links
    const sidebarPersonal = document.getElementById('sidebar-personal');
    const sidebarAcademic = document.getElementById('sidebar-academic');
    const sidebarAddress = document.getElementById('sidebar-address');

    // Update progress bar
    // MODIFIED: This function is now a generic setter
    function updateProgress(progressPercentage) {
        if (progressBar && progressPercent) {
            progressBar.style.width = `${progressPercentage}%`;
            
            // Find the progress-percent span *inside* progress-text
            const progressPercentSpan = document.getElementById('progress-percent');
            if(progressPercentSpan) {
                progressPercentSpan.textContent = `${Math.round(progressPercentage)}%`;
            }
        }
    }

    // Check if personal section is complete (YOUR ORIGINAL FUNCTION)
    // NOTE: This is now a "failsafe" check. The real-time validation is primary.
    function isPersonalSectionComplete() {
        if (!personalSection) return false;

        const requiredFields = personalSection.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                // Highlight empty required fields
                field.style.borderColor = '#f44336';
            } else {
                // Only reset border if it's not already valid green
                if(field.style.borderColor !== 'rgb(76, 175, 80)' && field.style.borderColor !== 'rgb(255, 152, 0)') {
                   field.style.borderColor = '';
                }
            }
        });
        
        // NEW: Also check the 16-32 age validation
        if (!isAgeValid()) {
            isValid = false;
        }

        return isValid;
    }

    // Check if academic section is complete (YOUR ORIGINAL FUNCTION)
    function isAcademicSectionComplete() {
        if (!academicSection) return false;

        const requiredFields = academicSection.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = '#f44336';
            } else {
                 if(field.style.borderColor !== 'rgb(76, 175, 80)' && field.style.borderColor !== 'rgb(255, 152, 0)') {
                   field.style.borderColor = '';
                }
            }
        });
        
        // Check custom roll number validation
        const rollNoInput = document.getElementById('rollNo');
        if (rollNoInput && rollNoInput.dataset.valid !== "true") {
            isValid = false;
        }
        
        // Check contact number
        const contactInput = document.getElementById("contactNumber");
        if (contactInput.value.length !== 10 || !/^[6-9]/.test(contactInput.value)) {
            isValid = false;
        }
        
        // Check CPI
        const cpiInput = document.getElementById("cpi");
        const cpiValue = parseFloat(cpiInput.value);
        if (isNaN(cpiValue) || cpiValue < 0 || cpiValue > 10) {
            isValid = false;
        }

        return isValid;
    }


    // Navigate to Academic Section - WITH AGE VALIDATION
    const nextToAcademicBtn = document.getElementById('next-to-academic');
    if (nextToAcademicBtn) {
        nextToAcademicBtn.addEventListener('click', function () {
            
            // MODIFICATION: This check is now a failsafe.
            // The button should be disabled until validation passes.
            if (!isAgeValid()) {
                alert(languageTexts[currentLanguage].ageBlocked);
                return;
            }

            // This check is also a failsafe.
            if (isPersonalSectionComplete()) {
                if (personalSection) {
                    personalSection.classList.remove('active');
                    personalSection.classList.add('inactive');
                }
                if (personalStatus) {
                    personalStatus.textContent = languageTexts[currentLanguage].statusCompleted;
                    personalStatus.classList.add('completed');
                }

                if (academicSection) {
                    academicSection.classList.remove('locked');
                    academicSection.classList.add('active');
                }
                if (academicStatus) {
                    academicStatus.textContent = languageTexts[currentLanguage].statusCurrent;
                }
                
                // Update Sidebar
                if (sidebarPersonal) {
                    sidebarPersonal.classList.remove('active');
                    sidebarPersonal.classList.add('completed');
                }
                 if (sidebarAcademic) {
                    sidebarAcademic.classList.remove('locked');
                    sidebarAcademic.classList.add('active');
                }

                // NOTE: The progress bar is already updated by the
                // real-time validation, but we'll leave it as a failsafe
                // to ensure it shows 33% upon clicking.
                // updateProgress(1); // This is your old function, let's use the new one:
                updateProgress(100/3); // Set to 33%
                
                // NEW: Scroll to the top of the new section
                academicSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Run the academic validation check once
                // to update progress bar based on pre-filled content
                if(window.updateAcademicSectionState) {
                    window.updateAcademicSectionState();
                }

            } else {
                alert(currentLanguage === 'en'
                    ? 'Please complete all required fields in the Personal Information section before continuing.'
                    : 'कृपया जारी रखने से पहले व्यक्तिगत जानकारी अनुभाग में सभी आवश्यक फ़ील्ड भरें।');
            }
        });
    }

    // Navigate back to Personal Section
    const backToPersonalBtn = document.getElementById('back-to-personal');
    if (backToPersonalBtn) {
        backToPersonalBtn.addEventListener('click', function () {
            if (academicSection) {
                academicSection.classList.remove('active');
                academicSection.classList.add('locked');
            }
            if (academicStatus) {
                academicStatus.textContent = languageTexts[currentLanguage].statusLocked;
            }

            if (personalSection) {
                personalSection.classList.remove('inactive');
                personalSection.classList.add('active');
            }
            if (personalStatus) {
                personalStatus.textContent = languageTexts[currentLanguage].statusCurrent;
                personalStatus.classList.remove('completed');
            }
            
            // Update Sidebar
            if (sidebarPersonal) {
                sidebarPersonal.classList.add('active');
                sidebarPersonal.classList.remove('completed');
            }
             if (sidebarAcademic) {
                sidebarAcademic.classList.add('locked');
                sidebarAcademic.classList.remove('active');
            }

            // MODIFICATION: Re-run validation for personal section
            // This will recalculate progress and button state.
            if (window.updatePersonalSectionState) {
                window.updatePersonalSectionState();
            }
            
            // NEW: Scroll to the top
            personalSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Navigate to Address Section
    const nextToAddressBtn = document.getElementById('next-to-address');
    if (nextToAddressBtn) {
        nextToAddressBtn.addEventListener('click', function () {
            if (isAcademicSectionComplete()) {
                if (academicSection) {
                    academicSection.classList.remove('active');
                    academicSection.classList.add('inactive');
                }
                if (academicStatus) {
                    academicStatus.textContent = languageTexts[currentLanguage].statusCompleted;
                    academicStatus.classList.add('completed');
                }

                if (addressSection) {
                    addressSection.classList.remove('locked');
                    addressSection.classList.add('active');
                }
                if (addressStatus) {
                    addressStatus.textContent = languageTexts[currentLanguage].statusCurrent;
                }
                
                // Update Sidebar
                if (sidebarAcademic) {
                    sidebarAcademic.classList.remove('active');
                    sidebarAcademic.classList.add('completed');
                }
                 if (sidebarAddress) {
                    sidebarAddress.classList.remove('locked');
                    sidebarAddress.classList.add('active');
                }


                // TODO: The real-time progress for section 2 needs to be built
                // For now, we manually set it to 66%
                updateProgress(66.6);
                
                // NEW: Scroll to the top
                addressSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Run the address validation check once
                // to update progress bar based on pre-filled content
                if(window.updateAddressSectionState) {
                    window.updateAddressSectionState();
                }


            } else {
                alert(currentLanguage === 'en'
                    ? 'Please complete all required fields (and ensure roll number is valid) in the Academic Information section before continuing.'
                    : 'कृपया जारी रखने से पहले शैक्षणिक जानकारी अनुभाग में सभी आवश्यक फ़ील्ड भरें (और सुनिश्चित करें कि रोल नंबर मान्य है)।');
            }
        });
    }

    // Navigate back to Academic Section
    const backToAcademicBtn = document.getElementById('back-to-academic');
    if (backToAcademicBtn) {
        backToAcademicBtn.addEventListener('click', function () {
            if (addressSection) {
                addressSection.classList.remove('active');
                addressSection.classList.add('locked');
            }
            if (addressStatus) {
                addressStatus.textContent = languageTexts[currentLanguage].statusLocked;
            }

            if (academicSection) {
                academicSection.classList.remove('inactive');
                academicSection.classList.add('active');
            }
            if (academicStatus) {
                academicStatus.textContent = languageTexts[currentLanguage].statusCurrent;
                academicStatus.classList.remove('completed');
            }
            
             // Update Sidebar
            if (sidebarAcademic) {
                sidebarAcademic.classList.add('active');
                sidebarAcademic.classList.remove('completed');
            }
             if (sidebarAddress) {
                sidebarAddress.classList.add('locked');
                sidebarAddress.classList.remove('active');
            }

            // Re-run academic validation state
            if(window.updateAcademicSectionState) {
                window.updateAcademicSectionState();
            } else {
                updateProgress(33.3);
            }
            
            // NEW: Scroll to the top
            academicSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // OTP Verification Logic
    // (This section is unchanged from your original file)
    // ... (lines 940-1125) ...

    // Enhanced email validation function
    function isValidEmail(email) {
        const allowedDomains = ['@gmail.com', '@outlook.com'];
        return allowedDomains.some(domain => email.endsWith(domain));
    }

    // Send OTP function
    if (sendOtpBtn && emailInput) {
        sendOtpBtn.addEventListener('click', async function () {
            // Bot-check for rapid clicks
            const now = Date.now();
            if (now - lastOtpClick < 3000) { // 3 second cooldown
                 if (verificationStatus) {
                    verificationStatus.textContent = languageTexts[currentLanguage].botCheck;
                    verificationStatus.className = 'verification-status verification-error';
                }
                return;
            }
            lastOtpClick = now;

            const email = emailInput.value.trim();
            const firstName = document.getElementById('firstName');
            const userName = firstName && firstName.value.trim() ? firstName.value.trim() : 'User';

            if (!isValidEmail(email)) {
                if (verificationStatus) {
                    const errorText = currentLanguage === 'en'
                        ? 'Please enter a valid email address with @gmail.com or @outlook.com domain'
                        : 'कृपया @gmail.com या @outlook.com डोमेन के साथ एक वैध ईमेल पता दर्ज करें';
                    verificationStatus.innerHTML = `<i class="fas fa-times-circle"></i> ${errorText}`;
                    verificationStatus.className = 'verification-status verification-error';
                }
                return;
            }

            try {
                // Show loading state
                sendOtpBtn.disabled = true;
                sendOtpBtn.textContent = currentLanguage === 'en' ? 'Sending...' : 'भेजा जा रहा है...';

                const response = await fetch('/api/send-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        userName: userName
                    })
                });

                const result = await response.json();

                if (result.success) {
                    if (otpSection) otpSection.classList.add('active');
                    if (verificationStatus) {
                        const successText = currentLanguage === 'en'
                            ? 'OTP sent to your email. Please check your inbox.'
                            : 'OTP आपके ईमेल पर भेजा गया है। कृपया अपना इनबॉक्स जांचें।';
                        verificationStatus.innerHTML = `<i class="fas fa-paper-plane"></i> ${successText}`;
                        verificationStatus.className = 'verification-status verification-pending';
                    }
                    otpSent = true;
                    emailVerified = false; // Reset verification status
                    sendOtpBtn.textContent = currentLanguage === 'en' ? 'OTP Sent' : 'OTP भेजा गया';
                    startResendCountdown();
                } else {
                    throw new Error(result.message); // This will be "This email is already registered."
                }

            } catch (error) {
                console.error('Error sending OTP:', error);
                if (verificationStatus) {
                    verificationStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${error.message}`; // Show server error directly
                    verificationStatus.className = 'verification-status verification-error';
                }
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = languageTexts[currentLanguage].sendOtp;
                lastOtpClick = 0; // Reset bot-check timer on failure
            }
        });
    }

    // Verify OTP with API call
    if (verifyOtpBtn && verificationCodeInput) {
        verifyOtpBtn.addEventListener('click', async function () {
            if (!otpSent) {
                if (verificationStatus) {
                    const errorText = currentLanguage === 'en'
                        ? 'Please request an OTP first'
                        : 'कृपया पहले OTP का अनुरोध करें';
                    verificationStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errorText}`;
                    verificationStatus.className = 'verification-status verification-error';
                }
                return;
            }

            const email = emailInput ? emailInput.value.trim() : '';
            const enteredCode = verificationCodeInput.value.trim();

            if (enteredCode.length !== 6) {
                if (verificationStatus) {
                    const errorText = currentLanguage === 'en'
                        ? 'Please enter the 6-digit OTP'
                        : 'कृपया 6-अंकीय OTP दर्ज करें';
                    verificationStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errorText}`;
                    verificationStatus.className = 'verification-status verification-error';
                }
                return;
            }

            try {
                // Show loading state
                verifyOtpBtn.disabled = true;
                verifyOtpBtn.textContent = currentLanguage === 'en' ? 'Verifying...' : 'सत्यापित किया जा रहा है...';

                // Call backend API to verify OTP
                const response = await fetch('/api/verify-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        otp: enteredCode
                    })
                });

                const result = await response.json();

                if (result.success) {
                    if (verificationStatus) {
                        const successText = currentLanguage === 'en'
                            ? 'Email verified successfully!'
                            : 'ईमेल सफलतापूर्वक सत्यापित हो गया!';
                        verificationStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${successText}`;
                        verificationStatus.className = 'verification-status verification-success';
                    }
                    emailVerified = true;
                    verificationCodeInput.disabled = true;
                    verifyOtpBtn.disabled = true;
                    verifyOtpBtn.textContent = currentLanguage === 'en' ? 'Verified' : 'सत्यापित';
                    
                    // This is the fix for the red border bug
                    if (emailInput) {
                        emailInput.classList.remove('invalid-field');
                        emailInput.style.borderColor = '#4caf50'; // Set to success green
                    }
                    
                    if (window.otpCountdownInterval) clearInterval(window.otpCountdownInterval); // Stop countdown
                    sendOtpBtn.textContent = languageTexts[currentLanguage].sendOtp;
                    sendOtpBtn.disabled = true; // Disable resend after success
                    
                    // MODIFICATION: Update submit button state
                    updateSubmitButtonState();

                } else {
                    throw new Error(result.message);
                }

            } catch (error) {
                console.error('Error verifying OTP:', error);
                emailVerified = false; // Ensure verification is false on error
                if (verificationStatus) {
                    verificationStatus.innerHTML = `<i class="fas fa-times-circle"></i> ${error.message}`; // Show server error
                    verificationStatus.className = 'verification-status verification-error';
                }
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.textContent = languageTexts[currentLanguage].verifyOtp;
            }
        });
    }

    // Countdown function for resend OTP
    function startResendCountdown() {
        let countdown = 55;
        const countdownInterval = setInterval(() => {
            if (countdown > 0 && sendOtpBtn && !emailVerified) {
                sendOtpBtn.textContent = currentLanguage === 'en'
                    ? `Resend in ${countdown}s`
                    : `${countdown} सेकंड में पुनः भेजें`;
                sendOtpBtn.disabled = true;
                countdown--;
            } else {
                clearInterval(countdownInterval);
                if (sendOtpBtn && !emailVerified) {
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.textContent = languageTexts[currentLanguage].sendOtp;
                }
                otpSent = false;
            }
        }, 1000);
        window.otpCountdownInterval = countdownInterval;
    }
    
    // Form submission with registration API call
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. CRITICAL: CHECK MAINTENANCE AND TRANSACTION BLOCK
            if (typeof MaintenanceChecker !== 'undefined') {
                const isTransactionBlocked = await MaintenanceChecker.checkTransactionBlock();
                if (isTransactionBlocked) {
                    // The MaintenanceChecker is responsible for displaying the alert
                    console.warn('❌ Submission blocked by MaintenanceChecker.');
                    return; // Stop execution
                }
            } else {
                 console.warn('⚠️ MaintenanceChecker not loaded. Proceeding without client-side block.');
            }
            // --- END CRITICAL CHECK ---
            

            // ======================================================
            // MODIFICATION: Added Terms & Conditions Check
            // ======================================================
            if (!termsCheckbox.checked) {
                alert(languageTexts[currentLanguage].termsRequired);
                return;
            }

            // Check if all sections are complete
            if (isPersonalSectionComplete() && isAcademicSectionComplete()) {
                // Check if age is valid
                if (!isAgeValid()) {
                    alert(languageTexts[currentLanguage].ageBlocked);
                    return;
                }

                // Check if email is verified
                if (!emailVerified) {
                    alert(currentLanguage === 'en'
                        ? 'Please verify your email address before submitting the form.'
                        : 'कृपया फॉर्म सबमिट करने से पहले अपना ईमेल पता सत्यापित करें।');
                    return;
                }

                try {
                    // Show loading state
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = currentLanguage === 'en' ? 'Submitting...' : 'सबमिट किया जा रहा है...';
                    }
                    
                    // Set progress to 100% on submit
                    updateProgress(100);

                    // Collect form data
                    const formData = {
                        firstName: document.getElementById('firstName')?.value.trim() || '',
                        middleName: document.getElementById('middleName')?.value.trim() || '',
                        lastName: document.getElementById('lastName')?.value.trim() || '',
                        gender: document.getElementById('gender')?.value || '',
                        dob: document.getElementById('dob')?.value || '',
                        age: document.getElementById('age')?.value || '',
                        currentYear: document.getElementById('currentYear')?.value || '',
                        branch: document.getElementById('branch')?.value || '',
                        course: document.getElementById('course')?.value || '',
                        section: document.getElementById('section')?.value || '',
                        contactNumber: document.getElementById('contactNumber')?.value.trim() || '',
                        rollNo: document.getElementById('rollNo')?.value.trim() || '',
                        cpi: document.getElementById('cpi')?.value.trim() || '',
                        state: document.getElementById('state')?.value.trim() || '',
                        city: document.getElementById('city')?.value.trim() || '',
                        pincode: document.getElementById('pincode')?.value.trim() || '',
                        email: document.getElementById('email')?.value.trim() || ''
                    };

                    console.log('📝 Submitting registration data:', formData);

                    // Send registration data to server
                    // NOTE: The endpoint should be /api/register to hit the server.js handler
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Simplified success message
                        const successMessage = currentLanguage === 'en'
                            ? `🎉 Registration Successful!\n\nA confirmation email has been sent to ${result.data.email}. Please check your inbox.`
                            : `🎉 पंजीकरण सफल!\n\nएक पुष्टिकरण ईमेल ${result.data.email} पर भेजा गया है। कृपया अपना इनबॉक्स जांचें।`;

                        alert(successMessage);

                        // Reset form
                        this.reset();
                        resetFormState();

                        console.log('✅ Registration completed successfully:', result.data);

                    } else {
                        // Show detailed validation errors
                        let errorMessage = currentLanguage === 'en'
                            ? 'Registration failed:\n'
                            : 'पंजीकरण विफल:\n';

                        if (result.errors && Array.isArray(result.errors)) {
                            errorMessage += result.errors.map(err => `• ${err}`).join('\n');
                        } else {
                            errorMessage += result.message || 'Unknown error occurred';
                        }

                        alert(errorMessage);
                        throw new Error(errorMessage);
                    }

                } catch (error) {
                    console.error('❌ Error submitting form:', error);
                    // Error message already shown in the try block
                } finally {
                    // Re-enable submit button (but it will be disabled by updateSubmitButtonState on reset)
                    if (submitBtn) {
                        submitBtn.textContent = languageTexts[currentLanguage].completeRegistration;
                    }
                }
            } else {
                alert(currentLanguage === 'en'
                    ? 'Please complete all sections of the form before submitting.'
                    : 'कृपया सबमिट करने से पहले फॉर्म के सभी अनुभागों को पूरा करें।');
            }
        });
    }

    function resetFormState() {
        if (personalSection) {
            personalSection.classList.remove('inactive');
            personalSection.classList.add('active');
        }
        if (personalStatus) {
            personalStatus.textContent = languageTexts[currentLanguage].statusCurrent;
            personalStatus.classList.remove('completed');
        }

    
        if (academicSection) {
            academicSection.classList.remove('inactive');
            academicSection.classList.remove('active'); // NEW
            academicSection.classList.add('locked');
        }
        if (academicStatus) {
            academicStatus.textContent = languageTexts[currentLanguage].statusLocked;
            academicStatus.classList.remove('completed');
        }

        if (addressSection) {
            addressSection.classList.remove('active');
            addressSection.classList.add('locked');
        }
        if (addressStatus) {
            addressStatus.textContent = languageTexts[currentLanguage].statusLocked;
        }
        
        // Reset Sidebar
        if (sidebarPersonal) {
            sidebarPersonal.classList.add('active');
            sidebarPersonal.classList.remove('completed');
        }
        if (sidebarAcademic) {
            sidebarAcademic.classList.add('locked');
            sidebarAcademic.classList.remove('active');
            sidebarAcademic.classList.remove('completed');
        }
        if (sidebarAddress) {
            sidebarAddress.classList.add('locked');
            sidebarAddress.classList.remove('active');
            sidebarAddress.classList.remove('completed');
        }


        // Reset all email/OTP state
        resetVerificationState(); // This will also call updateSubmitButtonState()
        
        // MODIFICATION: Reset terms checkbox
        if (termsCheckbox) {
            termsCheckbox.checked = false;
        }
        
        // Clear email status box
        const emailStatus = document.querySelector('.email-status');
        if (emailStatus) emailStatus.style.display = 'none';
        if (emailHint) emailHint.style.display = 'none'; // Hide hint on reset
        
        // Clear other status boxes
        const statuses = document.querySelectorAll('.rollno-status, .contact-status, .pincode-status, .cpi-status, .age-warning, .validation-message'); // NEW: .validation-message
        statuses.forEach(status => status.style.display = 'none');
        
        // Reset border colors
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
             input.style.borderColor = '';
             input.classList.remove('invalid-field'); // NEW: Remove red glow
        });

        // NEW: Reset sidebar and button
        if (window.updatePersonalSectionState) {
            window.updatePersonalSectionState();
        } else {
             updateProgress(0); // Fallback
        }
    }

    // Initialize all real-time validations
    // MODIFIED: This function is now completely replaced with the new logic
    function initializeRealTimeValidations() {
        console.log('Initializing NEW real-time validations...');
        
        // --- 1. Selectors for new logic ---
        const progressBar = document.getElementById('progress-bar');
        const progressPercentText = document.getElementById('progress-percent');
        
        // Sections
        const personalSection = document.getElementById('personal-section');
        const academicSection = document.getElementById('academic-section');
        const addressSection = document.getElementById('address-section');
        
        // Personal Fields
        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        const gender = document.getElementById('gender');
        const dob = document.getElementById('dob');
        const ageInput = document.getElementById('age'); // The readonly age field
        
        // Validation Message Divs
        const firstNameValidationMsg = document.getElementById('firstName-validation');
        const lastNameValidationMsg = document.getElementById('lastName-validation');
        let ageWarning = document.querySelector('.age-warning'); // Find existing
        
        // Button
        const continueButton = document.getElementById('next-to-academic');
        
        // Sidebar Links
        const sidebarPersonal = document.getElementById('sidebar-personal');
        const sidebarAcademic = document.getElementById('sidebar-academic');
        const sidebarAddress = document.getElementById('sidebar-address');
        
        // Create age warning if it doesn't exist (from your original code)
        if (!ageWarning && dob) {
            ageWarning = document.createElement('div');
            ageWarning.className = 'age-warning';
            ageWarning.style.cssText = "display: none; margin-top: 8px; font-size: 14px; padding: 6px 10px; border-radius: 4px;";
            // FIX: Append to form-group, not just parentNode
            dob.closest('.form-group').appendChild(ageWarning);
        }

        // --- 2. Validation State & Config ---
        const validationState = {
            personal: {
                firstName: false,
                lastName: false,
                gender: false,
                dob: false // True only if age is 16-32
            },
            academic: {
                currentYear: false,
                branch: false,
                course: false,
                section: false,
                contactNumber: false,
                rollNo: false,
                cpi: false
            },
            address: {
                pincode: false,
                state: false,
                city: false,
                email: false, // This will be tied to emailVerified
                terms: false  // This will be tied to termsCheckbox
            }
        };
        
        // Calculate total fields for progress
        // This is a rough estimate. We'll base progress on *sections* for now.
        const TOTAL_FORM_SECTIONS = 3; 
        const PROGRESS_PER_SECTION = 100 / TOTAL_FORM_SECTIONS; // 33.3%

        
        // --- 3. New Validation Helper Functions ---
        
        /**
         * FIX 2: Validates name: 2+ chars, no numbers or special chars.
         */
        function isNameValid(nameInput, messageElement) {
            const nameRegex = /^[a-zA-Z\s]+$/; // Only letters and spaces
            let value = nameInput.value;
            
            // FIX 2.1: Prevent typing numbers
            const originalValue = value;
            value = value.replace(/[^a-zA-Z\s]/g, ''); // Remove any non-letter/space
            if (originalValue !== value) {
                nameInput.value = value; // Update the input field immediately
            }
            
            const trimmedValue = value.trim();

            if (trimmedValue.length > 0 && trimmedValue.length < 2) {
                messageElement.innerHTML = `<i class="fas fa-times-circle"></i> ${languageTexts[currentLanguage].nameInvalidLength}`;
                messageElement.style.display = 'block';
                return false;
            }
            
            // This check is now redundant due to the replace() above, but good for safety.
            if (trimmedValue.length > 0 && !nameRegex.test(trimmedValue)) {
                messageElement.innerHTML = `<i class="fas fa-times-circle"></i> ${languageTexts[currentLanguage].nameInvalidChars}`;
                messageElement.style.display = 'block';
                return false;
            }
            
            messageElement.style.display = 'none'; // Clear error
            return trimmedValue.length >= 2; // Valid only if 2+ chars
        }

        /**
         * FIX: Validates DOB: Must result in an age between 16 and 32.
         * Also updates the ageInput field and warning message.
         */
        function isDOBValid_16_32(dobString, ageInputElement, warningElement) {
            if (!dobString) {
                if (ageInputElement) ageInputElement.value = ''; // Clear age if DOB is empty
                if (warningElement) warningElement.style.display = 'none';
                return false;
            }
            
            const age = calculateAge(dobString); // This already updates ageInput
            
            const isValid = age >= 16 && age <= 32;
            
            if (isValid) {
                if (warningElement) warningElement.style.display = 'none';
                if (dob) dob.style.borderColor = ''; // Use class-based validation
            } else {
                if (warningElement) {
                    warningElement.innerHTML = languageTexts[currentLanguage].ageBlocked;
                    warningElement.style.cssText = "background:#ffebee;border:1px solid #f44336;color:#d32f2f;display:block; margin-top: 8px; font-size: 14px; padding: 6px 10px; border-radius: 4px;";
                }
                if (dob) dob.style.borderColor = '#f44336'; // Keep immediate border color
            }
            
            return isValid;
        }

        /**
         * Checks if a select field has a non-empty value.
         */
        function isSelectValid(selectElement) {
            return selectElement && selectElement.value !== '';
        }
        
        
        /**
         * Checks if the contact number is valid (10 digits, starts with 6-9).
         */
        function isContactValid(contactInput) {
            if (!contactInput) return false;
            const cleaned = contactInput.value.replace(/\D/g, "");
            return cleaned.length === 10 && /^[6-9]/.test(cleaned);
        }
        
        /**
         * Checks if the roll number is valid (using the dataset flag you set).
         */
        function isRollNoValid(rollNoInput) {
             if (!rollNoInput) return false;
             // We check the 'data-valid' attribute set by your setupRollNumberValidation function
             return rollNoInput.dataset.valid === "true";
        }
        
         /**
         * Checks if the CPI is valid (between 0 and 10).
         */
        function isCPIValid(cpiInput) {
            if (!cpiInput) return false;
            const cpiValue = parseFloat(cpiInput.value);
            return !isNaN(cpiValue) && cpiValue >= 0 && cpiValue <= 10;
        }

        /**
         * Checks if the pincode is valid (6 digits).
         */
        function isPincodeValid(pincodeInput) {
            if (!pincodeInput) return false;
            // Use the data-valid flag from the pincode fetcher if it exists
            // Otherwise, just check length
            return (pincodeInput.dataset.valid === "true") || (pincodeInput.value.replace(/\D/g, "").length === 6);
        }

        /**
         * Checks if an address text field (like state or city) is filled.
         */
        function isAddressFieldValid(addressInput) {
            return addressInput && addressInput.value.trim() !== '';
        }
        

        // --- 4. Main State Update Function ---
        
        /**
         * This function runs on every input change in the Personal section.
         */
        function updatePersonalSectionState() {
            // 1. Update validation state
            validationState.personal.firstName = isNameValid(firstName, firstNameValidationMsg);
            validationState.personal.lastName = isNameValid(lastName, lastNameValidationMsg);
            validationState.personal.gender = isSelectValid(gender);
            validationState.personal.dob = isDOBValid_16_32(dob.value, ageInput, ageWarning);

            // 2. Count valid fields
            let validFields = 0;
            const personalFieldsTotal = Object.keys(validationState.personal).length;
            for (const key in validationState.personal) {
                if (validationState.personal[key]) {
                    validFields++;
                }
            }
            
            // 3. Calculate progress
            // FIX 4: Progress only increases if fields are valid
            const overallProgress = (validFields / personalFieldsTotal) * PROGRESS_PER_SECTION;
            updateProgress(overallProgress);
            
            // 4. Check for completion and unlock next step
            if (validFields === personalFieldsTotal) {
                // ALL FIELDS ARE VALID
                if (continueButton) continueButton.disabled = false;
                
                // This logic is now handled by the navigation button click
                // to prevent sidebar skipping ahead.
                
            } else {
                // NOT ALL FIELDS ARE VALID
                if (continueButton) continueButton.disabled = true;
            }
        }
        
        // Make this function global so the 'back' button can call it
        window.updatePersonalSectionState = updatePersonalSectionState; 
        
        
        /**
         * This function runs on every input change in the Academic section.
         */
        function updateAcademicSectionState() {
            // 1. Selectors for Academic Fields
            const currentYear = document.getElementById('currentYear');
            const branch = document.getElementById('branch');
            const course = document.getElementById('course');
            const section = document.getElementById('section'); // The one you auto-populated
            const contactNumber = document.getElementById('contactNumber');
            const rollNo = document.getElementById('rollNo');
            const cpi = document.getElementById('cpi');
            const continueButton = document.getElementById('next-to-address'); // The button to enable

            // 2. Update validation state
            validationState.academic.currentYear = isSelectValid(currentYear);
            validationState.academic.branch = isSelectValid(branch);
            validationState.academic.course = isSelectValid(course);
            validationState.academic.section = isSelectValid(section);
            validationState.academic.contactNumber = isContactValid(contactNumber);
            validationState.academic.rollNo = isRollNoValid(rollNo);
            validationState.academic.cpi = isCPIValid(cpi);

            // 3. Count valid fields
            let validFields = 0;
            const academicFieldsTotal = Object.keys(validationState.academic).length;
            for (const key in validationState.academic) {
                if (validationState.academic[key]) {
                    validFields++;
                }
            }
            
            // 4. Calculate progress
            // Progress is Section 1 (33.3%) + % of Section 2
            const section1Progress = PROGRESS_PER_SECTION;
            const section2Progress = (validFields / academicFieldsTotal) * PROGRESS_PER_SECTION;
            const overallProgress = section1Progress + section2Progress;
            
            // Only update progress if this section is active
            if (academicSection.classList.contains('active')) {
                updateProgress(overallProgress);
            }

            // 5. Check for completion and unlock next step
            if (validFields === academicFieldsTotal) {
                // ALL FIELDS ARE VALID
                if (continueButton) continueButton.disabled = false;
            } else {
                // NOT ALL FIELDS ARE VALID
                if (continueButton) continueButton.disabled = true;
            }
        }
        
        // Make this function global so other validators (like rollNo) can call it
        window.updateAcademicSectionState = updateAcademicSectionState;
        
        
        /**
         * This function runs on every input change in the ADDRESS section.
         */
        function updateAddressSectionState() {
            // 1. Selectors
            const pincode = document.getElementById('pincode');
            const state = document.getElementById('state');
            const city = document.getElementById('city');
            // emailVerified and termsCheckbox are global vars

            // 2. Update validation state
            validationState.address.pincode = isPincodeValid(pincode);
            validationState.address.state = isAddressFieldValid(state);
            validationState.address.city = isAddressFieldValid(city);
            validationState.address.email = emailVerified; // Use the global flag
            validationState.address.terms = termsCheckbox.checked; // Use the global flag

            // 3. Count valid fields
            let validFields = 0;
            const addressFieldsTotal = Object.keys(validationState.address).length;
            for (const key in validationState.address) {
                if (validationState.address[key]) {
                    validFields++;
                }
            }

            // 4. Calculate progress
            // Progress is Section 1 (33.3%) + Section 2 (33.3%) + % of Section 3
            const section1Progress = PROGRESS_PER_SECTION;
            const section2Progress = PROGRESS_PER_SECTION;
            const section3Progress = (validFields / addressFieldsTotal) * PROGRESS_PER_SECTION;
            const overallProgress = section1Progress + section2Progress + section3Progress;

            // 5. Update progress bar IF this section is active
            if (addressSection.classList.contains('active')) {
                // Cap at 100%
                updateProgress(Math.min(overallProgress, 100));
            }
        }
        
        // Make this function global
        window.updateAddressSectionState = updateAddressSectionState;
        

        // --- 5. Attach Listeners ---
        
        // Listeners for real-time validation (Personal)
        firstName.addEventListener('input', updatePersonalSectionState);
        lastName.addEventListener('input', updatePersonalSectionState);
        gender.addEventListener('change', updatePersonalSectionState);
        dob.addEventListener('change', updatePersonalSectionState);
        
        // Select academic fields
        const currentYear = document.getElementById('currentYear');
        const branch = document.getElementById('branch');
        const course = document.getElementById('course');
        const section = document.getElementById('section');
        // contactNumber, rollNo, and cpi already have listeners
        // that call updateAcademicSectionState()
        
        // Add listeners
        currentYear.addEventListener('change', updateAcademicSectionState);
        branch.addEventListener('change', updateAcademicSectionState);
        course.addEventListener('change', updateAcademicSectionState);
        section.addEventListener('change', updateAcademicSectionState);
        
        // Pincode listener is already in setupPincodeValidation()
        // State listener is already in setupStateCityDatalist()
        // City listener is also in setupStateCityDatalist() now.
        

        
        // FIX 6: Red Glow on Blur (Invalid)
        const allPersonalInputs = [firstName, lastName, gender, dob];
        allPersonalInputs.forEach(input => {
            // Add blur listener to check validation on leave
            input.addEventListener('blur', () => {
                // Find the key in validationState
                const stateKey = input.id === 'dob' ? 'dob' : input.id;
                // Check if the key exists and is invalid
                if (validationState.personal.hasOwnProperty(stateKey) && !validationState.personal[stateKey]) {
                    input.classList.add('invalid-field');
                }
            });
            // Add input listener to remove glow on type
            input.addEventListener('input', () => {
                input.classList.remove('invalid-field');
            });
            // 'change' for select/date
            input.addEventListener('change', () => {
                input.classList.remove('invalid-field');
            });
        });
        
        const allAcademicInputs = [
             document.getElementById('currentYear'),
             document.getElementById('branch'),
             document.getElementById('course'),
             document.getElementById('section'),
             document.getElementById('contactNumber'),
             document.getElementById('rollNo'),
             document.getElementById('cpi')
        ];
        
        allAcademicInputs.forEach(input => {
            if (!input) return; // Skip if element not found
            
            // Add blur listener to check validation on leave
            input.addEventListener('blur', () => {
                // Find the key in validationState
                const stateKey = input.id;
                // Check if the key exists and is invalid
                if (validationState.academic.hasOwnProperty(stateKey) && !validationState.academic[stateKey]) {
                    input.classList.add('invalid-field');
                }
            });
             // Add input/change listener to remove glow on type
            const eventType = (input.tagName === 'SELECT') ? 'change' : 'input';
            input.addEventListener(eventType, () => {
                input.classList.remove('invalid-field');
            });
        });
        
        
        // This adds the "Red Glow" blur effect to the address fields
        const allAddressInputs = [
            document.getElementById('pincode'),
            document.getElementById('state'),
            document.getElementById('city'),
            document.getElementById('email')
        ];
        
        allAddressInputs.forEach(input => {
            if (!input) return;
            
            input.addEventListener('blur', () => {
                 const stateKey = input.id === 'email' ? 'email' : input.id;
                 if (validationState.address.hasOwnProperty(stateKey) && !validationState.address[stateKey]) {
                    input.classList.add('invalid-field');
                }
            });
            
            input.addEventListener('input', () => {
                 input.classList.remove('invalid-field');
            });
        });


        // FIX 3: Add click listeners for sidebar
        [sidebarPersonal, sidebarAcademic, sidebarAddress].forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.classList.contains('locked')) {
                    e.preventDefault(); // Do nothing if locked
                    return;
                }
                
                // If clicking a completed link, go to that section
                if (link.classList.contains('completed') || link.classList.contains('active')) {
                    e.preventDefault();
                    
                    // Don't allow skipping ahead
                    const targetId = link.getAttribute('href');
                    
                    // Logic to navigate
                    if (targetId === '#personal-section') {
                         if (backToPersonalBtn) backToPersonalBtn.click();
                    } 
                    else if (targetId === '#academic-section') {
                        // Can only go here if personal is complete
                         if (sidebarPersonal.classList.contains('completed')) {
                             if (backToAcademicBtn) backToAcademicBtn.click();
                         }
                    }
                    // No need for address, as it's the last step
                    
                    const targetSection = document.querySelector(targetId);
                    if (targetSection) {
                        targetSection.scrollIntoView({
                            behavior: 'smooth', block: 'start'
                        });
                    }
                }
            });
        });

        // --- 6. Initialize All Other Validations (Your Original Code) ---
        setupEmailDuplicationCheck();
        setupContactNumberValidation();
        setupPincodeValidation();
        setupRollNumberValidation();
        setupCpiValidation(); 
        setupStateCityDatalist(); 
        
        // Add auto-capitalization to name fields
        const nameInputs = [
            document.getElementById('firstName'),
            document.getElementById('middleName'),
            document.getElementById('lastName')
        ];
        
        nameInputs.forEach(input => {
            if (input) {
                input.addEventListener('blur', function() {
                    this.value = toTitleCase(this.value);
                    // Re-validate on blur
                    if (input.id === 'firstName' || input.id === 'lastName') {
                        updatePersonalSectionState();
                    }
                });
            }
        });
        
        // Run once on page load to set the initial state
        updatePersonalSectionState();
        
        // Run the new academic validator once on load to set
        // the initial disabled state of the button
        updateAcademicSectionState();
        
        // Run the new address validator once on load
        updateAddressSectionState();
        
        console.log('✅ Real-time progress and validation initialized.');
    }
    

    // ======================================================
    // NEW: MODAL AND TERMS CHECKBOX LOGIC
    // ======================================================
    function setupModalListeners() {
        // We find the links inside the function, because language change
        // rebuilds them.
        const termsLink = document.getElementById('terms-link');
        const privacyLink = document.getElementById('privacy-link');
        const termsModal = document.getElementById('terms-modal');
        const agreeTermsBtn = document.getElementById('agree-terms-btn');
        const closeModalBtns = document.querySelectorAll('.close-modal-btn');

        function openModal(e) {
            e.preventDefault();
            // TODO: In a real app, load different content for privacy vs terms.
            // For now, they both open the same modal.
            if (termsModal) termsModal.style.display = 'flex';
        }

        function closeModal() {
            if (termsModal) termsModal.style.display = 'none';
        }

        if (termsLink) termsLink.addEventListener('click', openModal);
        if (privacyLink) privacyLink.addEventListener('click', openModal);

        closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));

        if (agreeTermsBtn) {
            // Remove old listener to prevent duplicates
            const newAgreeBtn = agreeTermsBtn.cloneNode(true);
            agreeTermsBtn.parentNode.replaceChild(newAgreeBtn, agreeTermsBtn);

            newAgreeBtn.addEventListener('click', () => {
                closeModal();
                termsCheckbox.checked = true;
                // Manually trigger change event to update button state
                termsCheckbox.dispatchEvent(new Event('change'));
            });
        }

        // Close modal if clicking on the background overlay
        window.addEventListener('click', (e) => {
            if (e.target === termsModal) {
                closeModal();
            }
        });
    }
    
    // ==================== INITIALIZATION ====================
    initializeRealTimeValidations();
    setupModalListeners();

    // Add listener for the terms checkbox
    if (termsCheckbox) {
        // This listener now updates BOTH the submit button AND the progress bar
        termsCheckbox.addEventListener('change', () => {
            updateSubmitButtonState();
            if (window.updateAddressSectionState) {
                window.updateAddressSectionState();
            }
        });
    }

    // Set initial button state
    updateSubmitButtonState();
    
    // Set initial language
    switchLanguage('en');

    console.log('Registration form initialized successfully!');
});

/**
 * This function is called by Google reCAPTCHA *after* it has
 * successfully verified the user is human.
 * The 'token' is the proof from Google.
 */
function onSubmit(token) {
    console.log('reCAPTCHA success. Token:', token);

    // Find the registration form and manually trigger its submit event.
    // Your *existing* code in app.js will catch this and run the registration.
    const registrationForm = document.getElementById('registrationForm');
    registrationForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}
// --- END OF NEW FUNCTION ---