// DEBUG: Check if file is loaded
console.log("🔄 STAFF-LOGIN.JS LOADED - VERSION 3.2 - " + new Date().toISOString());

// CSRF Token Management
let csrfToken = '';

// Fetch CSRF Token before making any POST requests
async function fetchCSRFToken() {
    try {
        console.log("🛡️ Fetching CSRF token...");
        const response = await fetch('/api/security/csrf-token');
        const data = await response.json();
        
        if (data.success && data.token) {
            csrfToken = data.token;
            console.log("✅ CSRF token loaded successfully");
            
            // Add CSRF token to all forms
            document.querySelectorAll('form').forEach(form => {
                // Remove existing CSRF token if any
                const existingToken = form.querySelector('input[name="_csrf"]');
                if (existingToken) {
                    existingToken.remove();
                }
                
                // Add new CSRF token
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = '_csrf';
                csrfInput.value = csrfToken;
                form.appendChild(csrfInput);
            });
            return true;
        } else {
            console.error("❌ Failed to get CSRF token:", data);
            return false;
        }
    } catch (error) {
        console.error("❌ Error fetching CSRF token:", error);
        return false;
    }
}

// --- Global function that will be available immediately ---
window.handleLogin = async function(event) {
    console.log("🔐 handleLogin called");
    
    if (event) event.preventDefault();
    
    const agentId = document.getElementById('agentId').value;
    const password = document.getElementById('password').value;
    
    if (!agentId || !password) {
        showAlertModal('modal_required_title', 'modal_required_message', true);
        return false;
    }
    
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.innerHTML;
    
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;

    try {
        console.log("📡 Sending login request for:", agentId);
        
        // Ensure we have CSRF token
        if (!csrfToken) {
            console.log("🛡️ No CSRF token, fetching now...");
            const tokenSuccess = await fetchCSRFToken();
            if (!tokenSuccess) {
                showAlertModal('modal_error_title', 'modal_server_unreachable', true);
                return;
            }
        }
        
        // FIX: Changed API endpoint from /api/login to the correct /api/auth/login
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                username: agentId,
                password: password,
                _csrf: csrfToken
            })
        });

        const data = await response.json();
        console.log("📨 Login response:", data);

        if (data.success) {
            // Check for 2FA requirement first
            if (data.require2FA) {
                // Store user ID temporarily to complete 2FA verification
                localStorage.setItem('tempUserId', data.userId);
                showAlertModal('modal_2fa_title', 'modal_2fa_message', false);
                
                setTimeout(() => {
                    window.location.href = '/2fa-verification.html';
                }, 1500);

            } else {
                // --- CRITICAL FIX: Save the JWT Token for all successful non-2FA logins ---
                if (data.token) {
                    localStorage.setItem('adminJwtToken', data.token); 
                    console.log("✅ JWT Token stored successfully.");
                } else {
                    console.error("Login succeeded but no token was returned.");
                    showAlertModal('modal_error_title', 'modal_generic_error', true);
                    return;
                }

                // DEBUG: Log the full response to see the structure
                console.log("📨 Full login response structure:", JSON.stringify(data, null, 2));

                // --- CRITICAL FIX: GUARANTEED REDIRECT BASED ON ROLE_ID ---
                // Get roleId from the correct location in the response
                const roleId = parseInt(data.user?.roleId || data.role_id || data.user?.role_id);

                if (!roleId) {
                    console.error("❌ No role information in response:", data);
                    showAlertModal('modal_error_title', 'Login succeeded but role information missing', true);
                    return;
                }

                let redirectURL = '/student-dashboard'; // Default (role_id 4)

                // Use explicit role-based redirect logic
                if (roleId <= 3) {
                    // Admin roles (1, 2, 3) - Hostel Admin, System Admin, etc.
                    redirectURL = '/admin-dashboard';
                    console.log(`✅ ADMIN: Redirecting to admin dashboard (Role ID: ${roleId})`);
                } else if (roleId === 4) {
                    // Student role
                    redirectURL = '/student-dashboard';
                    console.log(`✅ STUDENT: Redirecting to student dashboard (Role ID: ${roleId})`);
                } else if (roleId >= 5) {
                    // Warden/Staff roles (5 and above)
                    redirectURL = '/warden-dashboard';
                    console.log(`✅ WARDEN: Redirecting to warden dashboard (Role ID: ${roleId})`);
                } else {
                    // Fallback for unknown roles
                    console.warn(`⚠️ UNKNOWN ROLE: ${roleId}, defaulting to student dashboard`);
                    redirectURL = '/student-dashboard';
                }

                console.log(`✅ Final redirect: ${redirectURL}`);
                window.location.href = redirectURL;
            }

        } else {
            // Login failed (e.g., incorrect credentials)
            const errorMessageKey = data.error_key || 'modal_invalid_credentials';
            showAlertModal('modal_login_failed', errorMessageKey, true);
        }

    } catch (error) {
        console.error("🔥 Network/Server Error during login:", error);
        showAlertModal('modal_error_title', 'modal_server_unreachable', true);
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
};

