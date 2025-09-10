import mongoose, { Document, Schema } from 'mongoose';
import { IArticle, PlatformInfo } from '../types';

// 平台信息子文档
const platformInfoSchema = new Schema<PlatformInfo>({
  platform: {
    type: String,
    required: true,
    enum: ['csdn', 'juejin', 'huawei', 'hexo']
  },
  articleId: String,
  url: String,
  publishedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'publishing', 'published', 'failed', 'updated'],
    default: 'pending'
  },
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },
  lastAttemptAt: Date,
  metadata: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    lastScrapedAt: Date
  }
}, {
  _id: false,
  timestamps: false
});

// 文章主文档
const articleSchema = new Schema<IArticle>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    maxlength: 500
  },
  coverImage: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deleted'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platforms: [platformInfoSchema],
  publishSettings: {
    autoPublish: {
      type: Boolean,
      default: false
    },
    scheduledAt: Date,
    selectedPlatforms: [{
      type: String,
      enum: ['csdn', 'juejin', 'huawei', 'hexo']
    }],
    customSettings: {
      csdn: {
        type: Schema.Types.Mixed
      },
      juejin: {
        type: Schema.Types.Mixed
      },
      huawei: {
        type: Schema.Types.Mixed
      },
      hexo: {
        type: Schema.Types.Mixed
      }
    }
  },
  statistics: {
    totalViews: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalComments: {
      type: Number,
      default: 0
    },
    totalShares: {
      type: Number,
      default: 0
    },
    lastUpdatedAt: Date
  },
  seo: {
    slug: {
      type: String,
      unique: true,
      sparse: true
    },
    metaDescription: String,
    keywords: [String]
  },
  version: {
    type: Number,
    default: 1
  },
  originalContent: String, // 保存原始内容用于版本对比
  wordCount: {
    type: Number,
    default: 0
  },
  readingTime: {
    type: Number,
    default: 0 // 预估阅读时间（分钟）
  }
}, {
  timestamps: true
});

// 中间件：保存前计算字数和阅读时间
articleSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // 计算字数（去除HTML标签和Markdown语法）
    const plainText = (this as any).content
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/[#*`_~\[\]()]/g, '') // 移除Markdown语法
      .replace(/\s+/g, ' ') // 合并空白字符
      .trim();
    
    (this as any).wordCount = plainText.length;
    
    // 计算阅读时间（假设每分钟阅读200个字符）
    (this as any).readingTime = Math.ceil((this as any).wordCount / 200);
    
    // 自动生成摘要（如果没有提供）
    if (!(this as any).summary) {
      (this as any).summary = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
    }
  }
  
  // 生成SEO友好的slug
  if (this.isModified('title') && !(this as any).seo?.slug) {
    const slug = (this as any).title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (!(this as any).seo) (this as any).seo = {};
    (this as any).seo.slug = `${slug}-${Date.now()}`;
  }
  
  next();
});

// 实例方法：获取平台发布信息
articleSchema.methods.getPlatformInfo = function(platform: string): PlatformInfo | undefined {
  return this.platforms.find((p: PlatformInfo) => p.platform === platform);
};

// 实例方法：更新平台发布状态
articleSchema.methods.updatePlatformStatus = function(platform: string, status: string, data?: Partial<PlatformInfo>): void {
  const platformInfo = this.getPlatformInfo(platform);
  if (platformInfo) {
    platformInfo.status = status;
    platformInfo.lastAttemptAt = new Date();
    if (data) {
      Object.assign(platformInfo, data);
    }
  } else {
    this.platforms.push({
      platform,
      status,
      lastAttemptAt: new Date(),
      ...data
    } as PlatformInfo);
  }
};

// 实例方法：更新统计数据
articleSchema.methods.updateStatistics = function(): void {
  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  
  this.platforms.forEach((platform: PlatformInfo) => {
    if (platform.metadata) {
      totalViews += platform.metadata.views || 0;
      totalLikes += platform.metadata.likes || 0;
      totalComments += platform.metadata.comments || 0;
      totalShares += platform.metadata.shares || 0;
    }
  });
  
  this.statistics = {
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    lastUpdatedAt: new Date()
  };
};

// 静态方法：根据作者获取文章
articleSchema.statics.findByAuthor = function(authorId: string, options: any = {}) {
  const query = { author: authorId };
  if (options.status) {
    Object.assign(query, { status: options.status });
  }
  return this.find(query).populate('author', 'username email avatar').sort({ createdAt: -1 });
};

// 静态方法：搜索文章
articleSchema.statics.search = function(keyword: string, options: any = {}) {
  const searchRegex = new RegExp(keyword, 'i');
  const query = {
    $or: [
      { title: searchRegex },
      { content: searchRegex },
      { tags: { $in: [searchRegex] } },
      { category: searchRegex }
    ],
    status: { $ne: 'deleted' }
  };
  
  if (options.author) {
    Object.assign(query, { author: options.author });
  }
  
  return this.find(query)
    .populate('author', 'username email avatar')
    .sort({ createdAt: -1 })
    .limit(options.limit || 20);
};

// 索引
articleSchema.index({ author: 1, createdAt: -1 });
articleSchema.index({ status: 1, createdAt: -1 });
articleSchema.index({ title: 'text', content: 'text', tags: 'text' });
articleSchema.index({ 'seo.slug': 1 });
articleSchema.index({ category: 1 });
articleSchema.index({ tags: 1 });

export const Article = mongoose.model<IArticle>('Article', articleSchema);
export default Article;