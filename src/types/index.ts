export interface User {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  user: User;
  message: string;
  timestamp: Date;
  room: string;
}

export interface RoomInfo {
  name: string;
  userCount: number;
  users: User[];
}

export interface SocketUser extends User {
  socketId: string;
  currentRoom?: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}
