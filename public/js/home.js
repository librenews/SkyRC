// SkyRC - Home Page
console.log('📄 SkyRC Home JavaScript loaded');

class SkyRCHome {
    constructor() {
        console.log('🏗️ SkyRCHome constructor called');
        this.user = null;
        this.sessionId = null;
        this.init();
    }

    init() {
        console.log('🚀 SkyRC Home initializing...');
        this.checkExistingSession();
        this.loadActiveRooms();
        console.log('✅ SkyRC Home initialized');
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
                <h2>Welcome back!</h2>
                <div class="user-welcome">
                    <p>Hello, ${this.user.displayName || this.user.handle}!</p>
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
                    <h2>Get Started</h2>
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

    // Load and display active rooms
    async loadActiveRooms() {
        console.log('🔄 loadActiveRooms called');
        const roomsList = document.getElementById('active-rooms-list');
        if (!roomsList) { 
            console.error('❌ active-rooms-list element not found'); 
            return; 
        }
        
        try {
            console.log('🌐 Fetching active rooms...');
            const response = await fetch('/api/rooms', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch rooms: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📊 Rooms data received:', data);
            
            if (data.success && data.data.rooms.length > 0) {
                this.displayActiveRooms(data.data.rooms);
            } else {
                this.displayNoRooms();
            }
        } catch (error) {
            console.error('❌ Error loading active rooms:', error);
            console.error('❌ Error details:', error.message);
            this.displayRoomsError();
        }
    }

    displayActiveRooms(rooms) {
        console.log('📋 Displaying active rooms:', rooms);
        const roomsList = document.getElementById('active-rooms-list');
        if (!roomsList) return;
        
        roomsList.innerHTML = rooms.map(room => `
            <div class="room-item" data-room="${room.name}" onclick="handleRoomClick('${room.name}')">
                <div class="room-info">
                    <div class="room-icon">#</div>
                    <span class="room-name">${room.name}</span>
                </div>
                <div class="room-user-count">
                    <span class="user-icon">👥</span>
                    <span>${room.userCount}</span>
                </div>
            </div>
        `).join('');
        
        // Event delegation as backup
        roomsList.addEventListener('click', (e) => {
            const roomItem = e.target.closest('.room-item');
            if (roomItem) {
                const roomName = roomItem.getAttribute('data-room');
                if (roomName) {
                    window.location.href = `/auth/login?room=${encodeURIComponent(roomName)}`;
                }
            }
        });
    }

    displayNoRooms() {
        console.log('📭 No active rooms found');
        const roomsList = document.getElementById('active-rooms-list');
        if (!roomsList) return;
        
        roomsList.innerHTML = `
            <div class="no-rooms">
                <p>No active rooms at the moment.</p>
                <p>Be the first to start a conversation!</p>
            </div>
        `;
    }

    displayRoomsError() {
        console.log('❌ Displaying rooms error');
        const roomsList = document.getElementById('active-rooms-list');
        if (!roomsList) return;
        
        roomsList.innerHTML = `
            <div class="no-rooms">
                <p>Unable to load active rooms.</p>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

// Global function for room clicks
window.handleRoomClick = (roomName) => {
    console.log('🏠 Room clicked:', roomName);
    if (roomName && roomName.trim()) {
        const cleanRoomName = roomName.trim();
        window.location.href = `/auth/login?room=${encodeURIComponent(cleanRoomName)}`;
    } else {
        console.error('❌ Invalid room name:', roomName);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing SkyRC Home...');
    new SkyRCHome();
});