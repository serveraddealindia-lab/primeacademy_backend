import * as jwt from 'jsonwebtoken';
import { Secret, SignOptions } from 'jsonwebtoken';
import { UserRole } from '../models/User';

const JWT_SECRET = (process.env.JWT_SECRET ?? 'your-secret-key-change-in-production') as Secret;
const JWT_EXPIRES_IN: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN ?? '24h') as SignOptions['expiresIn'];
const TOKEN_OPTIONS: SignOptions = {
  expiresIn: JWT_EXPIRES_IN,
};

export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
}

export const generateToken = (payload: JWTPayload, expiresIn?: string): string => {
  const options: SignOptions = expiresIn ? { expiresIn: expiresIn as SignOptions['expiresIn'] } : TOKEN_OPTIONS;
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};

