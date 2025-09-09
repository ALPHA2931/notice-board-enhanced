import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';

interface AuthenticatedSocket {
  userId: string;
  email: string;
}

export const setupSocketHandlers = (io: SocketIOServer) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        email: string;
      };

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: {
          id: decoded.userId,
          isActive: true,
        },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      (socket as any).user = {
        userId: decoded.userId,
        email: decoded.email,
      };

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user as AuthenticatedSocket;
    console.log(`User ${user.email} connected via Socket.IO`);

    // Join user to their personal room
    socket.join(`user:${user.userId}`);

    // Handle joining notice rooms for real-time updates
    socket.on('joinNoticeRoom', async (noticeId: string) => {
      try {
        // Verify user has access to this notice
        const notice = await prisma.notice.findFirst({
          where: {
            id: noticeId,
            OR: [
              { authorId: user.userId },
              { isPublic: true },
              {
                shares: {
                  some: {
                    OR: [
                      { userId: user.userId },
                      {
                        group: {
                          members: {
                            some: { userId: user.userId }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        });

        if (notice) {
          socket.join(`notice:${noticeId}`);
          socket.emit('joinedNoticeRoom', { noticeId });
        } else {
          socket.emit('error', { message: 'Access denied to notice' });
        }
      } catch (error) {
        console.error('Join notice room error:', error);
        socket.emit('error', { message: 'Failed to join notice room' });
      }
    });

    // Handle leaving notice rooms
    socket.on('leaveNoticeRoom', (noticeId: string) => {
      socket.leave(`notice:${noticeId}`);
      socket.emit('leftNoticeRoom', { noticeId });
    });

    // Handle typing indicators for comments
    socket.on('typing', ({ noticeId, isTyping }) => {
      socket.to(`notice:${noticeId}`).emit('userTyping', {
        userId: user.userId,
        isTyping,
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${user.email} disconnected: ${reason}`);
    });
  });
};

// Helper functions to emit events from other parts of the application
export const emitToUser = (io: SocketIOServer, userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToNoticeRoom = (io: SocketIOServer, noticeId: string, event: string, data: any) => {
  io.to(`notice:${noticeId}`).emit(event, data);
};

export const emitToMultipleUsers = (io: SocketIOServer, userIds: string[], event: string, data: any) => {
  userIds.forEach(userId => {
    io.to(`user:${userId}`).emit(event, data);
  });
};
