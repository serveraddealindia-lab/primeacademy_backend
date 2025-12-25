import { UserRole } from '../models/User';
export interface JWTPayload {
    userId: number;
    email: string;
    role: UserRole;
}
export declare const generateToken: (payload: JWTPayload, expiresIn?: string) => string;
export declare const verifyToken: (token: string) => JWTPayload;
export declare const decodeToken: (token: string) => JWTPayload | null;
//# sourceMappingURL=jwt.d.ts.map