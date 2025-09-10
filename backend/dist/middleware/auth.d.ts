import { Request, Response, NextFunction } from 'express';
import { IUser } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
            userId?: string;
        }
    }
}
export declare const generateToken: (userId: string) => string;
export declare const generateRefreshToken: (userId: string) => string;
export declare const verifyToken: (token: string) => any;
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (roles: string | string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireOwnership: (resourceField?: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const refreshTokenAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const apiKeyAuth: (req: Request, res: Response, next: NextFunction) => void;
export declare const rateLimit: (maxRequests?: number, windowMs?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const authUtils: {
    generateToken: (userId: string) => string;
    generateRefreshToken: (userId: string) => string;
    verifyToken: (token: string) => any;
    generateAuthResponse: (user: IUser) => {
        user: {
            id: string;
            username: string;
            email: string;
            avatar: string | undefined;
            role: any;
            bio: any;
            preferences: any;
        };
        token: string;
        refreshToken: string;
        expiresIn: string;
    };
    getUserId: (req: Request) => string | null;
    hasPermission: (user: IUser, permission: string) => boolean;
};
//# sourceMappingURL=auth.d.ts.map