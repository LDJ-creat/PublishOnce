import { Request, Response } from 'express';
export declare const getCredentials: (req: Request, res: Response) => Promise<void>;
export declare const saveCredential: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteCredential: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const testCredential: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const toggleCredential: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=credentialController.d.ts.map