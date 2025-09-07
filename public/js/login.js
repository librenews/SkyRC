// SkyRC - Login Page
console.log('📄 SkyRC Login JavaScript loaded');

class SkyRCLogin {
    constructor() {
        console.log('🏗️ SkyRCLogin constructor called');
        this.user = null;
        this.sessionId = null;
        this.intendedRoom = null;
        this.init();
    }

    init() {
        console.log('🚀 SkyRC Login initializing...');
        this.intendedRoom = this.getRoomFromUrl();
        this.checkExistingSession();
        this.setupLoginForm();
        console.log('✅ SkyRC Login initialized');
    }

    // Get room from URL parameters
    getRoomFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const room = urlParams.get('room');
        console.log('🏠 Room from URL:', room || 'none');
        return room; // Return null if no room specified
    }

    async checkExistingSession() {
        console.log('🔍 Checking for existing session...');
        console.log('📱 User Agent:', navigator.userAgent);
        console.log('🍪 Current cookies:', document.cookie);
        console.log('🌐 Current URL:', window.location.href);
        
        // Try localStorage first, then cookies as fallback
        let savedSessionId = localStorage.getItem('skyrc_session_id');
        console.log('📦 Saved session ID from localStorage:', savedSessionId);
        
        // Fallback to cookies for mobile Safari
        if (!savedSessionId) {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'skyrc_session_id') {
                    savedSessionId = value;
                    console.log('🍪 Found session ID in cookies:', savedSessionId);
                    break;
                }
            }
        }
        
        if (savedSessionId) {
            try {
                console.log('🌐 Fetching session from server...');
                const response = await fetch(`/auth/session/${savedSessionId}`);
                console.log('📡 Session response status:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Session data received:', data);
                    this.user = data.user;
                    this.sessionId = savedSessionId;
                    console.log('👤 User logged in:', this.user);
                    this.updateUIForLoggedInUser();
                } else {
                    console.log('❌ Session invalid, removing from localStorage');
                    localStorage.removeItem('skyrc_session_id');
                    this.updateUIForLoggedOutUser();
                }
            } catch (error) {
                console.error('💥 Session check error:', error);
                localStorage.removeItem('skyrc_session_id');
                this.updateUIForLoggedOutUser();
            }
        } else {
            console.log('🚫 No saved session found');
            this.updateUIForLoggedOutUser();
        }
    }

    updateUIForLoggedInUser() {
        console.log('👤 Updating UI for logged-in user');
        
        const loginContent = document.getElementById('login-content');
        if (loginContent) {
            loginContent.innerHTML = `
                <!-- Home Logo Link -->
                <div class="form-header">
                    <a href="/" class="home-link">
                        <div class="logo">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <span class="logo-text">SkyRC</span>
                    </a>
                </div>
                <div class="user-welcome">
                    <p>Welcome back, ${this.user.displayName || this.user.handle}!</p>
                    <div class="cta-buttons">
                        <a href="/general" class="btn-primary">
                            <span class="btn-icon">💬</span>
                            <span>Go to Chat</span>
                        </a>
                        <button id="logout-btn" class="btn-secondary">
                            <span class="btn-icon">🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            `;
            
            // Add logout functionality
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    this.logout();
                });
            }
        }
    }

    updateUIForLoggedOutUser() {
        console.log('🚫 Updating UI for logged-out user');
        
        const loginContent = document.getElementById('login-content');
        if (loginContent) {
            // Check if form already exists (from HTML fallback)
            const existingForm = document.getElementById('login-form');
            if (!existingForm) {
                loginContent.innerHTML = `
                    <!-- Home Logo Link -->
                    <div class="form-header">
                        <a href="/" class="home-link">
                            <div class="logo">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <span class="logo-text">SkyRC</span>
                        </a>
                    </div>
                    <form id="login-form" class="login-form-content">
                        <div class="form-group">
                            <label for="handle-input">BlueSky Handle</label>
                            <input 
                                type="text" 
                                id="handle-input" 
                                class="handle-input"
                                placeholder="Enter your handle (e.g., alice.bsky.social)"
                                autocomplete="off"
                            >
                            <div id="handle-preview" class="handle-preview" style="display: none;"></div>
                        </div>
                        <button type="submit" class="btn-login">
                            <span class="btn-icon">🔑</span>
                            <span>Login with BlueSky</span>
                        </button>
                    </form>
                `;
            }
            
            // Add form functionality
            this.setupLoginForm();
        }
    }

    setupLoginForm() {
        const handleInput = document.getElementById('handle-input');
        const handlePreview = document.getElementById('handle-preview');
        const loginForm = document.getElementById('login-form');
        
        if (handleInput && handlePreview) {
            handleInput.addEventListener('input', () => {
                this.updateHandlePreview();
            });
        }
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
    }

    updateHandlePreview() {
        const handleInput = document.getElementById('handle-input');
        const handlePreview = document.getElementById('handle-preview');
        
        if (!handleInput || !handlePreview) return;
        
        const handle = handleInput.value.trim();
        
        if (handle) {
            // Clean the handle (remove @ if present)
            const cleanHandle = handle.replace(/^@/, '');
            handlePreview.textContent = `Will login as: @${cleanHandle}`;
            handlePreview.className = 'handle-preview valid';
            handlePreview.style.display = 'block';
        } else {
            handlePreview.style.display = 'none';
        }
    }

    login() {
        console.log('🔑 Starting login process...');
        
        const handleInput = document.getElementById('handle-input');
        const handle = handleInput ? handleInput.value.trim() : '';
        
        if (handle) {
            // Clean the handle (remove @ if present)
            const cleanHandle = handle.replace(/^@/, '');
            console.log('👤 Handle:', cleanHandle);
            
            // Redirect to auth login with handle
            window.location.href = `/auth/login?handle=${encodeURIComponent(cleanHandle)}`;
        } else {
            // Redirect to auth login without handle
            window.location.href = '/auth/login';
        }
    }

    logout() {
        console.log('🚪 Logging out...');
        
        if (this.sessionId) {
            fetch(`/auth/logout/${this.sessionId}`, { method: 'POST' })
                .catch(error => console.error('Logout error:', error));
        }
        
        localStorage.removeItem('skyrc_session_id');
        this.user = null;
        this.sessionId = null;
        this.updateUIForLoggedOutUser();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing SkyRC Login...');
    new SkyRCLogin();
});