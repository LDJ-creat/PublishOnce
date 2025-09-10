import mongoose, { Document, Schema } from 'mongoose';
import { IPlatform, PlatformConfig } from '../types';

// 平台配置子文档
const platformConfigSchema = new Schema<PlatformConfig>({
  name: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  icon: String,
  color: String,
  isEnabled: {
    type: Boolean,
    default: true
  },
  supportedFeatures: {
    autoPublish: {
      type: Boolean,
      default: false
    },
    scheduling: {
      type: Boolean,
      default: false
    },
    categories: {
      type: Boolean,
      default: true
    },
    tags: {
      type: Boolean,
      default: true
    },
    coverImage: {
      type: Boolean,
      default: false
    },
    draft: {
      type: Boolean,
      default: true
    },
    update: {
      type: Boolean,
      default: false
    },
    delete: {
      type: Boolean,
      default: false
    }
  },
  authConfig: {
    type: {
      type: String,
      enum: ['username_password', 'token', 'oauth', 'api_key', 'cookies'],
      required: true
    },
    fields: [{
      name: String,
      label: String,
      type: {
        type: String,
        enum: ['text', 'password', 'email', 'url', 'textarea']
      },
      required: Boolean,
      placeholder: String,
      description: String
    }],
    loginUrl: String,
    testEndpoint: String
  },
  publishConfig: {
    baseUrl: String,
    endpoints: {
      publish: String,
      update: String,
      delete: String,
      list: String,
      detail: String
    },
    defaultCategory: String,
    categoryMapping: Schema.Types.Mixed,
    tagLimit: {
      type: Number,
      default: 10
    },
    contentLimit: {
      type: Number,
      default: 50000
    },
    titleLimit: {
      type: Number,
      default: 100
    },
    summaryLimit: {
      type: Number,
      default: 200
    },
    imageUpload: {
      supported: {
        type: Boolean,
        default: false
      },
      maxSize: Number, // bytes
      allowedTypes: [String],
      endpoint: String
    }
  },
  scrapeConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    baseUrl: String,
    selectors: {
      views: String,
      likes: String,
      comments: String,
      shares: String,
      title: String,
      content: String
    },
    rateLimit: {
      requests: {
        type: Number,
        default: 10
      },
      period: {
        type: Number,
        default: 60000 // 1 minute
      }
    },
    headers: Schema.Types.Mixed,
    cookies: Schema.Types.Mixed
  },
  webhookConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    events: [{
      type: String,
      enum: ['publish', 'update', 'delete', 'comment', 'like']
    }],
    endpoint: String,
    secret: String
  }
}, {
  _id: false,
  timestamps: false
});

// 平台主文档
const platformSchema = new Schema<IPlatform>({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['csdn', 'juejin', 'huawei', 'hexo']
  },
  config: {
    type: platformConfigSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'deprecated'],
    default: 'active'
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  statistics: {
    totalUsers: {
      type: Number,
      default: 0
    },
    totalArticles: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 0
    },
    avgResponseTime: {
      type: Number,
      default: 0
    },
    lastStatsUpdate: Date
  },
  maintenance: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    startTime: Date,
    endTime: Date,
    reason: String,
    message: String
  }
}, {
  timestamps: true
});

// 实例方法：检查平台是否可用
platformSchema.methods.isAvailable = function(): boolean {
  if (this.status !== 'active') return false;
  if (!this.config.isEnabled) return false;
  
  // 检查是否在维护期间
  if (this.maintenance.isScheduled) {
    const now = new Date();
    if (this.maintenance.startTime && this.maintenance.endTime) {
      return now < this.maintenance.startTime || now > this.maintenance.endTime;
    }
  }
  
  return true;
};

// 实例方法：验证发布配置
platformSchema.methods.validatePublishData = function(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = this.config.publishConfig;
  
  if (!data.title) {
    errors.push('标题不能为空');
  } else if (data.title.length > config.titleLimit) {
    errors.push(`标题长度不能超过${config.titleLimit}个字符`);
  }
  
  if (!data.content) {
    errors.push('内容不能为空');
  } else if (data.content.length > config.contentLimit) {
    errors.push(`内容长度不能超过${config.contentLimit}个字符`);
  }
  
  if (data.summary && data.summary.length > config.summaryLimit) {
    errors.push(`摘要长度不能超过${config.summaryLimit}个字符`);
  }
  
  if (data.tags && data.tags.length > config.tagLimit) {
    errors.push(`标签数量不能超过${config.tagLimit}个`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// 实例方法：更新统计数据
platformSchema.methods.updateStatistics = function(stats: Partial<typeof this.statistics>): void {
  Object.assign(this.statistics, stats, { lastStatsUpdate: new Date() });
};

// 静态方法：获取可用平台
platformSchema.statics.getAvailablePlatforms = function() {
  return this.find({
    status: 'active',
    'config.isEnabled': true
  }).sort({ name: 1 });
};

// 静态方法：根据名称获取平台
platformSchema.statics.findByName = function(name: string) {
  return this.findOne({ name });
};

// 索引
platformSchema.index({ name: 1 });
platformSchema.index({ status: 1 });
platformSchema.index({ 'config.isEnabled': 1 });

export const Platform = mongoose.model<IPlatform>('Platform', platformSchema);
export default Platform;