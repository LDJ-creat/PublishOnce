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
exports.Platform = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const platformConfigSchema = new mongoose_1.Schema({
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
        categoryMapping: mongoose_1.Schema.Types.Mixed,
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
            maxSize: Number,
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
                default: 60000
            }
        },
        headers: mongoose_1.Schema.Types.Mixed,
        cookies: mongoose_1.Schema.Types.Mixed
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
const platformSchema = new mongoose_1.Schema({
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
platformSchema.methods.isAvailable = function () {
    if (this.status !== 'active')
        return false;
    if (!this.config.isEnabled)
        return false;
    if (this.maintenance.isScheduled) {
        const now = new Date();
        if (this.maintenance.startTime && this.maintenance.endTime) {
            return now < this.maintenance.startTime || now > this.maintenance.endTime;
        }
    }
    return true;
};
platformSchema.methods.validatePublishData = function (data) {
    const errors = [];
    const config = this.config.publishConfig;
    if (!data.title) {
        errors.push('标题不能为空');
    }
    else if (data.title.length > config.titleLimit) {
        errors.push(`标题长度不能超过${config.titleLimit}个字符`);
    }
    if (!data.content) {
        errors.push('内容不能为空');
    }
    else if (data.content.length > config.contentLimit) {
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
platformSchema.methods.updateStatistics = function (stats) {
    Object.assign(this.statistics, stats, { lastStatsUpdate: new Date() });
};
platformSchema.statics.getAvailablePlatforms = function () {
    return this.find({
        status: 'active',
        'config.isEnabled': true
    }).sort({ name: 1 });
};
platformSchema.statics.findByName = function (name) {
    return this.findOne({ name });
};
platformSchema.index({ name: 1 });
platformSchema.index({ status: 1 });
platformSchema.index({ 'config.isEnabled': 1 });
exports.Platform = mongoose_1.default.model('Platform', platformSchema);
exports.default = exports.Platform;
//# sourceMappingURL=Platform.js.map