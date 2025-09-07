# SkyRC - IRC-like Chatrooms with BlueSky OAuth

A modern, real-time chatroom server where each URL route becomes a chat room, powered by BlueSky OAuth authentication.

## Features

- 🚀 **Route-based Rooms**: Each URL path (e.g., `/php`, `/javascript`) becomes a separate chat room
- 🔐 **BlueSky OAuth**: Secure authentication using your BlueSky account
- 💬 **Real-time Chat**: Instant messaging with WebSocket connections
- 👤 **Profile Integration**: Display BlueSky profile photos and names
- 🔒 **Privacy First**: No conversation logging or storage
- 📱 **Responsive Design**: Beautiful, modern UI that works on all devices
- ⚡ **TypeScript**: Full type safety and modern development experience

## Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** for routing and middleware
- **Socket.IO** for real-time communication
- **BlueSky OAuth** for authentication

### Frontend
- **HTML/CSS/JavaScript** (vanilla, no framework)
- **Responsive CSS** with mobile-first design
- **Socket.IO Client** for real-time features

## Local Development Setup

### Prerequisites
- **Node.js 18+** 
- **npm** or **yarn**
- **BlueSky account** (for OAuth setup)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd skyrc

# Install dependencies
npm install
```

### Step 2: Generate OAuth Keys

```bash
# Generate ECDSA key pair for BlueSky OAuth
npm run deploy:setup
```

This will:
- Create `keys/` directory with public/private key files
- Generate a `.env` file with development configuration
- Output the private key for production use

### Step 3: Configure BlueSky OAuth

1. **Register your app with BlueSky:**
   - Go to [BlueSky Developer Console](https://bsky.app/settings/app-passwords)
   - Create a new app
   - Set **Client ID** to: `http://localhost:2222/client-metadata.json`
   - Set **Redirect URI** to: `http://localhost:2222/auth/oauth-callback`

2. **Update environment variables** (if needed):
   ```bash
   # Edit .env file
   nano .env
   ```

   The generated `.env` should look like:
   ```env
   # BlueSky OAuth Configuration
   BLUESKY_CLIENT_ID=http://localhost:2222/client-metadata.json
   BLUESKY_REDIRECT_URI=http://localhost:2222/oauth-callback

   # Server Configuration
   PORT=2222
   NODE_ENV=development

   # Session Configuration
   SESSION_SECRET=your_generated_session_secret

   # Private Key for OAuth (DO NOT SHARE)
   PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
   ```

### Step 4: Start Development Server

```bash
# Start the development server
npm run dev
```

This will start the server on `http://localhost:2222`

### Step 5: Test the Application

1. **Visit the app**: Open `http://localhost:2222` in your browser
2. **Login**: Click "Login with BlueSky" to authenticate
3. **Join rooms**: Navigate to different URLs to join different chat rooms:
   - `http://localhost:2222/php` - PHP chat room
   - `http://localhost:2222/javascript` - JavaScript chat room
   - `http://localhost:2222/general` - General chat room

## Production Deployment

### Option 1: Railway (Recommended - Easiest)

**Why Railway:**
- ✅ Zero configuration - just connect GitHub repo
- ✅ Automatic HTTPS with custom domains
- ✅ Built-in environment variables management
- ✅ Automatic deployments from Git
- ✅ Free tier available

**Steps:**

1. **Push to GitHub** (if not already done)

