import mongoose from 'mongoose';

/**
 * 用户相关类型定义
 */
export interface IUser {
  _id: string;
  id: string;
  username: string;
  email: string;
  password?: string;
  avatar?: string;
  bio?: string;
  role: string;
  isActive: boolean;
  platformConfigs?: any[];
  preferences?: any;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // 实例方法
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPlatformConfig?(platform: string): any;
  updatePlatformConfig?(platform: string, config: any): void;
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
  author: string | any; // 用户ID，可以是ObjectId或string
  status: 'draft' | 'published' | 'archived' | 'deleted' | 'partial_published';
  visibility?: 'public' | 'private' | 'unlisted';
  platforms: PlatformInfo[];
  publishedPlatforms?: IPlatformPublishStatus[];
  publishSettings?: {
    autoPublish?: boolean;
    scheduledAt?: Date;
    selectedPlatforms?: PlatformType[];
    customSettings?: any;
  };
  statistics?: {
    totalViews?: number;
    totalLikes?: number;
    totalComments?: number;
    totalShares?: number;
    lastUpdatedAt?: Date;
  };
  seo?: {
    slug?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  version?: number;
  originalContent?: string;
  wordCount?: number;
  readingTime?: number;
  publishedAt?: Date;
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
 * 平台信息接口
 */
export interface PlatformInfo {
  platform: PlatformType;
  articleId?: string;
  url?: string;
  publishedAt?: Date;
  status: 'pending' | 'publishing' | 'published' | 'failed' | 'updated';
  error?: string;
  errorMessage?: string;
  retryCount?: number;
  lastAttemptAt?: Date;
  metadata?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    lastScrapedAt?: Date;
  };
}

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
 * 平台主配置接口
 */
export interface IPlatform {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  apiEndpoint?: string;
  authType: 'username_password' | 'token' | 'oauth' | 'api_key' | 'cookies';
  supportedFeatures: string[];
  config: PlatformConfig;
  status: 'active' | 'inactive' | 'maintenance';
  version?: string;
  lastUpdated?: Date;
  statistics?: {
    totalUsers?: number;
    activeUsers?: number;
    totalPublishes?: number;
    successfulPublishes?: number;
    failedPublishes?: number;
    successRate?: number;
    lastStatsUpdate?: Date;
  };
  maintenance?: {
    isScheduled?: boolean;
    startTime?: Date;
    endTime?: Date;
    reason?: string;
    message?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 平台详细配置接口
 */
export interface PlatformConfig {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  isEnabled: boolean;
  supportedFeatures: {
    autoPublish?: boolean;
    scheduling?: boolean;
    categories?: boolean;
    tags?: boolean;
    coverImage?: boolean;
    draft?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  authConfig: {
    type: 'username_password' | 'token' | 'oauth' | 'api_key' | 'cookies';
    fields?: Array<{
      name: string;
      label: string;
      type: 'text' | 'password' | 'email' | 'url' | 'textarea';
      required: boolean;
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
    events?: string[];
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

/**
 * 统计数据接口
 */
export interface IStats {
  _id: string;
  userId: string | mongoose.Types.ObjectId;
  type: 'article' | 'user' | 'platform' | 'system';
  date: Date;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  articleStats?: ArticleStats[];
  userStats?: any;
  platformStats?: any;
  systemStats?: any;
  comments?: CommentData[];
  trends?: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 文章统计数据
 */
export interface ArticleStats {
  articleId: string | mongoose.Types.ObjectId;
  platform: PlatformType;
  platformArticleId?: string;
  url?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  collects?: number;
  collectedAt: Date;
  previousStats?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    collects?: number;
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
export interface CommentData {
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
  isReplied: boolean;
  replyContent?: string;
  repliedAt?: Date;
}