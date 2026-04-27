import { z } from 'zod';

//  Auth schemas
export const RegisterSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(255),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['principal', 'teacher'], { message: 'Role must be principal or teacher' }),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

//  Content schemas 

export const UploadContentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(255),
    subject: z.string().trim().min(1, 'Subject is required').max(100),
    description: z.string().trim().max(2000).optional(),
    start_time: z.string().datetime({ message: 'start_time must be ISO 8601' }).optional(),
    end_time: z.string().datetime({ message: 'end_time must be ISO 8601' }).optional(),
    rotation_duration: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v !== undefined ? parseInt(String(v), 10) : undefined))
      .pipe(z.number().int().min(1, 'rotation_duration must be >= 1').optional()),
  }),
});

export const RejectContentSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(1, 'Rejection reason is required').max(1000),
  }),
  params: z.object({
    id: z.string().uuid('Invalid content ID'),
  }),
});

export const ContentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid content ID'),
  }),
});

export const TeacherIdParamSchema = z.object({
  params: z.object({
    teacherId: z.string().uuid('Invalid teacher ID'),
  }),
});

//  Pagination + filter schemas

const pageInt = z
  .string()
  .optional()
  .transform((v) => (v ? parseInt(v, 10) : undefined))
  .pipe(z.number().int().min(1).optional());

const limitInt = z
  .string()
  .optional()
  .transform((v) => (v ? parseInt(v, 10) : undefined))
  .pipe(z.number().int().min(1).max(100).optional());

export const ContentFiltersSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    subject: z.string().trim().min(1).max(100).optional(),
    teacher_id: z.string().uuid('Invalid teacher_id').optional(),
    page: pageInt,
    limit: limitInt,
  }),
});

export const LiveContentQuerySchema = z.object({
  params: z.object({
    teacherId: z.string().uuid('Invalid teacher ID'),
  }),
  query: z.object({
    subject: z.string().trim().min(1).max(100).optional(),
  }),
});

//  Inferred types 

export type RegisterBody = z.infer<typeof RegisterSchema>['body'];
export type LoginBody = z.infer<typeof LoginSchema>['body'];
export type UploadContentBody = z.infer<typeof UploadContentSchema>['body'];
export type ContentFiltersQuery = z.infer<typeof ContentFiltersSchema>['query'];
