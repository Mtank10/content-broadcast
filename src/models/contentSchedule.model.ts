import pool from '../config/database';
import type { ContentSchedule } from '../types';

const ContentScheduleModel = {
  async upsert(
    contentId: string,
    slotId: string,
    rotationOrder: number | null,
    duration: number
  ): Promise<ContentSchedule> {
    await pool.query('DELETE FROM content_schedule WHERE content_id = $1', [contentId]);

    let order = rotationOrder;
    if (order === null || order === undefined) {
      const maxResult = await pool.query<{ max_order: string }>(
        'SELECT COALESCE(MAX(rotation_order), 0) AS max_order FROM content_schedule WHERE slot_id = $1',
        [slotId]
      );
      order = parseInt(maxResult.rows[0].max_order, 10) + 1;
    }

    const result = await pool.query<ContentSchedule>(
      `INSERT INTO content_schedule (content_id, slot_id, rotation_order, duration)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slot_id, rotation_order)
       DO UPDATE SET content_id = EXCLUDED.content_id, duration = EXCLUDED.duration
       RETURNING *`,
      [contentId, slotId, order, duration]
    );
    return result.rows[0];
  },

  async findBySlot(slotId: string): Promise<ContentSchedule[]> {
    const result = await pool.query<ContentSchedule>(
      `SELECT cs.*, c.title, c.subject, c.file_url, c.start_time, c.end_time, c.status
       FROM content_schedule cs
       JOIN content c ON cs.content_id = c.id
       WHERE cs.slot_id = $1
       ORDER BY cs.rotation_order`,
      [slotId]
    );
    return result.rows;
  },

  async deleteByContentId(contentId: string): Promise<void> {
    await pool.query('DELETE FROM content_schedule WHERE content_id = $1', [contentId]);
  },
};

export default ContentScheduleModel;
