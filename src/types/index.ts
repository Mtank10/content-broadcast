export type UserRole = 'principal' | 'teacher';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
}

export type SafeUser = Omit<User, 'password_hash'>;

export type ContentStatus = 'pending' | 'approved' | 'rejected';

export interface Content {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  file_url: string;
  file_public_id: string | null;   // Cloudinary public_id for deletion
  file_type: string;
  file_size: number;
  uploaded_by: string;
  status: ContentStatus;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  start_time: Date | null;
  end_time: Date | null;
  rotation_duration: number;
  created_at: Date;
  teacher_name?: string;
  approved_by_name?: string;
}

export type PublicContent = Omit<
  Content,
  'uploaded_by' | 'approved_by' | 'rejection_reason' | 'approved_by_name' | 'file_public_id'
>;


export interface ContentSlot {
  id: string;
  teacher_id: string;
  subject: string;
  created_at: Date;
}


export interface ContentSchedule {
  id: string;
  content_id: string;
  slot_id: string;
  rotation_order: number;
  duration: number;
  created_at: Date;
  title?: string;
  subject?: string;
  file_url?: string;
  start_time?: Date | null;
  end_time?: Date | null;
  status?: ContentStatus;
}


export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  user: SafeUser;
  token: string;
}


export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ContentFilters {
  status?: ContentStatus;
  subject?: string;
  teacherId?: string;
  page?: number;
  limit?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}


import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: SafeUser;
}
