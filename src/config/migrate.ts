import dotenv from 'dotenv';
dotenv.config();

import pool from './database';

const migrate = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('principal', 'teacher')),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subject VARCHAR(100) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_public_id VARCHAR(500),
        file_type VARCHAR(10) NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        rotation_duration INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_slots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(teacher_id, subject)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_schedule (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
        slot_id UUID NOT NULL REFERENCES content_slots(id) ON DELETE CASCADE,
        rotation_order INTEGER NOT NULL,
        duration INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(slot_id, rotation_order)
      );
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_uploaded_by ON content(uploaded_by);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_subject ON content(subject);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_schedule_slot ON content_schedule(slot_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_content_slots_teacher ON content_slots(teacher_id);`);

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
