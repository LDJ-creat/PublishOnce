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
exports.Article = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const platformInfoSchema = new mongoose_1.Schema({
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
const articleSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
                type: mongoose_1.Schema.Types.Mixed
            },
            juejin: {
                type: mongoose_1.Schema.Types.Mixed
            },
            huawei: {
                type: mongoose_1.Schema.Types.Mixed
            },
            hexo: {
                type: mongoose_1.Schema.Types.Mixed
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
    originalContent: String,
    wordCount: {
        type: Number,
        default: 0
    },
    readingTime: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
articleSchema.pre('save', function (next) {
    if (this.isModified('content')) {
        const plainText = this.content
            .replace(/<[^>]*>/g, '')
            .replace(/[#*`_~\[\]()]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        this.wordCount = plainText.length;
        this.readingTime = Math.ceil(this.wordCount / 200);
        if (!this.summary) {
            this.summary = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
        }
    }
    if (this.isModified('title') && !this.seo?.slug) {
        const slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        if (!this.seo)
            this.seo = {};
        this.seo.slug = `${slug}-${Date.now()}`;
    }
    next();
});
articleSchema.methods.getPlatformInfo = function (platform) {
    return this.platforms.find((p) => p.platform === platform);
};
articleSchema.methods.updatePlatformStatus = function (platform, status, data) {
    const platformInfo = this.getPlatformInfo(platform);
    if (platformInfo) {
        platformInfo.status = status;
        platformInfo.lastAttemptAt = new Date();
        if (data) {
            Object.assign(platformInfo, data);
        }
    }
    else {
        this.platforms.push({
            platform,
            status,
            lastAttemptAt: new Date(),
            ...data
        });
    }
};
articleSchema.methods.updateStatistics = function () {
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    this.platforms.forEach((platform) => {
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
articleSchema.statics.findByAuthor = function (authorId, options = {}) {
    const query = { author: authorId };
    if (options.status) {
        Object.assign(query, { status: options.status });
    }
    return this.find(query).populate('author', 'username email avatar').sort({ createdAt: -1 });
};
articleSchema.statics.search = function (keyword, options = {}) {
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
articleSchema.index({ author: 1, createdAt: -1 });
articleSchema.index({ status: 1, createdAt: -1 });
articleSchema.index({ title: 'text', content: 'text', tags: 'text' });
articleSchema.index({ 'seo.slug': 1 });
articleSchema.index({ category: 1 });
articleSchema.index({ tags: 1 });
exports.Article = mongoose_1.default.model('Article', articleSchema);
exports.default = exports.Article;
//# sourceMappingURL=Article.js.map