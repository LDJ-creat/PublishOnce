import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCurrentUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const changePassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updatePlatformConfig: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deletePlatformConfig: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const refreshToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const logout: (req: Request, res: Response) => Promise<void>;
export declare const verifyToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPlatforms: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=userController.d.ts.map