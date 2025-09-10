"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stats = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const commentDataSchema = new mongoose_1.Schema({
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
const articleStatsSchema = new mongoose_1.Schema({
    articleId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const statsSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
    articleStats: [articleStatsSchema],
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
    comments: [commentDataSchema],
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
    metadata: {
        source: String,
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
statsSchema.pre('save', function (next) {
    if (this.articleStats && this.articleStats.length > 0) {
        this.articleStats.forEach((stat) => {
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
statsSchema.methods.addArticleStats = function (articleStats) {
    const existingIndex = this.articleStats.findIndex((stat) => stat.articleId.toString() === articleStats.articleId.toString() &&
        stat.platform === articleStats.platform);
    if (existingIndex >= 0) {
        const existing = this.articleStats[existingIndex];
        articleStats.previousStats = {
            views: existing.views,
            likes: existing.likes,
            comments: existing.comments,
            shares: existing.shares,
            collects: existing.collects
        };
        this.articleStats[existingIndex] = articleStats;
    }
    else {
        this.articleStats.push(articleStats);
    }
};
statsSchema.methods.getTrendData = function (metric, days = 30) {
    const trendKey = `${metric}Trend`;
    if (!this.trends || !this.trends[trendKey])
        return [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.trends[trendKey].filter((item) => item.date >= cutoffDate);
};
statsSchema.statics.getUserStats = function (userId, period = 'daily', limit = 30) {
    return this.find({
        userId,
        type: 'user',
        period
    })
        .sort({ date: -1 })
        .limit(limit);
};
statsSchema.statics.getPlatformStats = function (platform, period = 'daily', limit = 30) {
    return this.find({
        type: 'platform',
        'platformStats.platform': platform,
        period
    })
        .sort({ date: -1 })
        .limit(limit);
};
statsSchema.statics.getSystemStats = function (period = 'daily', limit = 30) {
    return this.find({
        type: 'system',
        period
    })
        .sort({ date: -1 })
        .limit(limit);
};
statsSchema.statics.aggregateUserData = function (userId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                userId: new mongoose_1.default.Types.ObjectId(userId),
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
statsSchema.index({ userId: 1, type: 1, date: -1 });
statsSchema.index({ type: 1, period: 1, date: -1 });
statsSchema.index({ 'articleStats.articleId': 1, 'articleStats.platform': 1 });
statsSchema.index({ 'platformStats.platform': 1, date: -1 });
statsSchema.index({ date: -1 });
exports.Stats = mongoose_1.default.model('Stats', statsSchema);
exports.default = exports.Stats;
//# sourceMappingURL=Stats.js.map