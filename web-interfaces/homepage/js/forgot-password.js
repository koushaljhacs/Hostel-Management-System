/* homepage/js/forgot-password.js */

let currentResetToken = null;

// --- UTILITY: Loader & Button State ---
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

// --- PHASE 1: Initiate Recovery (Check User & Email) ---
async function initiateRecovery() {
    const username = document.getElementById('uid_username').value.trim();
    const email = document.getElementById('uid_email').value.trim();
    
    if (!username || !email) {
        alert('Please enter both username and email');
        return;
    }

    setLoading('lookupBtn', true, 'VALIDATING...');

    try {
        console.log('Sending request to /api/auth/initiate-reset');
        const response = await fetch('/api/auth/initiate-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email })
        });

        const data = await response.json();
        console.log('Response:', data);

        if (data.success) {
            // Match Found & OTP Sent
            document.getElementById('lookupForm').style.display = 'none';
            document.getElementById('otpForm').style.display = 'block';
            
            // Slight UI adjustment to keep height consistent
            document.querySelector('.reset-header p').textContent = 'An OTP has been sent to your registered email address.';
            
            // Auto-focus OTP input
            setTimeout(() => {
                document.getElementById('otp_input').focus();
            }, 300);
        } else {
            alert(data.error || 'No matching record found.');
        }
    } catch (error) {
        console.error('Initiate Recovery Error:', error);
        alert('Connection Error: ' + error.message);
    } finally {
        setLoading('lookupBtn', false);
    }
}

// --- PHASE 2: Verify OTP ---
async function verifyOTP() {
    const otp = document.getElementById('otp_input').value.trim();
    const username = document.getElementById('uid_username').value.trim();

    if (otp.length !== 6) {
        alert('Please enter a valid 6-digit OTP');
        return;
    }

    setLoading('otpBtn', true, 'VERIFYING...');

    try {
        console.log('Sending OTP verification request');
        const response = await fetch('/api/auth/verify-reset-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, otp })
        });

        const data = await response.json();
        console.log('OTP Response:', data);

        if (data.success) {
            // SECURITY: Server returns a short-lived JWT in data.resetToken
            currentResetToken = data.resetToken; 
            
            // Populate Profile Data for Audit
            const p = data.profile;
            document.getElementById('p_username').textContent = p.username;
            document.getElementById('p_name').textContent = p.full_name;
            document.getElementById('p_email').textContent = p.maskedEmail || p.email;
            document.getElementById('p_branch').textContent = p.branch || 'N/A';
            document.getElementById('p_course').textContent = p.course || 'N/A';
            
            // Hide Main Card, Show Modal
            document.getElementById('mainContainer').style.display = 'none';
            document.getElementById('authModal').classList.add('active');
        } else {
            alert(data.error || 'Invalid OTP. Please try again.');
        }
    } catch (error) {
        console.error('Verify OTP Error:', error);
        alert('System Error: ' + error.message);
    } finally {
        setLoading('otpBtn', false);
    }
}

// --- PHASE 3: Verify Identity & Slide ---
function enablePasswordReset() {
    // Slide the container to the left
    const track = document.getElementById('slideTrack');
    track.classList.add('slide-left');
    
    // Auto focus password field
    setTimeout(() => {
        document.getElementById('newPass').focus();
    }, 800);
}

// --- PHASE 4: Validate & Submit Password ---
function validateRealTime() {
    const p1 = document.getElementById('newPass').value;
    const p2 = document.getElementById('confirmPass').value;
    const bar = document.getElementById('strengthBar');
    const btn = document.getElementById('updateBtn');
    const msg = document.getElementById('validationMsg');

    // Regex: 8 chars, 1 letter, 1 number, 1 special
    const strongRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

    // Strength Bar Logic
    if (p1.length === 0) { 
        bar.style.width = '0%'; 
        bar.style.background = '#eee'; 
    }
    else if (p1.length < 6) { 
        bar.style.width = '30%'; 
        bar.style.background = '#d32f2f'; 
    }
    else if (!strongRegex.test(p1)) { 
        bar.style.width = '60%'; 
        bar.style.background = '#ffc107'; 
    }
    else { 
        bar.style.width = '100%'; 
        bar.style.background = '#2ecc71'; 
    }

    if (!strongRegex.test(p1)) {
        msg.textContent = "Password too weak (Min 8 chars, Alpha-numeric + Special)";
        msg.style.color = "#d32f2f";
        btn.disabled = true;
        return;
    }

    if (p1 !== p2) {
        msg.textContent = "Passwords do not match";
        msg.style.color = "#d32f2f";
        btn.disabled = true;
        return;
    }

    msg.textContent = "✓ Password is strong and matches";
    msg.style.color = "#2ecc71";
    btn.disabled = false;
}

async function submitNewPassword() {
    const password = document.getElementById('newPass').value;
    
    if (!currentResetToken) {
        alert('Security token missing. Please start over.');
        return;
    }

    setLoading('updateBtn', true, 'UPDATING...');

    try {
        console.log('Sending password reset request');
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentResetToken}`
            },
            body: JSON.stringify({ newPassword: password })
        });

        const data = await response.json();
        console.log('Password Reset Response:', data);

        if (data.success) {
            // Success Animation
            document.getElementById('authModal').classList.remove('active');
            document.getElementById('successOverlay').classList.add('active');
            
            setTimeout(() => {
                window.location.href = '/student-login';
            }, 2500);
        } else {
            alert(data.error || 'Update Failed. Token may have expired.');
        }
    } catch (error) {
        console.error('Submit Password Error:', error);
        alert('Network Error: ' + error.message);
    } finally {
        setLoading('updateBtn', false);
    }
}

// Enter key support
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('uid_username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') initiateRecovery();
    });
    
    document.getElementById('uid_email').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') initiateRecovery();
    });
    
    document.getElementById('otp_input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') verifyOTP();
    });
    
    document.getElementById('newPass').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('confirmPass').focus();
    });
    
    document.getElementById('confirmPass').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !document.getElementById('updateBtn').disabled) {
            submitNewPassword();
        }
    });
});