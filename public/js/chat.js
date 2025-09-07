// SkyRC - Chat Page
console.log('📄 SkyRC Chat JavaScript loaded');

class SkyRCChat {
    constructor() {
        console.log('🏗️ SkyRCChat constructor called');
        this.socket = null;
        this.user = null;
        this.sessionId = null;
        this.currentRoom = 'general';
        this.isConnected = false;
        this.typingTimeout = null;
        
        // Session monitoring properties
        this.sessionRefreshInterval = null;
        this.sessionWarningTimeout = null;
        this.lastActivity = Date.now();
        this.sessionTimeoutWarning = 5 * 60 * 1000; // 5 minutes before expiration
        
        // URL-based room routing
        this.intendedRoom = this.getRoomFromUrl();
        
        this.init();
    }

    // Utility function to get session ID from localStorage or cookies
    getSessionId() {
        // Try localStorage first
        let sessionId = localStorage.getItem('skyrc_session_id');
        if (sessionId) {
            return sessionId;
        }
        
        // Fallback to cookies for mobile Safari
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'skyrc_session_id') {
                return value;
            }
        }
        
        return null;
    }

    // Utility function to set session ID in both localStorage and cookies
    setSessionId(sessionId) {
        try {
            localStorage.setItem('skyrc_session_id', sessionId);
        } catch (e) {
            console.warn('⚠️ localStorage not available:', e);
        }
        
        // Also set cookie as backup
        document.cookie = `skyrc_session_id=${sessionId}; path=/; max-age=86400; samesite=lax`;
    }

    // Utility function to clear session ID from both localStorage and cookies
    clearSessionId() {
        try {
            localStorage.removeItem('skyrc_session_id');
        } catch (e) {
            console.warn('⚠️ localStorage not available:', e);
        }
        
        // Clear cookie
        document.cookie = 'skyrc_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    init() {
        console.log('🚀 SkyRC Chat initializing...');
        this.setupEventListeners();
        this.checkExistingSession();
        this.updateRoomFromURL();
        console.log('✅ SkyRC Chat initialized');
    }

    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (messageInput && sendBtn) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
            
            messageInput.addEventListener('input', () => {
                this.handleTyping();
            });
        }

        // Room input
        const roomInput = document.getElementById('room-input');
        const joinRoomBtn = document.getElementById('join-room-btn');
        
        if (roomInput && joinRoomBtn) {
            roomInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleJoinRoom();
                }
            });
            
            roomInput.addEventListener('input', () => {
                this.validateRoomInput();
            });
            
            joinRoomBtn.addEventListener('click', () => {
                this.handleJoinRoom();
            });
        }

        // Room input and join button (mobile)
        const roomInputMobile = document.getElementById('room-input-mobile');
        const joinRoomBtnMobile = document.getElementById('join-room-btn-mobile');
        
        if (roomInputMobile && joinRoomBtnMobile) {
            roomInputMobile.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleJoinRoomMobile();
                }
            });
            
            joinRoomBtnMobile.addEventListener('click', () => {
                this.handleJoinRoomMobile();
            });
        }

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = mobileMenu.classList.contains('active');
                
                if (isActive) {
                    mobileMenu.classList.remove('active');
                } else {
                    mobileMenu.classList.add('active');
                }
            });
            
            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenu.classList.remove('active');
                }
            });
        }

        // Profile dropdown (desktop)
        const profileTrigger = document.getElementById('profile-trigger');
        const profileDropdown = document.getElementById('profile-dropdown');
        
        if (profileTrigger && profileDropdown) {
            profileTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = profileDropdown.classList.contains('active');
                
                // Close any other dropdowns
                document.querySelectorAll('.profile-dropdown.active').forEach(dropdown => {
                    if (dropdown !== profileDropdown) {
                        dropdown.classList.remove('active');
                        dropdown.previousElementSibling?.classList.remove('active');
                    }
                });
                
                // Toggle current dropdown
                if (isActive) {
                    profileDropdown.classList.remove('active');
                    profileTrigger.classList.remove('active');
                } else {
                    profileDropdown.classList.add('active');
                    profileTrigger.classList.add('active');
                }
            });
        }

        // Profile dropdown (mobile - old)
        const profileTriggerMobile = document.getElementById('profile-trigger-mobile');
        const profileDropdownMobile = document.getElementById('profile-dropdown-mobile');
        
        if (profileTriggerMobile && profileDropdownMobile) {
            profileTriggerMobile.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = profileDropdownMobile.classList.contains('active');
                
                // Close any other dropdowns
                document.querySelectorAll('.profile-dropdown.active').forEach(dropdown => {
                    if (dropdown !== profileDropdownMobile) {
                        dropdown.classList.remove('active');
                        dropdown.previousElementSibling?.classList.remove('active');
                    }
                });
                
                // Toggle current dropdown
                if (isActive) {
                    profileDropdownMobile.classList.remove('active');
                    profileTriggerMobile.classList.remove('active');
                } else {
                    profileDropdownMobile.classList.add('active');
                    profileTriggerMobile.classList.add('active');
                }
            });
        }

        // Profile dropdown (mobile - new simple avatar)
        const profileTriggerMobileSimple = document.getElementById('profile-trigger-mobile-simple');
        const profileDropdownMobileSimple = document.getElementById('profile-dropdown-mobile-simple');
        
        if (profileTriggerMobileSimple && profileDropdownMobileSimple) {
            profileTriggerMobileSimple.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = profileDropdownMobileSimple.classList.contains('show');
                
                // Close any other dropdowns
                document.querySelectorAll('.profile-dropdown.show').forEach(dropdown => {
                    if (dropdown !== profileDropdownMobileSimple) {
                        dropdown.classList.remove('show');
                    }
                });
                
                // Toggle current dropdown
                if (isActive) {
                    profileDropdownMobileSimple.classList.remove('show');
                } else {
                    profileDropdownMobileSimple.classList.add('show');
                }
            });
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (profileTrigger && profileDropdown && !profileTrigger.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
                profileTrigger.classList.remove('active');
            }
            if (profileTriggerMobile && profileDropdownMobile && !profileTriggerMobile.contains(e.target) && !profileDropdownMobile.contains(e.target)) {
                profileDropdownMobile.classList.remove('active');
                profileTriggerMobile.classList.remove('active');
            }
            if (profileTriggerMobileSimple && profileDropdownMobileSimple && !profileTriggerMobileSimple.contains(e.target) && !profileDropdownMobileSimple.contains(e.target)) {
                profileDropdownMobileSimple.classList.remove('show');
            }
        });

        // Logout buttons (desktop and mobile)
        const logoutBtn = document.getElementById('logout-btn');
        const logoutBtnMobile = document.getElementById('logout-btn-mobile');
        const logoutBtnMobileSimple = document.getElementById('logout-btn-mobile-simple');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', () => {
                this.logout();
            });
        }

        if (logoutBtnMobileSimple) {
            logoutBtnMobileSimple.addEventListener('click', () => {
                this.logout();
            });
        }

        // Activity tracking
        document.addEventListener('click', () => this.trackActivity());
        document.addEventListener('keypress', () => this.trackActivity());
        document.addEventListener('scroll', () => this.trackActivity());
    }

    // Get room from URL path
    getRoomFromUrl() {
        const path = window.location.pathname;
        const room = path.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '');
        console.log('🏠 Room from URL:', room || 'general');
        return room || 'general';
    }

    updateRoomFromURL() {
        this.currentRoom = this.getRoomFromUrl();
        console.log('🏠 Current room set to:', this.currentRoom);
        
        // Update room display
        const roomNameEl = document.getElementById('room-name');
        if (roomNameEl) {
            roomNameEl.textContent = `#${this.currentRoom}`;
        }
    }

    async checkExistingSession() {
        console.log('🔍 Checking for existing session...');
        console.log('📱 User Agent:', navigator.userAgent);
        console.log('🍪 Current cookies:', document.cookie);
        console.log('🌐 Current URL:', window.location.href);
        
        const savedSessionId = this.getSessionId();
        console.log('📦 Saved session ID:', savedSessionId);
        
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
                    this.showChatScreen();
                    this.connectSocket();
                } else {
                    console.log('❌ Session invalid, redirecting to login');
                    this.clearSessionId();
                    window.location.href = '/auth/login';
                }
            } catch (error) {
                console.error('💥 Session check error:', error);
                this.clearSessionId();
                window.location.href = '/auth/login';
            }
        } else {
            console.log('🚫 No saved session found, redirecting to login');
            window.location.href = '/auth/login';
        }
    }

    showChatScreen() {
        console.log('💬 Showing chat screen');
        document.getElementById('chat-screen').classList.add('active');
        document.getElementById('loading-screen').classList.remove('active');
        
        // Update user info
        if (this.user) {
            const userNameEl = document.getElementById('user-name');
            const userAvatarEl = document.getElementById('user-avatar');
            const userAvatarMobileSimpleEl = document.getElementById('user-avatar-mobile-simple');
            
            if (userNameEl) {
                userNameEl.textContent = this.user.displayName || this.user.handle;
            }
            
            if (userAvatarEl && this.user.avatar) {
                userAvatarEl.src = this.user.avatar;
                userAvatarEl.alt = this.user.displayName || this.user.handle;
            }

            if (userAvatarMobileSimpleEl && this.user.avatar) {
                userAvatarMobileSimpleEl.src = this.user.avatar;
                userAvatarMobileSimpleEl.alt = this.user.displayName || this.user.handle;
            }
        }
        
        // Start session monitoring
        this.startSessionMonitoring();
    }

    connectSocket() {
        if (this.socket) {
            this.socket.disconnect();
        }

        console.log('🔌 Connecting to socket...');
        this.socket = io({
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected:', this.socket.id);
            this.isConnected = true;
            
            // Join the current room
            this.joinRoom(this.currentRoom);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
            this.isConnected = false;
        });

        this.socket.on('new-message', (message) => {
            this.displayMessage(message);
        });

        this.socket.on('user-joined', (data) => {
            this.updateUserCount(data.roomInfo.userCount);
            this.showNotification(`${data.user.displayName || data.user.handle} joined the room`, 'info');
        });

        this.socket.on('user-left', (data) => {
            this.updateUserCount(data.roomInfo.userCount);
            this.showNotification(`${data.user.displayName || data.user.handle} left the room`, 'info');
        });

        this.socket.on('room-joined', (data) => {
            console.log('🏠 Joined room:', data.room);
            this.currentRoom = data.room;
            this.updateUserCount(data.roomInfo.userCount);
            this.updateRoomDisplay(data.room);
        });

        this.socket.on('user-typing', (data) => {
            this.showTypingIndicator(data.user);
        });

        this.socket.on('user-stopped-typing', (data) => {
            this.hideTypingIndicator(data.user);
        });

        this.socket.on('error', (error) => {
            console.error('💥 Socket error:', error);
            this.showNotification(error.message || 'An error occurred', 'error');
        });
    }

    joinRoom(room) {
        if (!this.socket || !this.isConnected || !this.user) {
            console.log('❌ Cannot join room - socket not connected or user not logged in');
            return;
        }

        console.log('🏠 Joining room:', room);
        
        // Validate room name
        const validation = this.validateRoomName(room);
        if (!validation.valid) {
            this.showNotification(validation.message, 'error');
            return;
        }

        this.socket.emit('join-room', {
            room: room,
            user: this.user
        });
    }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message || !this.socket || !this.isConnected) {
            return;
        }

        console.log('📤 Sending message:', message);
        
        this.socket.emit('send-message', {
            message: message,
            room: this.currentRoom
        });

        messageInput.value = '';
        this.trackActivity();
    }

    displayMessage(message) {
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        messageEl.innerHTML = `
            <div class="message-header">
                <img src="${message.user.avatar || '/default-avatar.png'}" alt="${message.user.displayName || message.user.handle}" class="message-avatar">
                <div class="message-info">
                    <span class="message-username">${message.user.displayName || message.user.handle}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
            </div>
            <div class="message-content">${this.escapeHtml(message.message)}</div>
        `;

        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateUserCount(count) {
        // Update mobile user count
        const userCountEl = document.getElementById('user-count');
        if (userCountEl) {
            userCountEl.textContent = `${count} user${count !== 1 ? 's' : ''}`;
        }
        
        // Update desktop user count
        const userCountDesktopEl = document.getElementById('user-count-desktop');
        if (userCountDesktopEl) {
            userCountDesktopEl.textContent = `${count} user${count !== 1 ? 's' : ''}`;
        }
    }

    updateRoomDisplay(room) {
        // Update mobile room name
        const roomNameEl = document.getElementById('room-name');
        if (roomNameEl) {
            roomNameEl.textContent = `#${room}`;
        }
        
        // Update desktop room name
        const roomNameDesktopEl = document.getElementById('room-name-desktop');
        if (roomNameDesktopEl) {
            roomNameDesktopEl.textContent = `#${room}`;
        }
        
        // Update URL without page reload
        if (room !== 'general') {
            window.history.pushState({}, '', `/${room}`);
        } else {
            window.history.pushState({}, '', '/');
        }
    }

    handleTyping() {
        if (!this.socket || !this.isConnected) {
            return;
        }

        this.socket.emit('typing', { room: this.currentRoom });

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.socket.emit('typing-stop', { room: this.currentRoom });
        }, 1000);
    }

    showTypingIndicator(user) {
        const typingEl = document.getElementById('typing-indicator');
        if (!typingEl) return;

        typingEl.innerHTML = `<span>${user.displayName || user.handle} is typing...</span>`;
        typingEl.style.display = 'block';
    }

    hideTypingIndicator(user) {
        const typingEl = document.getElementById('typing-indicator');
        if (!typingEl) return;

        typingEl.style.display = 'none';
    }

    showNotification(message, type = 'info') {
        // Simple notification - could be enhanced with a proper notification system
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }

    logout() {
        console.log('🚪 Logging out...');
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        if (this.sessionId) {
            fetch(`/auth/logout/${this.sessionId}`, { method: 'POST' })
                .catch(error => console.error('Logout error:', error));
        }
        
        this.clearSessionId();
        this.stopSessionMonitoring();
        
        window.location.href = '/';
    }

    // Room validation and handling
    validateRoomName(roomName) {
        if (!roomName || typeof roomName !== 'string') {
            return { valid: false, message: 'Room name is required' };
        }
        
        const cleanRoom = roomName.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '');
        
        if (!cleanRoom) {
            return { valid: false, message: 'Invalid room name: Room name cannot be empty' };
        }
        
        if (cleanRoom.length < 1) {
            return { valid: false, message: 'Invalid room name: Room name must be at least 1 character long' };
        }
        
        if (cleanRoom.length > 50) {
            return { valid: false, message: 'Invalid room name: Room name must be 50 characters or less' };
        }
        
        if (cleanRoom.startsWith('-') || cleanRoom.startsWith('_') || 
            cleanRoom.endsWith('-') || cleanRoom.endsWith('_')) {
            return { valid: false, message: 'Invalid room name: Room name cannot start or end with dashes or underscores' };
        }
        
        if (cleanRoom.includes('--') || cleanRoom.includes('__') || 
            cleanRoom.includes('-_') || cleanRoom.includes('_-')) {
            return { valid: false, message: 'Invalid room name: Room name cannot contain consecutive dashes or underscores' };
        }
        
        return { valid: true, message: 'Valid room name' };
    }

    handleJoinRoom() {
        const roomInput = document.getElementById('room-input');
        if (!roomInput) return;

        const roomName = roomInput.value.trim();
        if (!roomName) return;

        const validation = this.validateRoomName(roomName);
        if (!validation.valid) {
            this.showNotification(validation.message, 'error');
            return;
        }

        const cleanRoom = roomName.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '');
        this.joinRoom(cleanRoom);
        
        // Clear the input
        roomInput.value = '';
        this.validateRoomInput();
    }

    handleJoinRoomMobile() {
        const roomInputMobile = document.getElementById('room-input-mobile');
        if (!roomInputMobile) return;

        const roomName = roomInputMobile.value.trim();
        if (!roomName) return;

        const validation = this.validateRoomName(roomName);
        if (!validation.valid) {
            this.showNotification(validation.message, 'error');
            return;
        }

        // Join the room
        this.joinRoom(roomName);
        
        // Clear input and close mobile menu
        roomInputMobile.value = '';
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.remove('active');
        }
    }

    validateRoomInput() {
        const roomInput = document.getElementById('room-input');
        const joinRoomBtn = document.getElementById('join-room-btn');
        
        if (!roomInput || !joinRoomBtn) return;

        const roomName = roomInput.value.trim();
        const validation = this.validateRoomName(roomName);
        
        // Update button state
        joinRoomBtn.disabled = !validation.valid || !roomName;
        
        // Update input styling
        if (roomName && !validation.valid) {
            roomInput.style.borderColor = '#ef4444';
            roomInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        } else {
            roomInput.style.borderColor = '#e5e7eb';
            roomInput.style.boxShadow = 'none';
        }
    }

    // Session monitoring methods
    startSessionMonitoring() {
        console.log('🔄 Starting session monitoring...');
        
        // Refresh session every 5 minutes
        this.sessionRefreshInterval = setInterval(() => {
            this.refreshSession();
        }, 5 * 60 * 1000);
        
        // Show warning 5 minutes before expiration
        this.sessionWarningTimeout = setTimeout(() => {
            this.showSessionWarning();
        }, 2 * 60 * 60 * 1000 - 5 * 60 * 1000); // 2 hours - 5 minutes
    }

    stopSessionMonitoring() {
        console.log('⏹️ Stopping session monitoring...');
        
        if (this.sessionRefreshInterval) {
            clearInterval(this.sessionRefreshInterval);
            this.sessionRefreshInterval = null;
        }
        
        if (this.sessionWarningTimeout) {
            clearTimeout(this.sessionWarningTimeout);
            this.sessionWarningTimeout = null;
        }
    }

    async refreshSession() {
        if (!this.sessionId) return;
        
        try {
            const response = await fetch(`/auth/session/${this.sessionId}/refresh`, {
                method: 'POST'
            });
            
            if (response.ok) {
                console.log('✅ Session refreshed');
                this.lastActivity = Date.now();
            } else {
                console.log('❌ Session refresh failed');
                this.handleSessionExpired();
            }
        } catch (error) {
            console.error('💥 Session refresh error:', error);
            this.handleSessionExpired();
        }
    }

    trackActivity() {
        this.lastActivity = Date.now();
    }

    showSessionWarning() {
        this.showNotification('Your session will expire in 5 minutes. Click anywhere to extend it.', 'warning');
    }

    handleSessionExpired() {
        this.stopSessionMonitoring();
        this.logout();
        this.showNotification('Your session has expired. Please log in again.', 'warning');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the chat page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded, initializing SkyRC Chat');
    window.skyrcChat = new SkyRCChat();
});
