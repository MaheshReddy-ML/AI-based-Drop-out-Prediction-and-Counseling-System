// ===== USER CREDENTIALS =====
const validCredentials = {
    's0001': { password: 'student123', role: 'student', name: 'John Doe', email: 'john.doe@example.com' },
    's0002': { password: 'student123', role: 'student', name: 'Jane Smith', email: 'jane.smith@example.com' },
    's0003': { password: 'student123', role: 'student', name: 'Mike Johnson', email: 'mike.johnson@example.com' },
    'm001': { password: 'mentor123', role: 'mentor', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@example.com' },
    'm002': { password: 'mentor123', role: 'mentor', name: 'Prof. Robert Wilson', email: 'robert.wilson@example.com' },
    'admin': { password: 'admin123', role: 'admin', name: 'System Administrator', email: 'admin@example.com' },
    'a001': { password: 'admin123', role: 'admin', name: 'Academic Director', email: 'director@example.com' }
};

let isLoginProcessing = false;
let animationTimeouts = [];

// ===== DOM ELEMENTS =====
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const door = document.getElementById('door');
const character = document.getElementById('character');
const passwordToggle = document.getElementById('passwordToggle');
const passwordInput = document.getElementById('password');
const eyeIcon = passwordToggle.querySelector('.eye-icon');
const eyeOffIcon = passwordToggle.querySelector('.eye-off-icon');

// ===== HELPER FUNCTIONS =====
const clearAllTimeouts = () => {
    animationTimeouts.forEach(timeout => clearTimeout(timeout));
    animationTimeouts = [];
};

const resetToBase = () => {
    clearAllTimeouts();
    character.classList.remove('emerge', 'retreat');
    character.classList.add('hidden');
    door.classList.remove('open', 'closed');
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    loginForm.style.animation = '';
    loginBtn.classList.remove('loading');
    loginBtn.textContent = 'Sign In';
    loginBtn.disabled = false;
    isLoginProcessing = false;
    loginBtn.style.background = '';
};

const reflow = (el) => void el.offsetWidth;

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Enhanced success animation sequence
const playSuccessAnimation = () => {
    // Step 1: Open door with enhanced timing
    door.classList.add('open');

    // Step 2: Character emerges after door is partially open
    animationTimeouts.push(setTimeout(() => {
        character.classList.remove('hidden');
        character.classList.add('emerge');

        // Add subtle door movement when character appears
        door.style.transform = 'translateX(-50%) perspective(400px) rotateY(-88deg)';
    }, 600));

    // Step 3: Character settles and door stabilizes
    animationTimeouts.push(setTimeout(() => {
        door.style.transform = 'translateX(-50%) perspective(400px) rotateY(-85deg)';
    }, 1200));
};

// Enhanced failure animation sequence
const playFailureAnimation = () => {
    // Character appears briefly then retreats
    character.classList.remove('emerge', 'hidden');
    reflow(character);
    character.classList.add('retreat');

    // Door slam sequence with multiple phases
    animationTimeouts.push(setTimeout(() => {
        character.classList.add('hidden');
        character.classList.remove('retreat');
        door.classList.add('closed');
    }, 800));

    // Clear door animation and error message
    animationTimeouts.push(setTimeout(() => {
        door.classList.remove('closed');
    }, 1600));
    
    animationTimeouts.push(setTimeout(() => {
        if (!isLoginProcessing) {
            errorMessage.classList.remove('show');
        }
    }, 2500));
};

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏢 PredictionPortal Login initialized successfully');
    console.log('📋 Demo credentials:');
    console.log('👨‍🎓 Students: s0001, s0002, s0003 (password: student123)');
    console.log('👨‍🏫 Mentors: m001, m002 (password: mentor123)');
    console.log('👨‍💼 Admins: admin, a001 (password: admin123)');
    
    // Add subtle entrance animation for the form
    loginForm.style.opacity = '0';
    loginForm.style.transform = 'translateY(20px)';
    setTimeout(() => {
        loginForm.style.transition = 'all 0.6s ease-out';
        loginForm.style.opacity = '1';
        loginForm.style.transform = 'translateY(0)';
    }, 300);
});

// Enhanced password toggle with animation
passwordToggle.addEventListener('click', function () {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    // Add rotation animation to the eye icon
    passwordToggle.style.transform = 'scale(0.8)';
    setTimeout(() => {
        eyeIcon.classList.toggle('hidden', isPassword);
        eyeOffIcon.classList.toggle('hidden', !isPassword);
        passwordToggle.style.transform = 'scale(1)';
    }, 100);
});

// Enhanced input focus effects
document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-1px)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