2. **Connect Railway:**
   - Go to [Railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your SkyRC repository

3. **Configure Environment Variables:**
   ```env
   NODE_ENV=production
   BLUESKY_CLIENT_ID=https://yourdomain.com/client-metadata.json
   BLUESKY_REDIRECT_URI=https://yourdomain.com/auth/oauth-callback
   PORT=3000
   SESSION_SECRET=your_secure_random_string_here
   PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...\n-----END PRIVATE KEY-----
   ```

4. **Add Custom Domain:**
   - In Railway dashboard, go to "Settings" → "Domains"
   - Add your custom domain
   - Update DNS records as instructed

5. **Update BlueSky OAuth Registration:**
   - Go to BlueSky Developer Console
   - Update **Client ID** to: `https://yourdomain.com/client-metadata.json`
   - Update **Redirect URI** to: `https://yourdomain.com/auth/oauth-callback`

6. **Deploy!** ✨

**Cost:** Free tier → $5/month for custom domain

---

### Option 2: Render

**Steps:**

1. **Connect GitHub** to [Render.com](https://render.com)
2. **Create Web Service** → Select your repo
3. **Configure:**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment: Node.js
4. **Add environment variables** (same as Railway)
5. **Add custom domain**

**Cost:** Free tier → $7/month for custom domain

---

### Option 3: Vercel

**Steps:**

1. **Connect GitHub** to [Vercel.com](https://vercel.com)
2. **Import project**
3. **Configure build settings:**
   - Framework: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Add environment variables**
5. **Add custom domain**

**Cost:** Free tier (generous limits)

---

### Option 4: DigitalOcean App Platform

**Steps:**

1. **Create App** in [DigitalOcean](https://cloud.digitalocean.com)
2. **Connect GitHub** repository
3. **Configure:**
   - Source: GitHub repo
   - Build Command: `npm run build`
   - Run Command: `npm start`
4. **Add environment variables**
5. **Add custom domain**

**Cost:** $5/month minimum

---

## Environment Variables Reference

### Development (.env file)
```env
# BlueSky OAuth Configuration
BLUESKY_CLIENT_ID=http://localhost:2222/client-metadata.json
BLUESKY_REDIRECT_URI=http://localhost:2222/oauth-callback

# Server Configuration
PORT=2222
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your_generated_session_secret

# Private Key for OAuth (DO NOT SHARE)
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
```

### Production (Platform Environment Variables)
```env
NODE_ENV=production
BLUESKY_CLIENT_ID=https://yourdomain.com/client-metadata.json
BLUESKY_REDIRECT_URI=https://yourdomain.com/auth/oauth-callback
PORT=3000
SESSION_SECRET=your_very_secure_random_string_here
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...\n-----END PRIVATE KEY-----
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server
npm run deploy:setup     # Generate OAuth keys (development & production)
```

## Project Structure

```
skyrc/
├── src/                    # Backend source code
│   ├── routes/            # Express routes (auth, health)
│   ├── socket/            # Socket.IO handlers
│   ├── types/             # TypeScript type definitions
│   └── server.ts          # Main server file
├── public/                # Frontend static files
│   ├── css/              # Stylesheets (base, home, login, chat)
│   ├── js/               # JavaScript files (home, login, chat)
│   ├── home.html         # Home page
│   ├── login.html        # Login page
│   └── chat.html         # Chat page
├── scripts/              # Utility scripts
│   └── generate-keys.js  # OAuth key generation
├── keys/                 # Generated OAuth keys (gitignored)
├── .env                  # Environment variables (gitignored)
├── package.json          # Dependencies and scripts
└── README.md
```

## API Endpoints

### Authentication
- `GET /auth/login` - Get BlueSky OAuth authorization URL
- `GET /auth/oauth-callback` - Handle OAuth callback
- `GET /auth/session/:sessionId` - Get current session
- `POST /auth/logout/:sessionId` - Logout and clear session
- `GET /auth/jwks.json` - JSON Web Key Set for OAuth

### Static Files
- `GET /client-metadata.json` - OAuth client metadata
- `GET /` - Home page
- `GET /login` - Login page
- `GET /:room` - Chat room page

### API
- `GET /api/rooms` - Get active rooms
- `GET /health` - Server health check

## Socket.IO Events

### Client → Server
- `join-room` - Join a chat room
- `send-message` - Send a message to current room
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator

### Server → Client
- `room-joined` - Confirmation of joining a room
- `new-message` - New message received
- `user-joined` - User joined the room
- `user-left` - User left the room
- `user-typing` - User started typing
- `user-stopped-typing` - User stopped typing

## Security Features

- **Helmet.js** for security headers
- **Rate limiting** (900 requests per 15 minutes)
- **CORS** configuration
- **Input sanitization** for room names
- **Session management** with expiration (2 hours idle)
- **No conversation logging** for privacy
- **ECDSA key pairs** for OAuth security
- **Content Security Policy** headers

## Troubleshooting

### Common Issues

**1. OAuth Login Fails:**
- Check BlueSky OAuth registration URLs match your domain
- Verify `PRIVATE_KEY` environment variable is set correctly
- Check browser console for CORS errors

**2. Room Names Not Working:**
- Room names must be alphanumeric with dashes/underscores only
- Cannot start/end with special characters
- Reserved routes: `/`, `/about`, `/health`, `/auth`

**3. Mobile Safari Issues:**
- App uses dual storage (localStorage + cookies) for compatibility
- Check if private browsing mode is enabled

**4. Deployment Issues:**
- Ensure all environment variables are set
- Check build logs for TypeScript errors
- Verify custom domain DNS is pointing correctly

### Getting Help

- **GitHub Issues**: Create an issue for bugs or feature requests
- **BlueSky OAuth**: Check [BlueSky OAuth documentation](https://atproto.com/guides/oauth)
- **Socket.IO**: Review [Socket.IO documentation](https://socket.io/docs/)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test locally: `npm run dev`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the BlueSky OAuth documentation
- Review the Socket.IO documentation for real-time features