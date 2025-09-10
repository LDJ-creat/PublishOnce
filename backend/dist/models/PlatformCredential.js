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
exports.PlatformCredential = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PlatformCredentialSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
        set: function (credentials) {
            return credentials;
        },
        get: function (credentials) {
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
        transform: function (doc, ret) {
            if (ret.credentials) {
                ret.credentials = {
                    username: ret.credentials.username || '',
                    email: ret.credentials.email || '',
                    hasPassword: !!ret.credentials.password,
                    hasToken: !!ret.credentials.token,
                    hasApiKey: !!ret.credentials.apiKey
                };
            }
            return ret;
        }
    }
});
PlatformCredentialSchema.index({ userId: 1, platform: 1 }, { unique: true });
PlatformCredentialSchema.methods.validateCredentials = function () {
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
PlatformCredentialSchema.statics.getUserCredentials = async function (userId, platforms) {
    const query = { userId, isActive: true };
    if (platforms && platforms.length > 0) {
        query.platform = { $in: platforms };
    }
    const credentials = await this.find(query).select('+credentials');
    const result = {};
    credentials.forEach((cred) => {
        result[cred.platform] = cred.credentials;
    });
    return result;
};
PlatformCredentialSchema.statics.updateLastUsed = async function (userId, platform) {
    await this.updateOne({ userId, platform }, { lastUsed: new Date() });
};
exports.PlatformCredential = mongoose_1.default.model('PlatformCredential', PlatformCredentialSchema);
exports.default = exports.PlatformCredential;
//# sourceMappingURL=PlatformCredential.js.map