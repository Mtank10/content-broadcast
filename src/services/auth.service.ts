import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model';
import type { SafeUser, UserRole, AuthResult, JwtPayload } from '../types';

interface RegisterDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface LoginDto {
  email: string;
  password: string;
}

const AuthService = {
  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await UserModel.findByEmail(dto.email);
    if (existing) {
      const err = Object.assign(new Error('Email already registered.'), { status: 409 });
      throw err;
    }

    const user = await UserModel.create(dto);
    const token = AuthService.generateToken(user);
    return { user, token };
  },

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await UserModel.findByEmail(dto.email);
    if (!user) {
      throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
    }

    const isValid = await UserModel.verifyPassword(dto.password, user.password_hash);
    if (!isValid) {
      throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
    }

    const { password_hash, ...safeUser } = user;
    void password_hash; // explicitly unused
    const token = AuthService.generateToken(safeUser as SafeUser);
    return { user: safeUser as SafeUser, token };
  },

  generateToken(user: SafeUser): string {
    const payload: JwtPayload = { id: user.id, email: user.email, role: user.role };
    return jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '24h') as string,
    } as jwt.SignOptions);
  },
};

export default AuthService;
