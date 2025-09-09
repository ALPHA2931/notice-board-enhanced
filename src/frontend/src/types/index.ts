export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  color?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  isPublic: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  author: User;
  tags: NoticeTag[];
  shares: NoticeShare[];
  comments: NoticeComment[];
  _count?: {
    comments: number;
    shares: number;
  };
}

export interface NoticeTag {
  id: string;
  name: string;
  color?: string;
  noticeId: string;
  createdAt: string;
}

export interface NoticeShare {
  id: string;
  noticeId: string;
  userId?: string;
  groupId?: string;
  permission: 'READ' | 'WRITE' | 'ADMIN';
  createdAt: string;
  user?: User;
  group?: Group;
}

export interface NoticeComment {
  id: string;
  content: string;
  noticeId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: User;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  creator: User;
  members: GroupMember[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  joinedAt: string;
  user: User;
}

export interface CreateNoticeData {
  title: string;
  content: string;
  color?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isPublic?: boolean;
  expiresAt?: string;
  tags?: string[];
}

export interface UpdateNoticeData extends Partial<CreateNoticeData> {}

export interface ShareNoticeData {
  userIds?: string[];
  groupIds?: string[];
  permission?: 'READ' | 'WRITE' | 'ADMIN';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Socket event types
export interface SocketEvents {
  // Notice events
  noticeCreated: { notice: Notice };
  noticeUpdated: { notice: Notice };
  noticeDeleted: { noticeId: string };
  noticeShared: { noticeId: string; shares: NoticeShare[] };
  
  // Comment events
  commentAdded: { comment: NoticeComment };
  commentUpdated: { comment: NoticeComment };
  commentDeleted: { commentId: string };
  
  // Typing events
  userTyping: { userId: string; isTyping: boolean };
  
  // Room events
  joinedNoticeRoom: { noticeId: string };
  leftNoticeRoom: { noticeId: string };
  
  // Error events
  error: { message: string };
}
