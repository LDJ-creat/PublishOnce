// 统一导出数据模型
import { User, IUserDocument, IUserModel } from './User';
import { Article } from './Article';
import { Platform } from './Platform';
import { PlatformCredential } from './PlatformCredential';
import { Stats } from './Stats';

export { User, IUserDocument, IUserModel, default as UserModel } from './User';
export { Article, default as ArticleModel } from './Article';
export { Platform, default as PlatformModel } from './Platform';
export { PlatformCredential, default as PlatformCredentialModel } from './PlatformCredential';
export { Stats, default as StatsModel } from './Stats';

// 导出模型类型
export type {
  IUser,
  IArticle,
  IPlatform,
  IUserPlatformConfig,
  PlatformInfo,
  PlatformConfig,
  IArticleStats
} from '../types';

// 模型初始化函数
export const initializeModels = async () => {
  try {
    // 这里可以添加模型初始化逻辑
    // 比如创建默认数据、索引等
    console.log('Models initialized successfully');
  } catch (error) {
    console.error('Error initializing models:', error);
    throw error;
  }
};

// 导出所有模型的数组，方便批量操作
export const allModels = {
  User,
  Article,
  Platform,
  PlatformCredential,
  Stats
};