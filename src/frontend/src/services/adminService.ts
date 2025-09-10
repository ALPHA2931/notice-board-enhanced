import axios from 'axios';
import { User, Notice } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AdminUser extends User {
  _count: {
    notices: number;
    noticeComments: number;
  };
}

export interface AdminNotice extends Notice {
  _count: {
    comments: number;
    shares: number;
  };
}

export interface SystemStats {
  users: {
    total: number;
    active: number;
    admins: number;
    inactive: number;
  };
  notices: {
    total: number;
    active: number;
    urgent: number;
    archived: number;
  };
  engagement: {
    totalComments: number;
    totalGroups: number;
    avgNoticesPerUser: number;
  };
  recent: {
    notices: Array<{
      id: string;
      title: string;
      priority: string;
      createdAt: string;
      author: {
        username: string;
      };
    }>;
    users: Array<{
      id: string;
      username: string;
      email: string;
      createdAt: string;
    }>;
  };
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
}

export const adminService = {
  // User management
  async getAllUsers(): Promise<AdminUser[]> {
    const response = await api.get('/admin/users');
    return response.data;
  },

  async getUserById(id: string): Promise<AdminUser> {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },

  async createUser(data: CreateUserData): Promise<User> {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  // System statistics
  async getSystemStats(): Promise<SystemStats> {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Notice management
  async getAllNotices(): Promise<AdminNotice[]> {
    const response = await api.get('/admin/notices');
    return response.data;
  },

  async deleteNotice(id: string): Promise<void> {
    await api.delete(`/admin/notices/${id}`);
  },

  // Check if user is admin
  async checkAdminStatus(): Promise<boolean> {
    try {
      await api.get('/admin/stats');
      return true;
    } catch (error) {
      return false;
    }
  }
};
