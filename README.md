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
- **React** with **TypeScript**
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time features
- **Lucide React** for icons

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- BlueSky developer account (for OAuth setup)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd skyrc
   npm run install:all
   ```

2. **Set up BlueSky OAuth:**
   - Go to [BlueSky Developer Console](https://bsky.app/settings/app-passwords)
   - Create a new app and get your client ID and secret
   - Copy `env.example` to `.env` and fill in your credentials:
   ```bash
   cp env.example .env
   ```

3. **Configure environment variables:**
   ```env
   BLUESKY_CLIENT_ID=your_client_id_here
   BLUESKY_CLIENT_SECRET=your_client_secret_here
BLUESKY_REDIRECT_URI=http://localhost:2222/auth/callback
PORT=2222
   NODE_ENV=development
   SESSION_SECRET=your_session_secret_here
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:2222`
   - Frontend dev server on `http://localhost:5173`

### Usage

1. **Visit the app**: Open `http://localhost:5173` in your browser
2. **Login**: Click "Login with BlueSky" to authenticate
3. **Join rooms**: Navigate to different URLs to join different chat rooms:
   - `http://localhost:5173/php` - PHP chat room
   - `http://localhost:5173/javascript` - JavaScript chat room
   - `http://localhost:5173/general` - General chat room

## API Endpoints

### Authentication
- `GET /auth/login` - Get BlueSky OAuth authorization URL
- `POST /auth/callback` - Handle OAuth callback
- `GET /auth/session/:sessionId` - Get current session
- `POST /auth/logout/:sessionId` - Logout and clear session

### Health
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

## Project Structure

```
skyrc/
├── src/                    # Backend source code
│   ├── routes/            # Express routes
│   ├── socket/            # Socket.IO handlers
│   ├── types/             # TypeScript type definitions
│   └── server.ts          # Main server file
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx        # Main React app
│   └── public/            # Static assets
├── package.json           # Backend dependencies
└── README.md
```

## Development

### Available Scripts

- `npm run dev` - Start both backend and frontend in development mode
- `npm run dev:server` - Start only the backend server
- `npm run dev:client` - Start only the frontend dev server
- `npm run build` - Build both backend and frontend for production
- `npm start` - Start production server

### Adding New Features

1. **Backend**: Add new routes in `src/routes/` or Socket.IO handlers in `src/socket/`
2. **Frontend**: Add new components in `client/src/components/` or hooks in `client/src/hooks/`
3. **Types**: Update shared types in both `src/types/` and `client/src/types/`

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
BLUESKY_CLIENT_ID=your_production_client_id
BLUESKY_CLIENT_SECRET=your_production_client_secret
BLUESKY_REDIRECT_URI=https://yourdomain.com/auth/callback
CLIENT_URL=https://yourdomain.com
PORT=2222
SESSION_SECRET=your_secure_session_secret
```

### Build for Production

```bash
npm run build
npm start
```

## Security Features

- **Helmet.js** for security headers
- **Rate limiting** to prevent abuse
- **CORS** configuration
- **Input sanitization** for room names
- **Session management** with expiration
- **No conversation logging** for privacy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the BlueSky OAuth documentation
- Review the Socket.IO documentation for real-time features
