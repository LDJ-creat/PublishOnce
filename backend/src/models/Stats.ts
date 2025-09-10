import mongoose, { Document, Schema } from 'mongoose';
import { IStats, ArticleStats, CommentData } from '../types';

// 评论数据子文档
const commentDataSchema = new Schema<CommentData>({
  id: {
    type: String,
    required: true
  },
  author: {
    name: String,
    avatar: String,
    url: String
  },
  content: {
    type: String,
    required: true
  },
  publishedAt: {
    type: Date,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  },
  replies: {
    type: Number,
    default: 0
  },
  platform: {
    type: String,
    required: true,
    enum: ['csdn', 'juejin', 'huawei', 'hexo']
  },
  url: String,
  isReplied: {
    type: Boolean,
    default: false
  },
  replyContent: String,
  repliedAt: Date
}, {
  _id: false,
  timestamps: false
});

// 文章统计数据子文档
const articleStatsSchema = new Schema<ArticleStats>({
  articleId: {
    type: Schema.Types.ObjectId,
    ref: 'Article',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['csdn', 'juejin', 'huawei', 'hexo']
  },
  platformArticleId: String,
  url: String,
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
  collects: {
    type: Number,
    default: 0
  },
  collectedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  previousStats: {
    views: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    collects: Number
  },
  growth: {
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
    collects: {
      type: Number,
      default: 0
    }
  }
}, {
  _id: false,
  timestamps: false
});

// 统计主文档
const statsSchema = new Schema<IStats>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['article', 'user', 'platform', 'system'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  // 文章统计数据
  articleStats: [articleStatsSchema],
  
  // 用户总体统计
  userStats: {
    totalArticles: {
      type: Number,
      default: 0
    },
    publishedArticles: {
      type: Number,
      default: 0
    },
    draftArticles: {
      type: Number,
      default: 0
    },
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
    totalCollects: {
      type: Number,
      default: 0
    },
    avgViewsPerArticle: {
      type: Number,
      default: 0
    },
    avgLikesPerArticle: {
      type: Number,
      default: 0
    },
    platformBreakdown: {
      csdn: {
        articles: { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 }
      },
      juejin: {
        articles: { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 }
      },
      huawei: {
        articles: { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 }
      },
      hexo: {
        articles: { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 }
      }
    }
  },
  
  // 平台统计
  platformStats: {
    platform: {
      type: String,
      enum: ['csdn', 'juejin', 'huawei', 'hexo']
    },
    totalUsers: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    totalPublishes: {
      type: Number,
      default: 0
    },
    successfulPublishes: {
      type: Number,
      default: 0
    },
    failedPublishes: {
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
    }
  },
  
  // 系统统计
  systemStats: {
    totalUsers: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    totalArticles: {
      type: Number,
      default: 0
    },
    totalPublishes: {
      type: Number,
      default: 0
    },
    queueStats: {
      pending: { type: Number, default: 0 },
      processing: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 }
    },
    performance: {
      avgPublishTime: { type: Number, default: 0 },
      avgScrapeTime: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 }
    }
  },
  
  // 评论数据
  comments: [commentDataSchema],
  
  // 趋势数据
  trends: {
    viewsTrend: [{
      date: Date,
      value: Number
    }],
    likesTrend: [{
      date: Date,
      value: Number
    }],
    commentsTrend: [{
      date: Date,
      value: Number
    }],
    publishTrend: [{
      date: Date,
      value: Number
    }]
  },
  
  // 元数据
  metadata: {
    source: String, // 数据来源
    version: {
      type: String,
      default: '1.0.0'
    },
    isProcessed: {
      type: Boolean,
      default: false
    },
    processingErrors: [String]
  }
}, {
  timestamps: true
});

// 中间件：保存前计算增长数据
statsSchema.pre('save', function(next) {
  const self = this as any;
  if (self.articleStats && self.articleStats.length > 0) {
    self.articleStats.forEach((stat: any) => {
      if (stat.previousStats) {
        stat.growth = {
          views: stat.views - (stat.previousStats.views || 0),
          likes: stat.likes - (stat.previousStats.likes || 0),
          comments: stat.comments - (stat.previousStats.comments || 0),
          shares: stat.shares - (stat.previousStats.shares || 0),
          collects: stat.collects - (stat.previousStats.collects || 0)
        };
      }
    });
  }
  next();
});

// 实例方法：添加文章统计
statsSchema.methods.addArticleStats = function(articleStats: ArticleStats): void {
  const self = this as any;
  const existingIndex = self.articleStats.findIndex(
    (stat: ArticleStats) => 
      stat.articleId.toString() === articleStats.articleId.toString() && 
      stat.platform === articleStats.platform
  );
  
  if (existingIndex >= 0) {
    // 保存之前的数据用于计算增长
    const existing = self.articleStats[existingIndex];
    (articleStats as any).previousStats = {
      views: existing.views,
      likes: existing.likes,
      comments: existing.comments,
      shares: existing.shares,
      collects: existing.collects
    };
    self.articleStats[existingIndex] = articleStats;
  } else {
    self.articleStats.push(articleStats);
  }
};

// 实例方法：获取趋势数据
statsSchema.methods.getTrendData = function(metric: string, days: number = 30) {
  const trendKey = `${metric}Trend` as keyof typeof this.trends;
  if (!this.trends || !this.trends[trendKey]) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.trends[trendKey].filter((item: any) => item.date >= cutoffDate);
};

// 静态方法：获取用户统计
statsSchema.statics.getUserStats = function(userId: string, period: string = 'daily', limit: number = 30) {
  return this.find({
    userId,
    type: 'user',
    period
  })
  .sort({ date: -1 })
  .limit(limit);
};

// 静态方法：获取平台统计
statsSchema.statics.getPlatformStats = function(platform: string, period: string = 'daily', limit: number = 30) {
  return this.find({
    type: 'platform',
    'platformStats.platform': platform,
    period
  })
  .sort({ date: -1 })
  .limit(limit);
};

// 静态方法：获取系统统计
statsSchema.statics.getSystemStats = function(period: string = 'daily', limit: number = 30) {
  return this.find({
    type: 'system',
    period
  })
  .sort({ date: -1 })
  .limit(limit);
};

// 静态方法：聚合用户数据
statsSchema.statics.aggregateUserData = function(userId: string, startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'article',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $unwind: '$articleStats'
    },
    {
      $group: {
        _id: '$articleStats.platform',
        totalViews: { $sum: '$articleStats.views' },
        totalLikes: { $sum: '$articleStats.likes' },
        totalComments: { $sum: '$articleStats.comments' },
        totalShares: { $sum: '$articleStats.shares' },
        articleCount: { $sum: 1 }
      }
    }
  ]);
};

// 索引
statsSchema.index({ userId: 1, type: 1, date: -1 });
statsSchema.index({ type: 1, period: 1, date: -1 });
statsSchema.index({ 'articleStats.articleId': 1, 'articleStats.platform': 1 });
statsSchema.index({ 'platformStats.platform': 1, date: -1 });
statsSchema.index({ date: -1 });

export const Stats = mongoose.model<IStats>('Stats', statsSchema);
export default Stats;