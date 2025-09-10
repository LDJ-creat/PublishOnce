import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, UserPlatformConfig } from '../types';

// 用户平台配置子文档
const userPlatformConfigSchema = new Schema<UserPlatformConfig>({
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
const userSchema = new Schema<IUser>({
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
    minlength: 6,
    select: false
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
      if (ret.password) {
        delete (ret as any).password;
      }
      return ret;
    }
  }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 实例方法：验证密码
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// 实例方法：获取平台配置
userSchema.methods.getPlatformConfig = function(platform: string): UserPlatformConfig | undefined {
  return this.platformConfigs.find((config: UserPlatformConfig) => config.platform === platform);
};

// 实例方法：更新平台配置
userSchema.methods.updatePlatformConfig = function(platform: string, config: Partial<UserPlatformConfig>): void {
  const existingConfig = this.getPlatformConfig(platform);
  if (existingConfig) {
    Object.assign(existingConfig, config);
  } else {
    this.platformConfigs.push({ platform, ...config } as UserPlatformConfig);
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

export const User = mongoose.model<IUser>('User', userSchema);
export default User;