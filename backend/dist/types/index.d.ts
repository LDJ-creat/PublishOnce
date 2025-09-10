export interface IUser {
    _id: string;
    username: string;
    email: string;
    password: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IArticle {
    _id: string;
    title: string;
    content: string;
    summary?: string;
    tags: string[];
    category?: string;
    coverImage?: string;
    author: string;
    status: 'draft' | 'published' | 'archived';
    publishedPlatforms: IPlatformPublishStatus[];
    createdAt: Date;
    updatedAt: Date;
}
export interface IPlatformPublishStatus {
    platform: PlatformType;
    status: 'pending' | 'publishing' | 'success' | 'failed';
    publishedAt?: Date;
    platformArticleId?: string;
    platformUrl?: string;
    error?: string;
}
export type PlatformType = 'csdn' | 'juejin' | 'huawei' | 'hexo';
export interface IPlatformConfig {
    platform: PlatformType;
    enabled: boolean;
    credentials: {
        username?: string;
        password?: string;
        token?: string;
        [key: string]: any;
    };
    settings: {
        autoPublish: boolean;
        defaultCategory?: string;
        defaultTags?: string[];
        [key: string]: any;
    };
}
export interface IUserPlatformConfig {
    _id: string;
    userId: string;
    platforms: IPlatformConfig[];
    createdAt: Date;
    updatedAt: Date;
}
export interface IArticleStats {
    _id: string;
    articleId: string;
    platform: PlatformType;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    collectedAt: Date;
}
export interface IComment {
    _id: string;
    articleId: string;
    platform: PlatformType;
    platformCommentId: string;
    author: string;
    content: string;
    parentId?: string;
    likes: number;
    replies: number;
    createdAt: Date;
    collectedAt: Date;
}
export interface IJobData {
    type: 'publish' | 'scrape' | 'sync';
    payload: any;
    userId: string;
    priority?: number;
    delay?: number;
    attempts?: number;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
        details?: any;
    };
    timestamp: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
//# sourceMappingURL=index.d.ts.map