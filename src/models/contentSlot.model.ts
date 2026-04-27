import pool from '../config/database';
import type { ContentSlot } from '../types';

const ContentSlotModel = {
  async getOrCreate(teacherId: string, subject: string): Promise<ContentSlot> {
    const subjectLower = subject.toLowerCase();

    const existing = await pool.query<ContentSlot>(
      'SELECT * FROM content_slots WHERE teacher_id = $1 AND subject = $2',
      [teacherId, subjectLower]
    );

    if (existing.rows.length > 0) return existing.rows[0];

    const result = await pool.query<ContentSlot>(
      `INSERT INTO content_slots (teacher_id, subject)
       VALUES ($1, $2)
       RETURNING *`,
      [teacherId, subjectLower]
    );
    return result.rows[0];
  },

  async findByTeacherAndSubject(teacherId: string, subject: string): Promise<ContentSlot | null> {
    const result = await pool.query<ContentSlot>(
      'SELECT * FROM content_slots WHERE teacher_id = $1 AND subject = $2',
      [teacherId, subject.toLowerCase()]
    );
    return result.rows[0] ?? null;
  },
};

export default ContentSlotModel;
