export { User, default as UserModel } from './User';
export { Article, default as ArticleModel } from './Article';
export { Platform, default as PlatformModel } from './Platform';
export { Stats, default as StatsModel } from './Stats';
export type { IUser, IArticle, IPlatform, IStats, UserPlatformConfig, PlatformInfo, PlatformConfig, ArticleStats, CommentData } from '../types';
export declare const initializeModels: () => Promise<void>;
export declare const allModels: {
    User: any;
    Article: any;
    Platform: any;
    Stats: any;
};
//# sourceMappingURL=index.d.ts.map