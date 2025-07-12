import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/database-simple';
import { logger } from '@/utils/logger';
import { UserRole } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

interface SocketUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  socketId: string;
}

// Store connected users
const connectedUsers = new Map<string, SocketUser>();
const userSockets = new Map<string, string>(); // userId -> socketId

export const setupSocketHandlers = (io: Server): void => {
  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        // Allow anonymous connections for public features
        logger.debug('Anonymous socket connection');
        return next();
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { 
          id: decoded.userId,
          isActive: true 
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      logger.warn('Socket authentication failed:', error);
      // Allow connection but without user context
      next();
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id}${socket.user ? ` (User: ${socket.user.email})` : ' (Anonymous)'}`);

    // Handle user authentication after connection
    if (socket.user) {
      const userData: SocketUser = {
        ...socket.user,
        socketId: socket.id
      };
      
      connectedUsers.set(socket.id, userData);
      userSockets.set(socket.user.id, socket.id);

      // Join user-specific room
      socket.join(`user:${socket.user.id}`);
      
      // Notify about online status
      socket.broadcast.emit('user:online', {
        userId: socket.user.id,
        name: socket.user.name
      });

      // Send pending notifications
      sendPendingNotifications(socket);
    }

    // Question-related events
    socket.on('question:join', (questionId: string) => {
      if (typeof questionId === 'string' && questionId.length > 0) {
        socket.join(`question:${questionId}`);
        logger.debug(`Socket ${socket.id} joined question room: ${questionId}`);
      }
    });

    socket.on('question:leave', (questionId: string) => {
      if (typeof questionId === 'string' && questionId.length > 0) {
        socket.leave(`question:${questionId}`);
        logger.debug(`Socket ${socket.id} left question room: ${questionId}`);
      }
    });

    // Real-time typing indicators
    socket.on('answer:typing', (data: { questionId: string; isTyping: boolean }) => {
      if (socket.user && data.questionId) {
        socket.to(`question:${data.questionId}`).emit('answer:typing', {
          userId: socket.user.id,
          userName: socket.user.name,
          isTyping: data.isTyping
        });
      }
    });

    socket.on('comment:typing', (data: { answerId: string; isTyping: boolean }) => {
      if (socket.user && data.answerId) {
        socket.to(`answer:${data.answerId}`).emit('comment:typing', {
          userId: socket.user.id,
          userName: socket.user.name,
          isTyping: data.isTyping
        });
      }
    });

    // Answer-related events
    socket.on('answer:join', (answerId: string) => {
      if (typeof answerId === 'string' && answerId.length > 0) {
        socket.join(`answer:${answerId}`);
        logger.debug(`Socket ${socket.id} joined answer room: ${answerId}`);
      }
    });

    socket.on('answer:leave', (answerId: string) => {
      if (typeof answerId === 'string' && answerId.length > 0) {
        socket.leave(`answer:${answerId}`);
        logger.debug(`Socket ${socket.id} left answer room: ${answerId}`);
      }
    });

    // Notification events
    socket.on('notifications:mark_read', async (notificationIds: string[]) => {
      if (socket.user && Array.isArray(notificationIds)) {
        try {
          await prisma.notification.updateMany({
            where: {
              id: { in: notificationIds },
              recipientId: socket.user.id
            },
            data: { isRead: true }
          });

          socket.emit('notifications:marked_read', { notificationIds });
        } catch (error) {
          logger.error('Failed to mark notifications as read:', error);
        }
      }
    });

    // User presence events
    socket.on('user:status', (status: 'online' | 'away' | 'busy') => {
      if (socket.user && ['online', 'away', 'busy'].includes(status)) {
        socket.broadcast.emit('user:status_change', {
          userId: socket.user.id,
          status
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (Reason: ${reason})`);

      if (socket.user) {
        connectedUsers.delete(socket.id);
        userSockets.delete(socket.user.id);

        // Notify about offline status
        socket.broadcast.emit('user:offline', {
          userId: socket.user.id,
          name: socket.user.name
        });

        // Update last active timestamp
        prisma.user.update({
          where: { id: socket.user.id },
          data: { lastActiveAt: new Date() }
        }).catch(error => {
          logger.warn('Failed to update lastActiveAt on disconnect:', error);
        });
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });
};

// Utility functions for emitting events

export const emitToUser = (userId: string, event: string, data: any): void => {
  const socketId = userSockets.get(userId);
  if (socketId) {
    const io = require('./index').io;
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToQuestion = (questionId: string, event: string, data: any): void => {
  const io = require('./index').io;
  io.to(`question:${questionId}`).emit(event, data);
};

export const emitToAnswer = (answerId: string, event: string, data: any): void => {
  const io = require('./index').io;
  io.to(`answer:${answerId}`).emit(event, data);
};

export const broadcastToAll = (event: string, data: any): void => {
  const io = require('./index').io;
  io.emit(event, data);
};

// Send real-time notifications
export const sendNotification = async (notification: {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  questionId?: string;
  answerId?: string;
  senderId?: string;
}): Promise<void> => {
  try {
    // Save notification to database
    const savedNotification = await prisma.notification.create({
      data: notification,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    // Send real-time notification
    emitToUser(notification.recipientId, 'notification:new', savedNotification);

    logger.debug(`Notification sent to user ${notification.recipientId}: ${notification.title}`);
  } catch (error) {
    logger.error('Failed to send notification:', error);
  }
};

// Send pending notifications to newly connected user
const sendPendingNotifications = async (socket: AuthenticatedSocket): Promise<void> => {
  if (!socket.user) return;

  try {
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        recipientId: socket.user.id,
        isRead: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Limit to recent notifications
    });

    if (unreadNotifications.length > 0) {
      socket.emit('notifications:pending', unreadNotifications);
    }
  } catch (error) {
    logger.error('Failed to send pending notifications:', error);
  }
};

// Get online users count
export const getOnlineUsersCount = (): number => {
  return connectedUsers.size;
};

// Get online users in a specific room
export const getOnlineUsersInRoom = (room: string): SocketUser[] => {
  const io = require('./index').io;
  const sockets = io.sockets.adapter.rooms.get(room);
  
  if (!sockets) return [];

  const users: SocketUser[] = [];
  for (const socketId of sockets) {
    const user = connectedUsers.get(socketId);
    if (user) {
      users.push(user);
    }
  }

  return users;
};

// Check if user is online
export const isUserOnline = (userId: string): boolean => {
  return userSockets.has(userId);
};