// --- Language and UI Helpers ---

// Static translations dictionary
const translations = {
    en: {
        title: 'Institutional Login - HMS Command',
        nav_home: 'Home',
        nav_student_login: 'Student Login',
        nav_about: 'About',
        nav_contact: 'Contact',
        login_header: 'Institutional Staff Login',
        label_employee_id: 'Employee ID',
        placeholder_employee_id: 'Enter your employee ID',
        label_password: 'Password',
        placeholder_password: 'Enter your password',
        info_support: 'Please contact the dedicated <strong>HMS System Support Unit</strong> for any system access issues, lockouts, or clarifications.',
        button_login: 'Log in',
        button_clear: 'Clear',
        info_case_sensitive: 'Password is case sensitive',
        link_forgot_password: 'Forgot Password?',
        link_request_access: 'Request Access',
        link_system_status: 'System Status',
        modal_error_title: 'System Error',
        modal_server_unreachable: 'Cannot connect to the central server. Please check your network connection or contact IT support.',
        modal_login_failed: 'Login Failed',
        modal_invalid_credentials: 'The Agent ID or Password you entered is incorrect. Please try again.',
        modal_required_title: 'Missing Credentials',
        modal_required_message: 'Agent ID and Password are required to log in.',
        modal_2fa_title: 'Two-Factor Authentication Required',
        modal_2fa_message: 'Please check your email for the 2FA token to complete login.',
        modal_generic_error: 'An unexpected error occurred. Please try again.'
    },
    hi: {
        title: 'संस्थागत लॉगिन - HMS कमांड',
        nav_home: 'होम',
        nav_student_login: 'छात्र लॉगिन',
        nav_about: 'के बारे में',
        nav_contact: 'संपर्क करें',
        login_header: 'संस्थागत स्टाफ लॉगिन',
        label_employee_id: 'कर्मचारी आईडी',
        placeholder_employee_id: 'अपनी कर्मचारी आईडी दर्ज करें',
        label_password: 'पासवर्ड',
        placeholder_password: 'अपना पासवर्ड दर्ज करें',
        info_support: 'किसी भी सिस्टम एक्सेस समस्या, लॉकआउट, या स्पष्टीकरण के लिए कृपया समर्पित <strong>HMS सिस्टम सपोर्ट यूनिट</strong> से संपर्क करें।',
        button_login: 'लॉग इन करें',
        button_clear: 'साफ करें',
        info_case_sensitive: 'पासवर्ड केस सेंसिटिव है',
        link_forgot_password: 'पासवर्ड भूल गए?',
        link_request_access: 'एक्सेस का अनुरोध करें',
        link_system_status: 'सिस्टम स्टेटस',
        modal_error_title: 'सिस्टम त्रुटि',
        modal_server_unreachable: 'सेंट्रल सर्वर से कनेक्ट नहीं हो पा रहा है। कृपया अपने नेटवर्क कनेक्शन की जांच करें या आईटी सपोर्ट से संपर्क करें।',
        modal_login_failed: 'लॉगिन विफल',
        modal_invalid_credentials: 'आपके द्वारा दर्ज की गई एजेंट आईडी या पासवर्ड गलत है। कृपया पुनः प्रयास करें।',
        modal_required_title: 'क्रेडेंशियल्स गुम हैं',
        modal_required_message: 'लॉग इन करने के लिए एजेंट आईडी और पासवर्ड आवश्यक हैं।',
        modal_2fa_title: 'दो-कारक प्रमाणीकरण आवश्यक',
        modal_2fa_message: 'लॉगिन पूरा करने के लिए कृपया 2FA टोकन के लिए अपना ईमेल जांचें।',
        modal_generic_error: 'एक अप्रत्याशित त्रुटि हुई। कृपया पुनः प्रयास करें।'
    },
    te: {
        title: 'సంస్థాగత లాగిన్ - HMS కమాండ్',
        nav_home: 'హోమ్',
        nav_student_login: 'విద్యార్థి లాగిన్',
        nav_about: 'గురించి',
        nav_contact: 'సంప్రదించండి',
        login_header: 'సంస్థాగత స్టాఫ్ లాగిన్',
        label_employee_id: 'ఉద్యోగి ఐడి',
        placeholder_employee_id: 'మీ ఉద్యోగి ఐడిని నమోదు చేయండి',
        label_password: 'పాస్వర్డ్',
        placeholder_password: 'మీ పాస్వర్డ్ నమోదు చేయండి',
        info_support: 'ఏదైనా సిస్టమ్ యాక్సెస్ సమస్యలు, లాక్అవుట్లు లేదా స్పష్టతల కోసం దయచేసి ప్రత్యేక <strong>HMS సిస్టమ్ సపోర్ట్ యూనిట్</strong>ని సంప్రదించండి.',
        button_login: 'లాగిన్ చేయండి',
        button_clear: 'క్లియర్ చేయండి',
        info_case_sensitive: 'పాస్వర్డ్ కేస్ సెన్సిటివ్',
        link_forgot_password: 'పాస్వర్డ్ మర్చిపోయారా?',
        link_request_access: 'యాక్సెస్ కోసం అభ్యర్థించండి',
        link_system_status: 'సిస్టమ్ స్టేటస్',
        modal_error_title: 'సిస్టమ్ ఎర్రర్',
        modal_server_unreachable: 'సెంట్రల్ సర్వర్కి కనెక్ట్ చేయలేకపోతున్నాము. దయచేసి మీ నెట్వర్క్ కనెక్షన్ని తనిఖీ చేయండి లేదా ఐటి సపోర్ట్ను సంప్రదించండి.',
        modal_login_failed: 'లాగిన్ విఫలమైంది',
        modal_invalid_credentials: 'మీరు నమోదు చేసిన ఏజెంట్ ఐడి లేదా పాస్వర్డ్ తప్పు. దయచేసి మళ్లీ ప్రయత్నించండి.',
        modal_required_title: 'క్రెడెన్షియల్స్ లేవు',
        modal_required_message: 'లాగిన్ చేయడానికి ఏజెంట్ ఐడి మరియు పాస్వర్డ్ అవసరం.',
        modal_2fa_title: 'టూ-ఫ్యాక్టర్ ఆథెంటికేషన్ అవసరం',
        modal_2fa_message: 'లాగిన్ను పూర్తి చేయడానికి దయచేసి 2FA టోకెన్ కోసం మీ ఇమెయిల్ని తనిఖీ చేయండి.',
        modal_generic_error: 'ఊహించని లోపం సంభవించింది. దయచేసి మళ్లీ ప్రయత్నించండి.'
    },
    bn: {
        title: 'প্রাতিষ্ঠানিক লগইন - HMS কমান্ড',
        nav_home: 'হোম',
        nav_student_login: 'ছাত্র লগইন',
        nav_about: 'সম্পর্কে',
        nav_contact: 'যোগাযোগ',
        login_header: 'প্রাতিষ্ঠানিক স্টাফ লগইন',
        label_employee_id: 'কর্মচারী আইডি',
        placeholder_employee_id: 'আপনার কর্মচারী আইডি লিখুন',
        label_password: 'পাসওয়ার্ড',
        placeholder_password: 'আপনার পাসওয়ার্ড লিখুন',
        info_support: 'যেকোনো সিস্টেম অ্যাক্সেস সমস্যা, লকআউট, বা স্পষ্টীকরণের জন্য অনুগ্রহ করে ডেডিকেটেড <strong>HMS সিস্টেম সাপোর্ট ইউনিট</strong> এর সাথে যোগাযোগ করুন।',
        button_login: 'লগ ইন করুন',
        button_clear: 'ক্লিয়ার করুন',
        info_case_sensitive: 'পাসওয়ার্ড কেস সেনসিটিভ',
        link_forgot_password: 'পাসওয়ার্ড ভুলে গেছেন?',
        link_request_access: 'অ্যাক্সেসের অনুরোধ করুন',
        link_system_status: 'সিস্টেম স্ট্যাটাস',
        modal_error_title: 'সিস্টেম ত্রুটি',
        modal_server_unreachable: 'সেন্ট্রাল সার্ভারে সংযোগ করা যাচ্ছে না। অনুগ্রহ করে আপনার নেটওয়ার্ক সংযোগ পরীক্ষা করুন বা আইটি সাপোর্টে যোগাযোগ করুন।',
        modal_login_failed: 'লগইন ব্যর্থ',
        modal_invalid_credentials: 'আপনার প্রবেশ করানো এজেন্ট আইডি বা পাসওয়ার্ড ভুল। অনুগ্রহ করে আবার চেষ্টা করুন।',
        modal_required_title: 'ক্রেডেনশিয়ালস অনুপস্থিত',
        modal_required_message: 'লগইন করতে এজেন্ট আইডি এবং পাসওয়ার্ড প্রয়োজন।',
        modal_2fa_title: 'দুই-ফ্যাক্টর প্রমাণীকরণ প্রয়োজন',
        modal_2fa_message: 'লগইন সম্পূর্ণ করতে অনুগ্রহ করে 2FA টোকেনের জন্য আপনার ইমেল চেক করুন।',
        modal_generic_error: 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
    }
};

