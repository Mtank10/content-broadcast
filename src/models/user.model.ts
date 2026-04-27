import bcrypt from 'bcryptjs';
import pool from '../config/database';
import type { User, SafeUser, UserRole } from '../types';

interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const UserModel = {
  async create(dto: CreateUserDto): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const result = await pool.query<SafeUser>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [dto.name, dto.email, passwordHash, dto.role]
    );
    return result.rows[0];
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<SafeUser | null> {
    const result = await pool.query<SafeUser>(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findAllTeachers(): Promise<SafeUser[]> {
    const result = await pool.query<SafeUser>(
      `SELECT id, name, email, role, created_at
       FROM users WHERE role = 'teacher' ORDER BY name`
    );
    return result.rows;
  },

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  },
};

export default UserModel;