// Main login form handler with enhanced animations
loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (isLoginProcessing) return;
    isLoginProcessing = true;

    resetToBase();
    errorMessage.textContent = '';

    const usernameRaw = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const selectedRole = document.getElementById('role').value;

    // Enhanced form validation with better UX
    if (!usernameRaw || !password || !selectedRole) {
        errorMessage.textContent = 'All fields are required.';
        errorMessage.classList.add('show');
        
        // Highlight empty fields with animation
        [document.getElementById('username'), document.getElementById('password'), document.getElementById('role')]
            .forEach(field => {
                if (!field.value.trim()) {
                    field.style.borderColor = '#e53e3e';
                    field.style.animation = 'shake 0.5s ease-in-out';
                    setTimeout(() => {
                        field.style.borderColor = '';
                        field.style.animation = '';
                    }, 500);
                }
            });
        
        isLoginProcessing = false;
        return;
    }
    
    // Enhanced loading state
    loginBtn.classList.add('loading');
    loginBtn.textContent = 'Authenticating...';
    loginBtn.disabled = true;
    loginBtn.style.transform = 'scale(0.98)';

    // Realistic loading delay with progress indication
    await new Promise((resolve) => {
        let dots = 0;
        const loadingInterval = setInterval(() => {
            dots = (dots + 1) % 4;
            loginBtn.textContent = 'Authenticating' + '.'.repeat(dots);
        }, 200);
        
        setTimeout(() => {
            clearInterval(loadingInterval);
            resolve();
        }, 1000);
    });

    // Authentication logic
    let lookupKey = usernameRaw.toLowerCase();
    let userKey = null;

    if (isValidEmail(usernameRaw)) {
        userKey = Object.keys(validCredentials).find(k => 
            validCredentials[k].email.toLowerCase() === lookupKey
        );
    } else {
        userKey = Object.keys(validCredentials).find(k => 
            k.toLowerCase() === lookupKey
        );
    }

    const user = userKey ? validCredentials[userKey] : null;
    const isAuthenticated = user && user.password === password && user.role === selectedRole;

    if (isAuthenticated) {
        // SUCCESS SEQUENCE
        const currentUser = { id: userKey, ...user };

        loginBtn.classList.remove('loading');
        loginBtn.textContent = '✓ Success!';
        loginBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
        loginBtn.style.transform = 'scale(1)';
        successMessage.classList.add('show');

        // Enhanced success animation
        playSuccessAnimation();

        // Store user data and redirect with smooth transition
        animationTimeouts.push(setTimeout(() => {
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Add page transition effect
            document.body.style.transition = 'opacity 0.5s ease-out';
            document.body.style.opacity = '0';
            
            setTimeout(() => {
                if (selectedRole === 'student') {
                    window.location.href = '../student/student.html';
                } else if (selectedRole === 'mentor') {
                    window.location.href = '../mentor/mentor.html';
                } else if (selectedRole === 'admin') {
                    window.location.href = '../admin/admin.html';
                }
            }, 500);
        }, 1800));

    } else {
        // FAILURE SEQUENCE
        let errorText = 'Invalid credentials. Please try again.';
        if (!user) {
            errorText = 'User not found. Please check your credentials.';
        } else if (user.password !== password) {
            errorText = 'Incorrect password. Please try again.';
        } else if (user.role !== selectedRole) {
            errorText = `This account is registered as ${user.role}, not ${selectedRole}.`;
        }

        loginBtn.classList.remove('loading');
        loginBtn.textContent = '✗ Failed';
        loginBtn.style.background = 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)';
        loginBtn.disabled = false;
        errorMessage.textContent = errorText;
        errorMessage.classList.add('show');

        // Enhanced failure animation
        playFailureAnimation();

        // Form shake animation with better physics
        loginForm.style.animation = 'shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97)';
        
        // Reset button appearance after delay
        animationTimeouts.push(setTimeout(() => {
            loginBtn.textContent = 'Sign In';
            loginBtn.style.background = '';
            loginBtn.style.transform = '';
            loginForm.style.animation = '';
        }, 1000));

        // Reset processing state
        animationTimeouts.push(setTimeout(() => {
            isLoginProcessing = false;
        }, 1200));
    }
});

// Enhanced keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !isLoginProcessing) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName !== 'BUTTON') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    }
});

// Add smooth hover effects for interactive elements
document.querySelectorAll('input, select, button').forEach(element => {
    element.addEventListener('mouseenter', function() {
        if (!this.disabled) {
            this.style.transition = 'all 0.2s ease';
            this.style.transform = 'translateY(-1px)';
        }
    });
    
    element.addEventListener('mouseleave', function() {
        if (!this.disabled) {
            this.style.transform = 'translateY(0)';
        }
    });
});

// Add loading animation when page is about to unload
window.addEventListener('beforeunload', function() {
    document.body.style.transition = 'opacity 0.3s ease-out';
    document.body.style.opacity = '0';
});