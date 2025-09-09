import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { SocketEvents } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinNoticeRoom: (noticeId: string) => void;
  leaveNoticeRoom: (noticeId: string) => void;
  emit: (event: string, data?: any) => void;
  on: <T extends keyof SocketEvents>(event: T, callback: (data: SocketEvents[T]) => void) => void;
  off: (event: string, callback?: Function) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (token && user) {
      const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001', {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('Connected to server via Socket.IO');
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('error', (error: { message: string }) => {
        console.error('Socket error:', error.message);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [token, user]);

  const joinNoticeRoom = (noticeId: string) => {
    if (socket) {
      socket.emit('joinNoticeRoom', noticeId);
    }
  };

  const leaveNoticeRoom = (noticeId: string) => {
    if (socket) {
      socket.emit('leaveNoticeRoom', noticeId);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  const on = <T extends keyof SocketEvents>(event: T, callback: (data: SocketEvents[T]) => void) => {
    if (socket) {
      socket.on(event as string, callback);
    }
  };

  const off = (event: string, callback?: Function) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback as any);
      } else {
        socket.off(event);
      }
    }
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    joinNoticeRoom,
    leaveNoticeRoom,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
