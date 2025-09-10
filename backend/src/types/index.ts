import { Document } from 'mongoose';
import mongoose from 'mongoose';



/**
 * 用户平台配置
 */
export interface UserPlatformConfig {
  platform: PlatformType;
  isEnabled: boolean;
  credentials: {
    username?: string;
    password?: string;
    token?: string;
    cookies?: string;
    apiKey?: string;
    customConfig?: any;
  };
  lastLoginAt?: Date;
  isActive: boolean;
}

/**
 * 用户相关类型定义
 */
export interface IUser extends Document {
  _id: string;
  id: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  role: string;
  isActive: boolean;
  platformConfigs: UserPlatformConfig[];
  preferences?: {
    defaultCategory?: string;
    defaultTags?: string[];
    autoPublish?: boolean;
    notificationEnabled?: boolean;
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // 实例方法
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPlatformConfig(platform: string): UserPlatformConfig | undefined;
  updatePlatformConfig(platform: string, config: Partial<UserPlatformConfig>): void;
}

/**
 * 文章相关类型定义
 */
export interface IArticle extends Document {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  category: string;
  coverImage?: string;
  author: mongoose.Types.ObjectId; // 用户ID
  status: 'draft' | 'published' | 'archived' | 'deleted';
  visibility: 'public' | 'private' | 'unlisted';
  platforms: PlatformInfo[];
  publishSettings: {
    autoPublish: boolean;
    scheduledAt?: Date;
    selectedPlatforms: PlatformType[];
    customSettings: {
      csdn?: any;
      juejin?: any;
      huawei?: any;
      hexo?: any;
    };
  };
  statistics: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    lastUpdatedAt?: Date;
  };
  seo?: {
    slug?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  version: number;
  originalContent?: string;
  wordCount: number;
  readingTime: number;
  publishedPlatforms: IPlatformPublishStatus[];
  createdAt: Date;
  updatedAt: Date;
  // 实例方法
  getPlatformInfo(platform: string): PlatformInfo | undefined;
  updatePlatformStatus(platform: string, status: string, data?: Partial<PlatformInfo>): void;
  updateStatistics(): void;
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
 * 平台信息接口
 */
export interface PlatformInfo {
  platform: PlatformType;
  articleId?: string;
  url?: string;
  publishedAt?: Date;
  status: 'pending' | 'publishing' | 'published' | 'failed' | 'updated';
  errorMessage?: string;
  retryCount: number;
  lastAttemptAt?: Date;
  metadata: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    lastScrapedAt?: Date;
  };
}

/**
 * 支持的平台类型
 */
export type PlatformType = 'csdn' | 'juejin' | 'huawei' | 'hexo';

/**
 * 平台配置
 */
export interface IPlatformConfig {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  isEnabled?: boolean;
  platform: PlatformType;
  enabled: boolean;
  credentials: {
    username?: string;
    password?: string;
    apiKey?: string;
    token?: string;
    [key: string]: any;
  };
  settings: {
    autoPublish: boolean;
    publishDelay: number;
    maxRetries: number;
    defaultCategory?: string;
    defaultTags?: string[];
    [key: string]: any;
  };
  supportedFeatures?: {
    autoPublish?: boolean;
    scheduling?: boolean;
    categories?: boolean;
    tags?: boolean;
    coverImage?: boolean;
    draft?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  authConfig?: {
    type: 'username_password' | 'token' | 'oauth' | 'api_key' | 'cookies';
    fields?: Array<{
      name?: string;
      label?: string;
      type?: 'text' | 'password' | 'email' | 'url' | 'textarea';
      required?: boolean;
      placeholder?: string;
      description?: string;
    }>;
    loginUrl?: string;
    testEndpoint?: string;
  };
  publishConfig?: {
    baseUrl?: string;
    endpoints?: {
      publish?: string;
      update?: string;
      delete?: string;
      list?: string;
      detail?: string;
    };
    defaultCategory?: string;
    categoryMapping?: any;
    tagLimit?: number;
    contentLimit?: number;
    titleLimit?: number;
    summaryLimit?: number;
    imageUpload?: {
      supported?: boolean;
      maxSize?: number;
      allowedTypes?: string[];
      endpoint?: string;
    };
  };
  scrapeConfig?: {
    enabled?: boolean;
    baseUrl?: string;
    selectors?: {
      views?: string;
      likes?: string;
      comments?: string;
      shares?: string;
      title?: string;
      content?: string;
    };
    rateLimit?: {
      requests?: number;
      period?: number;
    };
    headers?: any;
    cookies?: any;
  };
  webhookConfig?: {
    enabled?: boolean;
    events?: Array<'publish' | 'update' | 'delete' | 'comment' | 'like'>;
    endpoint?: string;
    secret?: string;
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
  articleId: mongoose.Types.ObjectId;
  platform: PlatformType;
  platformArticleId?: string;
  url?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  collectedAt: Date;
  previousStats?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    collects: number;
  };
  growth?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    collects: number;
  };
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

/**
 * 文章数据接口 - 用于发布器
 */
export interface ArticleData {
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  category?: string;
  coverImage?: string;
  isDraft?: boolean;
  isOriginal?: boolean;
  publishImmediately?: boolean;
}

// 统计数据接口
export interface IStats {
  userId: mongoose.Types.ObjectId;
  type: 'article' | 'user' | 'platform' | 'system';
  date: Date;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  articleStats?: IArticleStats[];
  userStats?: any;
  platformStats?: any;
  systemStats?: any;
  comments?: IComment[];
  trends?: any;
  metadata?: any;
}

// 添加缺失的类型别名和导出
export type CommentData = {
  id: string;
  author: {
    name?: string;
    avatar?: string;
    url?: string;
  };
  content: string;
  publishedAt: Date;
  likes: number;
  replies: number;
  platform: PlatformType;
  url?: string;
  isReplied?: boolean;
  replyContent?: string;
  repliedAt?: Date;
  collectedAt: Date;
};
export interface IPlatform extends Document {
  _id: string;
  name: string;
  config: PlatformConfig;
  status: 'active' | 'inactive' | 'maintenance' | 'deprecated';
  version: string;
  lastUpdated: Date;
  statistics: {
    totalUsers: number;
    totalArticles: number;
    successRate: number;
    avgResponseTime: number;
    lastStatsUpdate?: Date;
  };
  maintenance: {
    isScheduled: boolean;
    startTime?: Date;
    endTime?: Date;
    reason?: string;
    message?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  // 实例方法
  isAvailable(): boolean;
  validatePublishData(data: any): { valid: boolean; errors: string[] };
  updateStatistics(stats: any): void;
}
export type PlatformConfig = IPlatformConfig;
export type ArticleStats = IArticleStats;