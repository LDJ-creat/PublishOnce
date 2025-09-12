import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 平台凭据接口
 */
export interface IPlatformCredential extends Document {
  userId: mongoose.Types.ObjectId;
  platform: string;
  credentials: {
    username?: string;
    password?: string;
    email?: string;
    phone?: string;
    token?: string;
    apiKey?: string;
    [key: string]: any;
  };
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // 实例方法
  validateCredentials(): boolean;
}

/**
 * 平台凭据模型接口
 */
export interface IPlatformCredentialModel extends Model<IPlatformCredential> {
  getUserCredentials(userId: string, platforms?: string[]): Promise<IPlatformCredential[]>;
  updateLastUsed(userId: string, platform: string): Promise<void>;
}

/**
 * 平台凭据模式
 */
const PlatformCredentialSchema = new Schema<IPlatformCredential>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['csdn', 'juejin', 'huawei', 'wechat', 'zhihu', 'segmentfault'],
    index: true
  },
  credentials: {
    type: Schema.Types.Mixed,
    required: true,
    // 加密存储敏感信息
    set: function(credentials: any) {
      // TODO: 实现加密逻辑
      return credentials;
    },
    get: function(credentials: any) {
      // TODO: 实现解密逻辑
      return credentials;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // 不返回敏感的凭据信息
      if (ret.credentials) {
        ret.credentials = {
          username: ret.credentials.username || '',
          email: ret.credentials.email || '',
          // 隐藏密码等敏感信息
          hasPassword: !!ret.credentials.password,
          hasToken: !!ret.credentials.token,
          hasApiKey: !!ret.credentials.apiKey
        };
      }
      return ret;
    }
  }
});

// 复合索引：用户ID + 平台唯一
PlatformCredentialSchema.index({ userId: 1, platform: 1 }, { unique: true });

// 实例方法：验证凭据
PlatformCredentialSchema.methods.validateCredentials = function(): boolean {
  const { platform, credentials } = this;
  
  switch (platform) {
    case 'csdn':
    case 'juejin':
    case 'huawei':
      return !!(credentials.username && credentials.password);
    case 'wechat':
      return !!(credentials.email && credentials.password);
    default:
      return false;
  }
};

// 静态方法：获取用户的平台凭据
PlatformCredentialSchema.statics.getUserCredentials = async function(
  userId: string, 
  platforms?: string[]
) {
  const query: any = { userId, isActive: true };
  if (platforms && platforms.length > 0) {
    query.platform = { $in: platforms };
  }
  
  const credentials = await this.find(query).select('+credentials');
  const result: { [platform: string]: any } = {};
  
  credentials.forEach((cred: any) => {
    result[cred.platform] = cred.credentials;
  });
  
  return result;
};

// 静态方法：更新最后使用时间
PlatformCredentialSchema.statics.updateLastUsed = async function(
  userId: string,
  platform: string
) {
  await this.updateOne(
    { userId, platform },
    { lastUsed: new Date() }
  );
};

export const PlatformCredential = mongoose.model<IPlatformCredential, IPlatformCredentialModel>(
  'PlatformCredential',
  PlatformCredentialSchema
);

export default PlatformCredential;