// Utility to display an alert modal
function showAlertModal(titleKey, messageKey, isError) {
    const lang = localStorage.getItem('hmsLang') || 'en';
    const t = translations[lang];

    document.getElementById('modalTitle').textContent = t[titleKey] || titleKey;
    document.getElementById('modalMessage').textContent = t[messageKey] || messageKey;
    
    const modal = document.getElementById('customAlertModal');
    if (modal) {
        modal.style.display = 'flex';
        // Assuming you have CSS variables --hms-red and --hms-blue defined
        document.querySelector('.modal-title').style.color = isError ? 'var(--hms-red)' : 'var(--hms-blue)';
    }
}

// Utility to hide the alert modal
function hideAlertModal() {
    const modal = document.getElementById('customAlertModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Utility to clear the form fields
function clearForm() {
    document.getElementById('agentId').value = '';
    document.getElementById('password').value = '';
}

// Initialize password toggle functionality
function initializePasswordToggle() {
    const passwordField = document.getElementById('password');
    const toggleButton = document.getElementById('passwordToggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', function() {
            const isPassword = passwordField.type === 'password';
            passwordField.type = isPassword ? 'text' : 'password';
            this.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }
}

// Utility to change the language
function changeLanguage(langCode) {
    const t = translations[langCode] || translations['en'];
    
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.getAttribute('data-key');
        if (t[key]) {
            element.textContent = t[key];
        }
    });
    
    document.querySelectorAll('[data-key-placeholder]').forEach(element => {
        const key = element.getAttribute('data-key-placeholder');
        if (t[key]) {
            element.placeholder = t[key];
        }
    });
    
    localStorage.setItem('hmsLang', langCode);
    document.getElementById('currentLanguage').textContent = t['current_lang'] || langCode.toUpperCase();
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM Content Loaded - Initializing staff login");
    
    // Load language preference from storage or default to English
    const defaultLang = localStorage.getItem('hmsLang') || 'en';
    changeLanguage(defaultLang);
    
    // Initialize password toggle
    initializePasswordToggle();
    
    // Fetch CSRF token on page load
    fetchCSRFToken();
    
    // Close modal when clicking outside
    const modal = document.getElementById('customAlertModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideAlertModal();
            }
        });
    }
    
    // Add clear button functionality
    const clearButton = document.getElementById('clear-btn');
    if (clearButton) {
        clearButton.addEventListener('click', clearForm);
    }
    
    // Add language dropdown functionality
    const languageBtn = document.querySelector('.language-btn');
    const languageDropdown = document.querySelector('.language-dropdown');
    
    if (languageBtn && languageDropdown) {
        languageBtn.addEventListener('click', function() {
            languageDropdown.classList.toggle('active');
        });
        
        languageDropdown.addEventListener('click', function(e) {
            if (e.target.classList.contains('dropdown-item')) {
                const langCode = e.target.getAttribute('data-lang');
                if (langCode) {
                    changeLanguage(langCode);
                    languageDropdown.classList.remove('active');
                }
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!languageBtn.contains(e.target) && !languageDropdown.contains(e.target)) {
                languageDropdown.classList.remove('active');
            }
        });
    }
    
    console.log("✅ Staff login initialization complete");
});