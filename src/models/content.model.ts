import pool from '../config/database';
import type { Content, ContentFilters } from '../types';
import { parsePagination } from '../utils/pagination';

interface CreateContentDto {
  title: string;
  description?: string;
  subject: string;
  fileUrl: string;
  filePublicId: string | null;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  startTime?: string | null;
  endTime?: string | null;
  rotationDuration?: number;
}

const ContentModel = {
  async create(dto: CreateContentDto): Promise<Content> {
    const result = await pool.query<Content>(
      `INSERT INTO content
         (title, description, subject, file_url, file_public_id, file_type, file_size,
          uploaded_by, start_time, end_time, rotation_duration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        dto.title,
        dto.description ?? null,
        dto.subject,
        dto.fileUrl,
        dto.filePublicId,
        dto.fileType,
        dto.fileSize,
        dto.uploadedBy,
        dto.startTime ?? null,
        dto.endTime ?? null,
        dto.rotationDuration ?? 5,
      ]
    );
    return result.rows[0];
  },

  async findById(id: string): Promise<Content | null> {
    const result = await pool.query<Content>(
      'SELECT * FROM content WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByTeacher(
    teacherId: string,
    filters: ContentFilters = {}
  ): Promise<{ rows: Content[]; total: number }> {
    const { limit, offset } = parsePagination(filters.page, filters.limit);
    const params: unknown[] = [teacherId];

    let where = 'WHERE c.uploaded_by = $1';
    if (filters.status) {
      params.push(filters.status);
      where += ` AND c.status = $${params.length}`;
    }
    if (filters.subject) {
      params.push(`%${filters.subject.toLowerCase()}%`);
      where += ` AND LOWER(c.subject) LIKE $${params.length}`;
    }

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM content c ${where}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query<Content>(
      `SELECT c.*, u.name AS teacher_name
       FROM content c
       JOIN users u ON c.uploaded_by = u.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  async findAll(filters: ContentFilters = {}): Promise<{ rows: Content[]; total: number }> {
    const { limit, offset } = parsePagination(filters.page, filters.limit);
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (filters.subject) {
      params.push(`%${filters.subject.toLowerCase()}%`);
      conditions.push(`LOWER(c.subject) LIKE $${params.length}`);
    }
    if (filters.teacherId) {
      params.push(filters.teacherId);
      conditions.push(`c.uploaded_by = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM content c ${where}`,
      params
    );

    params.push(limit, offset);
    const dataResult = await pool.query<Content>(
      `SELECT c.*, u.name AS teacher_name, p.name AS approved_by_name
       FROM content c
       JOIN users u ON c.uploaded_by = u.id
       LEFT JOIN users p ON c.approved_by = p.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  async approve(id: string, principalId: string): Promise<Content | null> {
    const result = await pool.query<Content>(
      `UPDATE content
       SET status = 'approved', approved_by = $2, approved_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, principalId]
    );
    return result.rows[0] ?? null;
  },

  async reject(id: string, principalId: string, reason: string): Promise<Content | null> {
    const result = await pool.query<Content>(
      `UPDATE content
       SET status = 'rejected', approved_by = $2, rejection_reason = $3, approved_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, principalId, reason]
    );
    return result.rows[0] ?? null;
  },

  async findApprovedLiveByTeacher(teacherId: string): Promise<Content[]> {
    const result = await pool.query<Content>(
      `SELECT *
       FROM content
       WHERE uploaded_by = $1
         AND status = 'approved'
         AND start_time IS NOT NULL
         AND end_time IS NOT NULL
         AND NOW() BETWEEN start_time AND end_time
       ORDER BY subject, created_at`,
      [teacherId]
    );
    return result.rows;
  },

  async deleteById(id: string): Promise<void> {
    await pool.query('DELETE FROM content WHERE id = $1', [id]);
  },
};

export default ContentModel;
