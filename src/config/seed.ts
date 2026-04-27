import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import pool from './database';

const seed = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('password123', 12);

    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['Principal Admin', 'principal@school.com', passwordHash, 'principal']
    );

    const teachers: [string, string][] = [
      ['Teacher One', 'teacher1@school.com'],
      ['Teacher Two', 'teacher2@school.com'],
      ['Teacher Three', 'teacher3@school.com'],
    ];

    for (const [name, email] of teachers) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [name, email, passwordHash, 'teacher']
      );
    }

    await client.query('COMMIT');

    console.log(' Seed completed');
    console.log('\nTest Credentials:');
    console.log('  Principal : principal@school.com / password123');
    console.log('  Teacher 1 : teacher1@school.com / password123');
    console.log('  Teacher 2 : teacher2@school.com / password123');
    console.log('  Teacher 3 : teacher3@school.com / password123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
