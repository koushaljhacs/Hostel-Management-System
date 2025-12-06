/* HMS-CENTRAL/web-interfaces/homepage/js/login.js */

// Global variable to store the correct CAPTCHA text
let captchaText = '';

// --- Role Switching Logic ---
function toggleRole(role) {
    const label = document.getElementById('usernameLabel');
    const input = document.getElementById('username');
    
    if (role === 'student') {
        label.innerHTML = 'Username / Roll No.<span class="required-asterisk">*</span>';
        input.placeholder = 'Enter your registered username';
    } else {
        label.innerHTML = 'Parent Email / Mobile<span class="required-asterisk">*</span>';
        input.placeholder = 'Enter registered email or mobile';
    }
}

// --- Custom Modal Functions ---
function showAlertModal(title, message, isError = true) {
    const modal = document.getElementById('customAlertModal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    
    const icon = modal.querySelector('.modal-icon i');
    
    if (isError) {
        icon.className = 'fas fa-exclamation-triangle';
        icon.style.color = '#800000'; 
    } else {
        icon.className = 'fas fa-check-circle';
        icon.style.color = '#2e7d32'; 
    }

    modal.classList.add('visible');
}

function hideAlertModal() {
    const modal = document.getElementById('customAlertModal');
    modal.classList.remove('visible');
}

// Close modal when clicking outside
document.getElementById('customAlertModal').addEventListener('click', function(e) {
    if (e.target.id === 'customAlertModal') {
        hideAlertModal();
    }
});

// --- Language Change Handler ---
function handleLanguageChange(language) {
    showAlertModal('Internationalization', `Language selection simulated. Changing page content to ${language.toUpperCase()} requires backend support.`, false);
}

// --- CAPTCHA Functions ---
function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let result = '';
    const length = 6;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function drawCaptcha(text) {
    const canvas = document.getElementById('captchaCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }

    ctx.font = 'bold 30px "Arial Black", sans-serif'; 
    ctx.fillStyle = '#800000';
    
    for (let i = 0; i < text.length; i++) {
        ctx.save();
        ctx.translate(15 + i * 25, 30 + Math.random() * 8 - 4); 
        ctx.rotate((Math.random() * 0.4) - 0.2); 
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
    }
}

function generateAndDrawCaptcha() {
    captchaText = generateCaptcha();
    drawCaptcha(captchaText);
    document.getElementById('captchaInput').value = ''; 
}

// --- Password Toggle Functionality ---
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('togglePassword');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    }
}

// --- Browser Compatibility ---
function getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browserName = "Unknown Browser";
    let browserVersion = "Unknown Version";
    
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
        browserName = "Google Chrome";
        const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
        if (match) browserVersion = match[1];
    } else if (userAgent.includes("Firefox")) {
        browserName = "Mozilla Firefox";
        const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
        if (match) browserVersion = match[1];
    }
    
    return { name: browserName, version: browserVersion };
}

function updateBrowserInfoInFooter() {
    const info = getBrowserInfo();
    const element = document.getElementById('browser-info');
    if (element) {
        element.textContent = `Compatibility: Optimized for ${info.name} v${info.version}+`;
    }
}

// --- Security Restrictions ---
function setupSecurityRestrictions() {
    // Use absolute path for the security loader
    const script = document.createElement('script');
    script.src = '/common/public/js/security-loader.js';
    document.head.appendChild(script);
}

// --- Form Submission Handler ---
async function handleLoginSubmit() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const captchaInput = document.getElementById('captchaInput').value;
    
    // Get Selected Role
    const role = document.querySelector('input[name="userRole"]:checked').value;
    
    if (!username || !password) {
        showAlertModal('Input Required', 'Please enter your credentials.', true);
        return;
    }
    
    if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
        showAlertModal('Security Error', 'Incorrect Captcha code.', true);
        generateAndDrawCaptcha();
        return;
    }

    const loginBtn = document.querySelector('.login-button');
    const originalText = loginBtn.innerHTML;
    
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;

    try {
        // Choose Endpoint based on Role
        const endpoint = role === 'student' ? '/api/student/login' : '/api/login';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
                role: role
            })
        });

        const data = await response.json();

        if (data.success || response.ok) {
            showAlertModal('Login Success', `Welcome ${data.user ? data.user.username : 'User'}! Redirecting...`, false);
            
            // Store token
            const token = data.token || (data.user && data.user.token);
            if (token) localStorage.setItem('hmsToken', token);
            
            // Redirect Logic
            setTimeout(() => {
                // FIXED: Corrected path to match server.js route (/student-dashboard)
                if (role === 'student') {
                    window.location.href = '/student-dashboard';
                } else {
                    // Fallback for Parent/Other roles 
                    window.location.href = '/student-dashboard'; 
                }
            }, 1500);

        } else {
            showAlertModal('Login Failed', data.message || data.error, true);
            generateAndDrawCaptcha(); 
        }

    } catch (error) {
        console.error('Login error:', error);
        showAlertModal('Connection Error', 'Unable to connect to server.', true);
        generateAndDrawCaptcha(); 
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// Initialize
window.onload = function() {
    generateAndDrawCaptcha();
    updateBrowserInfoInFooter();
    setupSecurityRestrictions();
};