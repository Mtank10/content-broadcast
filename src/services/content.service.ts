import cloudinary from '../config/cloudinary';
import ContentModel from '../models/content.model';
import ContentSlotModel from '../models/contentSlot.model';
import ContentScheduleModel from '../models/contentSchedule.model';
import { invalidateCache } from '../middlewares/cache.middleware';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import type { Content, ContentFilters, PaginatedResult } from '../types';

interface UploadBodyDto {
  title: string;
  subject: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  rotation_duration?: number;
}

const ContentService = {
  async uploadContent(
    teacherId: string,
    body: UploadBodyDto,
    file: Express.Multer.File | undefined
  ): Promise<Content> {
    if (!file) {
      throw Object.assign(new Error('File is required.'), { status: 400 });
    }

    const { title, description, subject, start_time, end_time, rotation_duration } = body;

    if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
      throw Object.assign(new Error('start_time must be before end_time.'), { status: 400 });
    }

    // Cloudinary sets file.path to the CDN URL and file.filename to the public_id
    const fileUrl = (file as Express.Multer.File & { path: string }).path;
    const filePublicId = (file as Express.Multer.File & { filename: string }).filename ?? null;
    const fileExt = file.originalname.split('.').pop()?.toLowerCase() ?? '';

    const content = await ContentModel.create({
      title,
      description,
      subject: subject.toLowerCase(),
      fileUrl,
      filePublicId,
      fileType: fileExt,
      fileSize: file.size,
      uploadedBy: teacherId,
      startTime: start_time ?? null,
      endTime: end_time ?? null,
      rotationDuration: rotation_duration ?? 5,
    });

    await ContentSlotModel.getOrCreate(teacherId, subject);
    return content;
  },

  async getTeacherContent(
    teacherId: string,
    filters: ContentFilters = {}
  ): Promise<PaginatedResult<Content>> {
    const { page, limit } = parsePagination(filters.page, filters.limit);
    const { rows, total } = await ContentModel.findByTeacher(teacherId, { ...filters, page, limit });
    return { items: rows, pagination: buildPaginationMeta(total, page, limit) };
  },

  async getAllContent(filters: ContentFilters = {}): Promise<PaginatedResult<Content>> {
    const { page, limit } = parsePagination(filters.page, filters.limit);
    const { rows, total } = await ContentModel.findAll({ ...filters, page, limit });
    return { items: rows, pagination: buildPaginationMeta(total, page, limit) };
  },

  async approveContent(contentId: string, principalId: string): Promise<Content> {
    const content = await ContentModel.findById(contentId);
    if (!content) {
      throw Object.assign(new Error('Content not found.'), { status: 404 });
    }
    if (content.status !== 'pending') {
      throw Object.assign(
        new Error(`Cannot approve content with status '${content.status}'.`),
        { status: 400 }
      );
    }

    const updated = await ContentModel.approve(contentId, principalId);
    if (!updated) throw Object.assign(new Error('Approval failed.'), { status: 500 });

    const slot = await ContentSlotModel.getOrCreate(content.uploaded_by, content.subject);
    await ContentScheduleModel.upsert(contentId, slot.id, null, content.rotation_duration);

    // Bust the live cache for this teacher
    await invalidateCache(`cache:/content/live/${content.uploaded_by}*`);

    return updated;
  },

  async rejectContent(
    contentId: string,
    principalId: string,
    reason: string
  ): Promise<Content> {
    const content = await ContentModel.findById(contentId);
    if (!content) {
      throw Object.assign(new Error('Content not found.'), { status: 404 });
    }
    if (content.status !== 'pending') {
      throw Object.assign(
        new Error(`Cannot reject content with status '${content.status}'.`),
        { status: 400 }
      );
    }

    await ContentScheduleModel.deleteByContentId(contentId);
    const updated = await ContentModel.reject(contentId, principalId, reason.trim());
    if (!updated) throw Object.assign(new Error('Rejection failed.'), { status: 500 });

    // Bust the live cache for this teacher (in case it was previously approved)
    await invalidateCache(`cache:/content/live/${content.uploaded_by}*`);

    return updated;
  },

  async deleteContent(contentId: string, teacherId: string): Promise<void> {
    const content = await ContentModel.findById(contentId);
    if (!content) {
      throw Object.assign(new Error('Content not found.'), { status: 404 });
    }
    if (content.uploaded_by !== teacherId) {
      throw Object.assign(new Error('You can only delete your own content.'), { status: 403 });
    }

    // Delete from Cloudinary if we have a public_id
    if (content.file_public_id) {
      try {
        await cloudinary.uploader.destroy(content.file_public_id);
      } catch (err) {
        console.error('Cloudinary delete failed:', (err as Error).message);
        // Non-fatal — continue with DB deletion
      }
    }

    await ContentScheduleModel.deleteByContentId(contentId);
    await ContentModel.deleteById(contentId);
    await invalidateCache(`cache:/content/live/${teacherId}*`);
  },
};

export default ContentService;
