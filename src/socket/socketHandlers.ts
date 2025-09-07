import { Server, Socket } from 'socket.io';
import { User, ChatMessage, SocketUser, RoomInfo } from '../types';

// In-memory storage for rooms and users
const rooms = new Map<string, Set<SocketUser>>();
const users = new Map<string, SocketUser>();

// Reserved routes that should not become chat rooms
const RESERVED_ROUTES = ['/', '/about', '/health', '/auth'];

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user joining a room
    socket.on('join-room', (data: { room: string; user: User }) => {
      const { room, user } = data;
      
      // Validate room name
      if (RESERVED_ROUTES.includes(room)) {
        socket.emit('error', { message: 'Cannot join reserved route' });
        return;
      }

      // Clean room name (remove leading slash, sanitize)
      const cleanRoom = room.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '');
      
      // Enhanced validation for room names
      if (!cleanRoom) {
        socket.emit('error', { message: 'Invalid room name: Room name cannot be empty' });
        return;
      }
      
      if (cleanRoom.length < 1) {
        socket.emit('error', { message: 'Invalid room name: Room name must be at least 1 character long' });
        return;
      }
      
      if (cleanRoom.length > 50) {
        socket.emit('error', { message: 'Invalid room name: Room name must be 50 characters or less' });
        return;
      }
      
      // Check if room name starts or ends with invalid characters
      if (cleanRoom.startsWith('-') || cleanRoom.startsWith('_') || 
          cleanRoom.endsWith('-') || cleanRoom.endsWith('_')) {
        socket.emit('error', { message: 'Invalid room name: Room name cannot start or end with dashes or underscores' });
        return;
      }
      
      // Check for consecutive special characters
      if (cleanRoom.includes('--') || cleanRoom.includes('__') || cleanRoom.includes('-_') || cleanRoom.includes('_-')) {
        socket.emit('error', { message: 'Invalid room name: Room name cannot contain consecutive dashes or underscores' });
        return;
      }

      // Leave previous room if any
      const currentUser = users.get(socket.id);
      if (currentUser && currentUser.currentRoom) {
        leaveRoom(socket, currentUser.currentRoom);
      }

      // Create socket user
      const socketUser: SocketUser = {
        ...user,
        socketId: socket.id,
        currentRoom: cleanRoom
      };

      // Join the room
      socket.join(cleanRoom);
      users.set(socket.id, socketUser);

      // Add to room
      if (!rooms.has(cleanRoom)) {
        rooms.set(cleanRoom, new Set());
      }
      rooms.get(cleanRoom)!.add(socketUser);

      // Notify room about new user
      socket.to(cleanRoom).emit('user-joined', {
        user: socketUser,
        roomInfo: getRoomInfo(cleanRoom)
      });

      // Send room info to the joining user
      socket.emit('room-joined', {
        room: cleanRoom,
        roomInfo: getRoomInfo(cleanRoom)
      });

      console.log(`User ${user.handle} joined room: ${cleanRoom}`);
    });

    // Handle sending messages
    socket.on('send-message', (data: { message: string; room: string }) => {
      const { message, room } = data;
      const user = users.get(socket.id);

      if (!user || !message.trim()) {
        return;
      }

      // Create chat message
      const chatMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        user: {
          did: user.did,
          handle: user.handle,
          displayName: user.displayName,
          avatar: user.avatar,
          description: user.description
        },
        message: message.trim(),
        timestamp: new Date(),
        room
      };

      // Broadcast message to room
      io.to(room).emit('new-message', chatMessage);
    });

    // Handle typing indicators
    socket.on('typing-start', (data: { room: string }) => {
      const user = users.get(socket.id);
      if (user) {
        socket.to(data.room).emit('user-typing', {
          user: { handle: user.handle, displayName: user.displayName },
          room: data.room
        });
      }
    });

    socket.on('typing-stop', (data: { room: string }) => {
      const user = users.get(socket.id);
      if (user) {
        socket.to(data.room).emit('user-stopped-typing', {
          user: { handle: user.handle, displayName: user.displayName },
          room: data.room
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      if (user && user.currentRoom) {
        leaveRoom(socket, user.currentRoom);
      }
      users.delete(socket.id);
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

function leaveRoom(socket: Socket, room: string) {
  const user = users.get(socket.id);
  if (!user) return;

  socket.leave(room);
  
  const roomUsers = rooms.get(room);
  if (roomUsers) {
    roomUsers.delete(user);
    
    // Clean up empty rooms
    if (roomUsers.size === 0) {
      rooms.delete(room);
    } else {
      // Notify room about user leaving
      socket.to(room).emit('user-left', {
        user: { handle: user.handle, displayName: user.displayName },
        roomInfo: getRoomInfo(room)
      });
    }
  }
}

function getRoomInfo(room: string): RoomInfo {
  const roomUsers = rooms.get(room) || new Set();
  return {
    name: room,
    userCount: roomUsers.size,
    users: Array.from(roomUsers).map(u => ({
      did: u.did,
      handle: u.handle,
      displayName: u.displayName,
      avatar: u.avatar,
      description: u.description
    }))
  };
}

// Export function to get all active rooms
export function getAllActiveRooms(): RoomInfo[] {
  const activeRooms: RoomInfo[] = [];
  
  for (const [roomName, roomUsers] of rooms.entries()) {
    if (roomUsers.size > 0) {
      activeRooms.push({
        name: roomName,
        userCount: roomUsers.size,
        users: Array.from(roomUsers).map(u => ({
          did: u.did,
          handle: u.handle,
          displayName: u.displayName,
          avatar: u.avatar,
          description: u.description
        }))
      });
    }
  }
  
  // Sort by user count (descending) then by name
  return activeRooms.sort((a, b) => {
    if (a.userCount !== b.userCount) {
      return b.userCount - a.userCount;
    }
    return a.name.localeCompare(b.name);
  });
}

// Export function to get room count
export function getActiveRoomCount(): number {
  return Array.from(rooms.values()).filter(roomUsers => roomUsers.size > 0).length;
}
