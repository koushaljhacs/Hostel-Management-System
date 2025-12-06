/* homepage/js/forgot-username.js */

let generatedCaptcha = '';

// --- 1. CAPTCHA LOGIC ---
function generateCaptcha() {
    const canvas = document.getElementById('captchaCanvas');
    const ctx = canvas.getContext('2d');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add Noise
    for(let i=0; i<30; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(Math.random()*canvas.width, Math.random()*canvas.height);
        ctx.lineTo(Math.random()*canvas.width, Math.random()*canvas.height);
        ctx.stroke();
    }

    // Draw Text
    generatedCaptcha = '';
    ctx.font = 'bold 24px Inter';
    ctx.fillStyle = '#333';
    
    for(let i=0; i<6; i++) {
        const char = chars.charAt(Math.floor(Math.random() * chars.length));
        generatedCaptcha += char;
        ctx.save();
        ctx.translate(20 + i*20, 30);
        ctx.rotate((Math.random() - 0.5) * 0.4);
        ctx.fillText(char, 0, 0);
        ctx.restore();
    }
}

// --- UTILITY: Loader State ---
function setLoading(btnId, isLoading, text) {
    const btn = document.getElementById(btnId);
    const span = btn.querySelector('.btn-text');
    const icon = btn.querySelector('i');
    
    if (isLoading) {
        btn.dataset.originalText = span.textContent;
        btn.dataset.originalIcon = icon.className;
        span.textContent = text || 'PROCESSING...';
        icon.className = 'fas fa-circle-notch fa-spin';
        btn.disabled = true;
    } else {
        span.textContent = btn.dataset.originalText;
        icon.className = btn.dataset.originalIcon;
        btn.disabled = false;
    }
}

// --- PHASE 1: Verify Details & Send OTP ---
async function initiateUsernameRecovery() {
    const email = document.getElementById('uid_email').value.trim();
    const dob = document.getElementById('uid_dob').value;
    const mobile = document.getElementById('uid_mobile').value.trim();
    const captchaInput = document.getElementById('uid_captcha').value.trim();

    if(!email || !dob || !mobile) {
        alert("Please fill all fields.");
        return;
    }

    if(captchaInput.toUpperCase() !== generatedCaptcha) {
        alert("Invalid Captcha Code.");
        generateCaptcha();
        document.getElementById('uid_captcha').value = '';
        return;
    }

    setLoading('lookupBtn', true, 'VALIDATING...');

    try {
        // MOCK API CALL (Replace with actual fetch)
        // const response = await fetch('/api/auth/initiate-username-recovery', { ... });
        
        // Simulating Server Delay
        await new Promise(r => setTimeout(r, 1500));
        
        // Simulating Success
        const mockResponse = { success: true }; 

        if (mockResponse.success) {
            document.getElementById('lookupForm').style.display = 'none';
            document.getElementById('otpForm').style.display = 'block';
            document.querySelector('.reset-header p').textContent = 'An OTP has been sent to your email.';
            document.getElementById('otp_input').focus();
        }
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        setLoading('lookupBtn', false);
    }
}

// --- PHASE 2: Verify OTP ---
async function verifyUsernameOTP() {
    const otp = document.getElementById('otp_input').value.trim();
    if (otp.length !== 6) { alert('Enter valid 6-digit OTP'); return; }

    setLoading('otpBtn', true, 'VERIFYING...');

    try {
        // MOCK API CALL
        // const response = await fetch('/api/auth/verify-username-otp', { ... });
        await new Promise(r => setTimeout(r, 1500));

        // Mock Success Response with Profile Data
        const data = {
            success: true,
            profile: {
                name: "Aryan Sharma", // Mocked
                email: document.getElementById('uid_email').value,
                mobile: document.getElementById('uid_mobile').value,
                branch: "Computer Science"
            }
        };

        if (data.success) {
            // Populate Modal
            document.getElementById('p_name').textContent = data.profile.name;
            document.getElementById('p_email').textContent = data.profile.email;
            document.getElementById('p_mobile').textContent = data.profile.mobile;
            document.getElementById('p_branch').textContent = data.profile.branch;

            // Show Modal
            document.getElementById('mainContainer').style.display = 'none';
            document.getElementById('authModal').classList.add('active');
        }
    } catch (error) {
        alert("Invalid OTP");
    } finally {
        setLoading('otpBtn', false);
    }
}

// --- PHASE 3: Submit Request & Redirect ---
async function submitUsernameRequest() {
    const isChecked = document.getElementById('confirmRequest').checked;
    
    if (!isChecked) {
        alert("Please select the checkbox to confirm your request.");
        return;
    }

    setLoading('finalRequestBtn', true, 'SENDING REQUEST...');

    try {
        // MOCK API CALL
        await new Promise(r => setTimeout(r, 2000)); // Simulate 2s delay

        // Success Alert
        alert("Request Submitted! Your username will be emailed to you shortly.");
        
        // Redirect
        window.location.href = '/'; // Back to Homepage

    } catch (error) {
        alert("Submission Failed.");
    } finally {
        setLoading('finalRequestBtn', false);
    }
}

// Initialize
window.onload = function() {
    generateCaptcha();
};