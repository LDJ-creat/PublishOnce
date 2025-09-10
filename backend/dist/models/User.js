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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userPlatformConfigSchema = new mongoose_1.Schema({
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
        customConfig: mongoose_1.Schema.Types.Mixed
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
const userSchema = new mongoose_1.Schema({
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
        transform: function (doc, ret) {
            delete ret.password;
            return ret;
        }
    }
});
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
userSchema.methods.getPlatformConfig = function (platform) {
    return this.platformConfigs.find((config) => config.platform === platform);
};
userSchema.methods.updatePlatformConfig = function (platform, config) {
    const existingConfig = this.getPlatformConfig(platform);
    if (existingConfig) {
        Object.assign(existingConfig, config);
    }
    else {
        this.platformConfigs.push({ platform, ...config });
    }
};
userSchema.statics.findByEmailOrUsername = function (identifier) {
    return this.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
        ]
    });
};
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
exports.User = mongoose_1.default.model('User', userSchema);
exports.default = exports.User;
//# sourceMappingURL=User.js.map