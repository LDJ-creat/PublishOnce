/**
 * 用户相关类型定义
 */
export interface IUser {
  _id: string;
  id: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  platformConfigs?: any[];
  preferences?: any;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 文章相关类型定义
 */
export interface IArticle {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  category?: string;
  coverImage?: string;
  author: string; // 用户ID
  status: 'draft' | 'published' | 'archived';
  publishedPlatforms: IPlatformPublishStatus[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 平台发布状态
 */
export interface IPlatformPublishStatus {
  platform: PlatformType;
  status: 'pending' | 'publishing' | 'success' | 'failed';
  publishedAt?: Date;
  platformArticleId?: string;
  platformUrl?: string;
  error?: string;
}

/**
 * 支持的平台类型
 */
export type PlatformType = 'csdn' | 'juejin' | 'huawei' | 'hexo';

/**
 * 平台配置
 */
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

/**
 * 用户平台配置
 */
export interface IUserPlatformConfig {
  _id: string;
  userId: string;
  platforms: IPlatformConfig[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 数据统计
 */
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

/**
 * 评论数据
 */
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

/**
 * 任务队列作业数据
 */
export interface IJobData {
  type: 'publish' | 'scrape' | 'sync';
  payload: any;
  userId: string;
  priority?: number;
  delay?: number;
  attempts?: number;
}

/**
 * API响应格式
 */
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

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
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