// SkyRC - Simple Chat Application
console.log('📄 SkyRC JavaScript file loaded');

class SkyRCApp {
    constructor() {
        console.log('🏗️ SkyRCApp constructor called');
        this.socket = null;
        this.user = null;
        this.sessionId = null;
        this.currentRoom = 'general';
        this.isConnected = false;
        this.typingTimeout = null;
        
        // Session monitoring
        this.sessionRefreshInterval = null;
        this.sessionWarningTimeout = null;
        this.lastActivity = Date.now();
        this.sessionTimeoutWarning = 5 * 60 * 1000; // 5 minutes before expiration
        
        // URL-based room routing
        this.intendedRoom = this.getRoomFromUrl();
        
        this.init();
    }

    init() {
        console.log('🚀 SkyRC App initializing...');
        this.setupEventListeners();
        this.checkExistingSession();
        this.updateRoomFromURL();
        
        // Load active rooms after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.loadActiveRooms();
        }, 100);
        
        console.log('✅ SkyRC App initialized');
    }

    setupEventListeners() {
        // Login button
        document.getElementById('login-btn').addEventListener('click', () => {
            this.login();
        });

        // Handle input changes for handle field
        const handleInput = document.getElementById('handle-input');
        if (handleInput) {
            handleInput.addEventListener('input', () => this.updateHandlePreview());
        }

        // Room input event listeners
        const roomInput = document.getElementById('room-input');
        const joinRoomBtn = document.getElementById('join-room-btn');
        
        if (roomInput) {
            roomInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleJoinRoom();
                }
            });
            
            roomInput.addEventListener('input', () => {
                this.validateRoomInput();
            });
        }
        
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => {
                this.handleJoinRoom();
            });
        }

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Message form
        document.getElementById('message-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Message input typing
        document.getElementById('message-input').addEventListener('input', () => {
            this.handleTyping();
        });

        // URL change detection
        window.addEventListener('popstate', () => {
            this.updateRoomFromURL();
        });

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            this.updateRoomFromURL();
        });
    }

    async checkExistingSession() {
        console.log('🔍 Checking for existing session...');
        const savedSessionId = localStorage.getItem('skyrc_session_id');
        console.log('📦 Saved session ID from localStorage:', savedSessionId);
        
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
                    console.log('❌ Session invalid, removing from localStorage');
                    localStorage.removeItem('skyrc_session_id');
                    this.showLoginScreen();
                }
            } catch (error) {
                console.error('💥 Session check error:', error);
                localStorage.removeItem('skyrc_session_id');
                this.showLoginScreen();
            }
        } else {
            console.log('🚫 No saved session found, showing login screen');
            this.showLoginScreen();
        }
    }

    updateHandlePreview() {
        const handleInput = document.getElementById('handle-input');
        const handle = handleInput.value.trim();
        
        // Update the help text to show which PDS will be used
        let helpText = document.querySelector('.input-help');
        if (!helpText) {
            helpText = document.createElement('div');
            helpText.className = 'input-help';
            handleInput.parentNode.appendChild(helpText);
        }
        
        if (handle) {
            // Extract domain from handle
            let domain = 'bsky.social';
            if (handle.includes('@')) {
                const parts = handle.split('@');
                if (parts.length === 2) {
                    domain = parts[1];
                }
            } else if (handle.includes('.')) {
                domain = handle;
            }
            
            if (domain === 'bsky.social') {
                helpText.textContent = 'Will use bsky.social (default)';
                helpText.style.color = '#6b7280';
            } else {
                helpText.textContent = `Will attempt to use custom PDS for ${domain}`;
                helpText.style.color = '#3b82f6';
            }
        } else {
            helpText.textContent = 'Leave empty for bsky.social, or enter your custom domain handle';
            helpText.style.color = '#6b7280';
        }
    }

    async login() {
        console.log('🔐 Login button clicked - starting OAuth flow...');
        const loginBtn = document.getElementById('login-btn');
        const handleInput = document.getElementById('handle-input');
        const originalText = loginBtn.innerHTML;
        
        // Get the handle from the input field
        const handle = handleInput.value.trim();
        console.log('👤 Handle from input:', handle || 'none');
        
        loginBtn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div><span>Connecting...</span>';
        loginBtn.disabled = true;

        try {
            console.log('🌐 Requesting OAuth authorization URL from server...');
            
            // Build the login URL with handle and room parameters
            let loginUrl = '/auth/login';
            const params = new URLSearchParams();
            
            if (handle) {
                params.append('handle', handle);
                console.log('👤 Handle parameter:', handle);
            }
            
            // Include the intended room in the OAuth request
            if (this.intendedRoom && this.intendedRoom !== 'general') {
                params.append('room', this.intendedRoom);
                console.log('🏠 Room parameter:', this.intendedRoom);
            }
            
            if (params.toString()) {
                loginUrl += `?${params.toString()}`;
            }
            
            console.log('🔗 Final login URL:', loginUrl);
            
            const response = await fetch(loginUrl);
            console.log('📡 Login response status:', response.status);
            
            const data = await response.json();
            console.log('📋 Login response data:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate login');
            }

            console.log('🔗 OAuth URL received, redirecting to:', data.authUrl);
            // Redirect to OAuth URL (stay in same window)
            window.location.href = data.authUrl;
            
        } catch (error) {
            console.error('💥 Login failed:', error);
            alert('Login failed. Please try again.');
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    }

    async logout() {
        try {
            if (this.sessionId) {
                await fetch(`/auth/logout/${this.sessionId}`, {
                    method: 'POST',
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.user = null;
            this.sessionId = null;
            localStorage.removeItem('skyrc_session_id');
            this.disconnectSocket();
            this.stopSessionMonitoring();
            this.showLoginScreen();
        }
    }

    connectSocket() {
        this.socket = io({
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.updateConnectionStatus();
            this.joinRoom(this.currentRoom);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus();
        });

        this.socket.on('room-joined', (data) => {
            console.log('Joined room:', data.room);
            this.updateRoomInfo(data.roomInfo);
            this.clearMessages();
        });

        this.socket.on('new-message', (message) => {
            this.addMessage(message);
        });

        this.socket.on('user-joined', (data) => {
            this.updateRoomInfo(data.roomInfo);
            this.showNotification(`${data.user.displayName || data.user.handle} joined the room`);
        });

        this.socket.on('user-left', (data) => {
            this.updateRoomInfo(data.roomInfo);
            this.showNotification(`${data.user.displayName || data.user.handle} left the room`);
        });

        this.socket.on('user-typing', (data) => {
            this.showTypingIndicator(data.user);
        });

        this.socket.on('user-stopped-typing', (data) => {
            this.hideTypingIndicator(data.user);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error.message);
            this.showNotification('Error: ' + error.message, 'error');
        });
    }

    disconnectSocket() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.updateConnectionStatus();
    }

    joinRoom(room) {
        if (!this.socket || !this.user) {
            console.warn('Cannot join room: socket or user not available');
            return;
        }

        // Validate room name before attempting to join
        const validation = this.validateRoomName(room);
        if (!validation.valid) {
            this.showNotification(validation.error, 'error');
            return;
        }

        console.log(`Joining room: ${validation.cleanRoom}`);
        this.socket.emit('join-room', { room: validation.cleanRoom, user: this.user });
    }

    sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (message && this.socket && this.isConnected) {
            this.socket.emit('send-message', { 
                message, 
                room: this.currentRoom 
            });
            input.value = '';
            this.stopTyping();
        }
    }

    handleTyping() {
        if (this.socket && this.isConnected) {
            this.startTyping();
            
            if (this.typingTimeout) {
                clearTimeout(this.typingTimeout);
            }
            
            this.typingTimeout = setTimeout(() => {
                this.stopTyping();
            }, 3000);
        }
    }

    startTyping() {
        if (this.socket && this.isConnected) {
            this.socket.emit('typing-start', { room: this.currentRoom });
        }
    }

    stopTyping() {
        if (this.socket && this.isConnected) {
            this.socket.emit('typing-stop', { room: this.currentRoom });
        }
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }

    updateRoomFromURL() {
        const path = window.location.pathname;
        const room = path.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '') || 'general';
        
        if (room !== this.currentRoom) {
            this.currentRoom = room;
            if (this.socket && this.user && this.isConnected) {
                this.joinRoom(room);
            }
        }
        
        this.updateRoomDisplay();
    }

    updateRoomDisplay() {
        document.getElementById('room-name').textContent = `#${this.currentRoom}`;
        document.getElementById('message-input').placeholder = `Message #${this.currentRoom}...`;
    }

    addMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = this.createMessageElement(message);
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message) {
        const isOwn = this.user && message.user.did === this.user.did;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''}`;
        
        const avatar = message.user.avatar 
            ? `<img src="${message.user.avatar}" alt="${message.user.displayName || message.user.handle}" class="message-avatar">`
            : `<div class="message-avatar" style="background: #e5e7eb; display: flex; align-items: center; justify-content: center; color: #6b7280; font-weight: 600;">${(message.user.displayName || message.user.handle).charAt(0).toUpperCase()}</div>`;
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            ${avatar}
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${message.user.displayName || message.user.handle}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-bubble">${this.escapeHtml(message.message)}</div>
            </div>
        `;
        
        return messageDiv;
    }

    clearMessages() {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">💬</div>
                <p>Welcome to #${this.currentRoom}! Start the conversation.</p>
            </div>
        `;
    }

    updateRoomInfo(roomInfo) {
        document.getElementById('user-count').textContent = roomInfo.userCount;
    }

    updateConnectionStatus() {
        const indicator = document.getElementById('connection-indicator');
        const text = document.getElementById('connection-text');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (this.isConnected) {
            indicator.className = 'status-dot connected';
            text.textContent = 'Connected';
            messageInput.disabled = false;
            sendBtn.disabled = false;
        } else {
            indicator.className = 'status-dot disconnected';
            text.textContent = 'Disconnected';
            messageInput.disabled = true;
            sendBtn.disabled = true;
        }
    }

    showTypingIndicator(user) {
        const indicator = document.getElementById('typing-indicator');
        const text = document.getElementById('typing-text');
        
        text.textContent = `${user.displayName || user.handle} is typing...`;
        indicator.classList.remove('hidden');
    }

    hideTypingIndicator(user) {
        const indicator = document.getElementById('typing-indicator');
        indicator.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        // Simple notification - could be enhanced with a proper notification system
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    showLoginScreen() {
        console.log('📱 Showing login screen');
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('chat-screen').classList.remove('active');
        
        // Stop session monitoring
        this.stopSessionMonitoring();
    }

    showChatScreen() {
        console.log('💬 Showing chat screen');
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('chat-screen').classList.add('active');
        
        // Update user info
        if (this.user) {
            document.getElementById('user-name').textContent = this.user.displayName || this.user.handle;
            if (this.user.avatar) {
                document.getElementById('user-avatar').src = this.user.avatar;
                document.getElementById('user-avatar').style.display = 'block';
            } else {
                document.getElementById('user-avatar').style.display = 'none';
            }
        }
        
        // Start session monitoring
        this.startSessionMonitoring();
        
        // Join the intended room (from URL or default to general)
        this.currentRoom = this.intendedRoom;
        console.log('🏠 Setting current room to:', this.currentRoom);
        
        this.updateRoomDisplay();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Room name validation utility
    validateRoomName(roomName) {
        if (!roomName || typeof roomName !== 'string') {
            return { valid: false, error: 'Room name is required' };
        }

        // Remove leading slash if present
        const cleanRoom = roomName.replace(/^\//, '');

        // Check if empty after cleaning
        if (!cleanRoom) {
            return { valid: false, error: 'Room name cannot be empty' };
        }

        // Check length
        if (cleanRoom.length < 1) {
            return { valid: false, error: 'Room name must be at least 1 character long' };
        }

        if (cleanRoom.length > 50) {
            return { valid: false, error: 'Room name must be 50 characters or less' };
        }

        // Check for invalid characters (only alphanumeric, dashes, underscores allowed)
        if (!/^[a-zA-Z0-9_-]+$/.test(cleanRoom)) {
            return { valid: false, error: 'Room name can only contain letters, numbers, dashes, and underscores' };
        }

        // Check if starts or ends with special characters
        if (cleanRoom.startsWith('-') || cleanRoom.startsWith('_') || 
            cleanRoom.endsWith('-') || cleanRoom.endsWith('_')) {
            return { valid: false, error: 'Room name cannot start or end with dashes or underscores' };
        }

        // Check for consecutive special characters
        if (cleanRoom.includes('--') || cleanRoom.includes('__') || 
            cleanRoom.includes('-_') || cleanRoom.includes('_-')) {
            return { valid: false, error: 'Room name cannot contain consecutive dashes or underscores' };
        }

        return { valid: true, cleanRoom };
    }

    // Sanitize room name for display
    sanitizeRoomName(roomName) {
        if (!roomName) return '';
        return roomName.replace(/^\//, '').replace(/[^a-zA-Z0-9_-]/g, '');
    }

    // Extract room name from URL
    getRoomFromUrl() {
        const path = window.location.pathname;
        console.log('🌐 Current URL path:', path);
        
        // Remove leading slash and get the first segment
        const segments = path.replace(/^\//, '').split('/');
        const roomSegment = segments[0];
        
        if (!roomSegment || roomSegment === '') {
            console.log('🏠 No room in URL, using default: general');
            return 'general';
        }
        
        // Validate the room name
        const validation = this.validateRoomName(roomSegment);
        if (validation.valid) {
            console.log('🏠 Room extracted from URL:', validation.cleanRoom);
            return validation.cleanRoom;
        } else {
            console.log('⚠️ Invalid room in URL:', roomSegment, 'Error:', validation.error);
            console.log('🏠 Using default room: general');
            return 'general';
        }
    }

    // Handle room input validation and joining
    handleJoinRoom() {
        const roomInput = document.getElementById('room-input');
        if (!roomInput) return;

        const roomName = roomInput.value.trim();
        if (!roomName) {
            this.showNotification('Please enter a room name', 'error');
            return;
        }

        // Validate room name
        const validation = this.validateRoomName(roomName);
        if (!validation.valid) {
            this.showNotification(validation.error, 'error');
            return;
        }

        // Join the room
        this.joinRoom(validation.cleanRoom);
        
        // Clear the input
        roomInput.value = '';
        this.validateRoomInput();
    }

    // Validate room input in real-time
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

    // Load and display active rooms
    async loadActiveRooms() {
        console.log('🔄 loadActiveRooms called');
        const roomsList = document.getElementById('active-rooms-list');
        console.log('📋 roomsList element:', roomsList);
        
        if (!roomsList) {
            console.error('❌ active-rooms-list element not found');
            return;
        }

        try {
            console.log('🔄 Loading active rooms...');
            console.log('🌐 Making fetch request to /api/rooms');
            
            const response = await fetch('/api/rooms', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch rooms: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📋 Active rooms data:', data);
            
            if (data.success && data.data.rooms.length > 0) {
                console.log('✅ Displaying active rooms');
                this.displayActiveRooms(data.data.rooms);
            } else {
                console.log('📭 No active rooms, displaying empty state');
                this.displayNoRooms();
            }
        } catch (error) {
            console.error('❌ Error loading active rooms:', error);
            console.error('❌ Error details:', error.message);
            this.displayRoomsError();
        }
    }

    // Display active rooms
    displayActiveRooms(rooms) {
        const roomsList = document.getElementById('active-rooms-list');
        if (!roomsList) return;

        console.log('🎯 Displaying active rooms:', rooms);

        roomsList.innerHTML = rooms.map(room => `
            <div class="room-item" data-room="${room.name}" onclick="handleRoomClick('${room.name}')">
                <div class="room-info">
                    <span class="room-icon">💬</span>
                    <span class="room-name">#${room.name}</span>
                </div>
                <div class="room-user-count">
                    <span class="user-icon">👥</span>
                    <span>${room.userCount}</span>
                </div>
            </div>
        `).join('');

        // Add event delegation as backup
        roomsList.addEventListener('click', (e) => {
            const roomItem = e.target.closest('.room-item');
            if (roomItem) {
                const roomName = roomItem.getAttribute('data-room');
                console.log('🎯 Event delegation - Room clicked:', roomName);
                if (roomName) {
                    window.location.href = `/auth/login?room=${encodeURIComponent(roomName)}`;
                }
            }
        });
    }

    // Display no rooms message
    displayNoRooms() {
        console.log('📭 displayNoRooms called');
        const roomsList = document.getElementById('active-rooms-list');
        if (!roomsList) {
            console.error('❌ roomsList not found in displayNoRooms');
            return;
        }

        console.log('📝 Setting no rooms HTML');
        roomsList.innerHTML = `
            <div class="no-rooms">
                <p>No active rooms at the moment.</p>
                <p>Be the first to join a room!</p>
            </div>
        `;
        console.log('✅ No rooms HTML set');
    }

    // Display rooms error
    displayRoomsError() {
        const roomsList = document.getElementById('active-rooms-list');
        if (!roomsList) return;

        roomsList.innerHTML = `
            <div class="no-rooms">
                <p>Unable to load active rooms.</p>
                <p>Please try again later.</p>
            </div>
        `;
    }

    // Session monitoring methods
    startSessionMonitoring() {
        console.log('🔄 Starting session monitoring...');
        
        // Refresh session every 5 minutes
        this.sessionRefreshInterval = setInterval(() => {
            this.refreshSession();
        }, 5 * 60 * 1000);
        
        // Track user activity
        this.trackActivity();
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

    trackActivity() {
        // Track various user activities
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const updateActivity = () => {
            this.lastActivity = Date.now();
        };
        
        events.forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });
    }

    async refreshSession() {
        if (!this.sessionId) return;
        
        try {
            console.log('🔄 Refreshing session...');
            const response = await fetch(`/auth/session/${this.sessionId}/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Session refreshed successfully');
                
                // Schedule warning if session will expire soon
                this.scheduleSessionWarning(data.timeUntilExpiration);
                
            } else if (response.status === 401) {
                console.log('⏰ Session expired, logging out');
                this.handleSessionExpired();
            } else {
                console.error('❌ Session refresh failed:', response.status);
            }
        } catch (error) {
            console.error('💥 Session refresh error:', error);
        }
    }

    scheduleSessionWarning(timeUntilExpiration) {
        // Clear existing warning timeout
        if (this.sessionWarningTimeout) {
            clearTimeout(this.sessionWarningTimeout);
        }
        
        // Schedule warning 5 minutes before expiration
        const warningTime = timeUntilExpiration - this.sessionTimeoutWarning;
        
        if (warningTime > 0) {
            this.sessionWarningTimeout = setTimeout(() => {
                this.showSessionWarning();
            }, warningTime);
        }
    }

    showSessionWarning() {
        console.log('⚠️ Showing session timeout warning');
        
        // Create warning modal
        const modal = document.createElement('div');
        modal.className = 'session-warning-modal';
        modal.innerHTML = `
            <div class="session-warning-content">
                <h3>⚠️ Session Expiring Soon</h3>
                <p>Your session will expire in 5 minutes due to inactivity.</p>
                <p>Click "Stay Logged In" to continue, or you'll be logged out automatically.</p>
                <div class="session-warning-buttons">
                    <button id="stay-logged-in" class="btn-primary">Stay Logged In</button>
                    <button id="logout-now" class="btn-secondary">Logout Now</button>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .session-warning-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .session-warning-content {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            .session-warning-content h3 {
                color: #f59e0b;
                margin-bottom: 1rem;
            }
            .session-warning-content p {
                margin-bottom: 1rem;
                color: #6b7280;
            }
            .session-warning-buttons {
                display: flex;
                gap: 1rem;
                justify-content: center;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('stay-logged-in').addEventListener('click', () => {
            this.refreshSession();
            document.body.removeChild(modal);
            document.head.removeChild(style);
        });
        
        document.getElementById('logout-now').addEventListener('click', () => {
            this.logout();
            document.body.removeChild(modal);
            document.head.removeChild(style);
        });
        
        // Auto-logout after 5 minutes
        setTimeout(() => {
            if (document.body.contains(modal)) {
                this.handleSessionExpired();
                document.body.removeChild(modal);
                document.head.removeChild(style);
            }
        }, 5 * 60 * 1000);
    }

    handleSessionExpired() {
        console.log('⏰ Session expired, logging out user');
        this.stopSessionMonitoring();
        localStorage.removeItem('skyrc_session_id');
        this.user = null;
        this.sessionId = null;
        this.showLoginScreen();
        
        // Show notification
        this.showNotification('Your session has expired. Please log in again.', 'warning');
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded, initializing SkyRC App');
    window.skyrcApp = new SkyRCApp();
    
    // Add a global function to manually load rooms (for debugging)
    window.loadActiveRooms = () => {
        if (window.skyrcApp) {
            window.skyrcApp.loadActiveRooms();
        } else {
            console.error('SkyRC App not initialized yet');
        }
    };

    // Add a global function to handle room clicks
    window.handleRoomClick = (roomName) => {
        console.log('🎯 Room clicked:', roomName);
        console.log('🎯 Room name type:', typeof roomName);
        console.log('🎯 Room name length:', roomName ? roomName.length : 'null');
        
        if (roomName && roomName.trim()) {
            const cleanRoomName = roomName.trim();
            console.log('🎯 Navigating to login with room:', cleanRoomName);
            window.location.href = `/auth/login?room=${encodeURIComponent(cleanRoomName)}`;
        } else {
            console.error('❌ Invalid room name:', roomName);
        }
    };
});
