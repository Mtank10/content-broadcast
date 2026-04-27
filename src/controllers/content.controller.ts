import { Request, Response, NextFunction } from 'express';
import ContentService from '../services/content.service';
import SchedulingService from '../services/scheduling.service';
import UserModel from '../models/user.model';
import type { AuthenticatedRequest, ContentFilters, ContentStatus } from '../types';

export const ContentController = {

  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const content = await ContentService.uploadContent(
        authReq.user.id,
        req.body as {
          title: string;
          subject: string;
          description?: string;
          start_time?: string;
          end_time?: string;
          rotation_duration?: number;
        },
        req.file
      );
      res.status(201).json({
        success: true,
        message: 'Content uploaded to Cloudinary. Awaiting principal approval.',
        data: { content },
      });
    } catch (err) {
      next(err);
    }
  },

 
  async getMyContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const filters: ContentFilters = {
        status: req.query.status as ContentStatus | undefined,
        subject: req.query.subject as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const result = await ContentService.getTeacherContent(authReq.user.id, filters);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },


  async getAllContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: ContentFilters = {
        status: req.query.status as ContentStatus | undefined,
        subject: req.query.subject as string | undefined,
        teacherId: req.query.teacher_id as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const result = await ContentService.getAllContent(filters);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  
  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const content = await ContentService.approveContent(req.params.id, authReq.user.id);
      res.json({ success: true, message: 'Content approved.', data: { content } });
    } catch (err) {
      next(err);
    }
  },

  
  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const content = await ContentService.rejectContent(
        req.params.id,
        authReq.user.id,
        (req.body as { reason: string }).reason
      );
      res.json({ success: true, message: 'Content rejected.', data: { content } });
    } catch (err) {
      next(err);
    }
  },

  async getLive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { teacherId } = req.params;
      const subject = req.query.subject as string | undefined;

      const teacher = await UserModel.findById(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        res.json({ success: true, data: null, message: 'No content available' });
        return;
      }

      const activeContent = await SchedulingService.getLiveContent(teacherId, subject);

      if (!activeContent) {
        res.json({ success: true, data: null, message: 'No content available' });
        return;
      }

      const {
        uploaded_by: _u,
        approved_by: _a,
        rejection_reason: _r,
        file_public_id: _fp,
        approved_by_name: _an,
        ...publicContent
      } = activeContent;

      res.json({
        success: true,
        message: 'Content fetched successfully.',
        data: { content: publicContent },
      });
    } catch (err) {
      next(err);
    }
  },

  
  async deleteContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      await ContentService.deleteContent(req.params.id, authReq.user.id);
      res.json({ success: true, message: 'Content deleted.' });
    } catch (err) {
      next(err);
    }
  },

  
  async getTeachers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teachers = await UserModel.findAllTeachers();
      res.json({ success: true, data: { teachers } });
    } catch (err) {
      next(err);
    }
  },
};
