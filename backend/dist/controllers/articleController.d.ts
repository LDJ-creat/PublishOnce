import { Request, Response } from 'express';
export declare const createArticle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getArticles: (req: Request, res: Response) => Promise<void>;
export declare const getArticleById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateArticle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteArticle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const publishArticle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPublishStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getArticleStats: (req: Request, res: Response) => Promise<void>;
export declare const batchOperateArticles: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=articleController.d.ts.map