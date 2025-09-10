import { Request, Response } from 'express';
export declare const getAllPlatforms: (req: Request, res: Response) => Promise<void>;
export declare const getPlatformById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createPlatform: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updatePlatform: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deletePlatform: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const testPlatformConnection: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPlatformStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=platformController.d.ts.map