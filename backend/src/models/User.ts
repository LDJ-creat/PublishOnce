import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, IUserPlatformConfig } from '../types';

// 扩展 IUser 接口以包含 Mongoose Document 方法
interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password?: string;
  avatar?: string;
  bio?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLoginAt?: Date;
  platformConfigs: IUserPlatformConfig[];
  preferences: {
    defaultCategory: string;
    defaultTags: string[];
    autoPublish: boolean;
    notificationEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPlatformConfig(platform: string): IUserPlatformConfig | undefined;
  updatePlatformConfig(platform: string, config: Partial<IUserPlatformConfig>): void;
}

// 定义静态方法接口
interface IUserModel extends Model<IUserDocument> {
  findByEmailOrUsername(identifier: string): Promise<IUserDocument | null>;
}

// 用户平台配置子文档
const userPlatformConfigSchema = new Schema<IUserPlatformConfig>({
  platform: {
    type: String,
    required: true,
    enum: ['csdn', 'juejin', 'huawei', 'hexo']
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  credentials: {
    username: String,
    password: String,
    token: String,
    cookies: String,
    apiKey: String,
    customConfig: Schema.Types.Mixed
  },
  lastLoginAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  _id: false,
  timestamps: false
});

// 用户主文档
const userSchema = new Schema<IUserDocument>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: Date,
  platformConfigs: [userPlatformConfigSchema],
  preferences: {
    defaultCategory: {
      type: String,
      default: '技术分享'
    },
    defaultTags: [{
      type: String
    }],
    autoPublish: {
      type: Boolean,
      default: false
    },
    notificationEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 实例方法：验证密码
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// 实例方法：获取平台配置
userSchema.methods.getPlatformConfig = function(platform: string): IUserPlatformConfig | undefined {
  return this.platformConfigs.find((config: IUserPlatformConfig) => config.platform === platform);
};

// 更新平台配置
userSchema.methods.updatePlatformConfig = function(platform: string, config: Partial<IUserPlatformConfig>): void {
  const existingConfig = this.getPlatformConfig(platform);
  if (existingConfig) {
    Object.assign(existingConfig, config);
  } else {
    this.platformConfigs.push({ platform, ...config } as IUserPlatformConfig);
  }
};

// 静态方法：根据邮箱或用户名查找用户
userSchema.statics.findByEmailOrUsername = function(identifier: string) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);
export { IUserDocument, IUserModel };
export default User;