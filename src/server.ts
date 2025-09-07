import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { authRouter } from './routes/auth';
import { setupSocketHandlers } from './socket/socketHandlers';

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy for rate limiting (needed for tunnels)
app.set('trust proxy', 1);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CLIENT_URL 
      : ["http://localhost:3001", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:", "http://localhost:3001"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 900, // limit each IP to 900 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : ["http://localhost:2222", "http://localhost:3000"],
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth endpoints (must be before static files)
app.get('/client-metadata.json', (req, res) => {
  res.json({
    client_id: process.env.BLUESKY_CLIENT_ID || 'https://dev.libre.news/client-metadata.json',
    client_name: 'SkyRC Chat',
    client_uri: 'https://dev.libre.news',
    logo_uri: 'https://dev.libre.news/logo.png',
    redirect_uris: [process.env.BLUESKY_REDIRECT_URI || 'https://dev.libre.news/auth/oauth-callback'],
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'atproto',
    response_types: ['code'],
    application_type: 'web',
    token_endpoint_auth_method: 'private_key_jwt',
    token_endpoint_auth_signing_alg: 'ES256',
    dpop_bound_access_tokens: true,
    jwks_uri: 'https://dev.libre.news/auth/jwks.json',
  });
});

// JWKS endpoint is handled by auth router

// Import room functions
import { getAllActiveRooms, getActiveRoomCount } from './socket/socketHandlers';

// API endpoint to get active rooms
app.get('/api/rooms', (req, res) => {
  try {
    const activeRooms = getAllActiveRooms();
    const totalRooms = getActiveRoomCount();
    
    res.json({
      success: true,
      data: {
        rooms: activeRooms,
        totalRooms,
        totalUsers: activeRooms.reduce((sum, room) => sum + room.userCount, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching active rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active rooms'
    });
  }
});

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// Serve the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/home.html'));
});

// Serve the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Serve the chat page for room routes
app.get('/:room', (req, res) => {
  const room = req.params.room;
  
  // Validate room name (alphanumeric, dashes, underscores only)
  if (!/^[a-zA-Z0-9-_]+$/.test(room)) {
    return res.status(400).send('Invalid room name');
  }
  
  // Check if it's a reserved route
  const reservedRoutes = ['about', 'health', 'auth', 'api', 'login', 'home'];
  if (reservedRoutes.includes(room)) {
    return res.status(404).send('Room not found');
  }
  
  res.sendFile(path.join(__dirname, '../public/chat.html'));
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 SkyRC server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 BlueSky OAuth: ${process.env.BLUESKY_CLIENT_ID ? 'Configured' : 'Not configured'}`);
});

export { io };
