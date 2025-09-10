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
exports.toggleCredential = exports.testCredential = exports.deleteCredential = exports.saveCredential = exports.getCredentials = void 0;
const express_validator_1 = require("express-validator");
const mongoose_1 = __importDefault(require("mongoose"));
const PlatformCredential_1 = require("../models/PlatformCredential");
const getCredentials = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { platform } = req.query;
        const query = { userId };
        if (platform) {
            query.platform = platform;
        }
        const credentials = await PlatformCredential_1.PlatformCredential.find(query)
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: { credentials }
        });
    }
    catch (error) {
        console.error('获取平台凭据错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getCredentials = getCredentials;
const saveCredential = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '请求数据验证失败',
                errors: errors.array()
            });
        }
        const userId = req.user?.id;
        const { platform, credentials } = req.body;
        let platformCredential = await PlatformCredential_1.PlatformCredential.findOne({
            userId,
            platform
        });
        if (platformCredential) {
            platformCredential.credentials = credentials;
            platformCredential.isActive = true;
            await platformCredential.save();
        }
        else {
            platformCredential = new PlatformCredential_1.PlatformCredential({
                userId,
                platform,
                credentials,
                isActive: true
            });
            await platformCredential.save();
        }
        res.json({
            success: true,
            message: '平台凭据保存成功',
            data: { credential: platformCredential }
        });
    }
    catch (error) {
        console.error('保存平台凭据错误:', error);
        if (error instanceof mongoose_1.default.Error.ValidationError) {
            return res.status(400).json({
                success: false,
                message: '数据验证失败',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: '该平台凭据已存在'
            });
        }
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.saveCredential = saveCredential;
const deleteCredential = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的凭据ID'
            });
        }
        const credential = await PlatformCredential_1.PlatformCredential.findOneAndDelete({
            _id: id,
            userId
        });
        if (!credential) {
            return res.status(404).json({
                success: false,
                message: '凭据不存在或无权访问'
            });
        }
        res.json({
            success: true,
            message: '平台凭据删除成功'
        });
    }
    catch (error) {
        console.error('删除平台凭据错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.deleteCredential = deleteCredential;
const testCredential = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的凭据ID'
            });
        }
        const credential = await PlatformCredential_1.PlatformCredential.findOne({
            _id: id,
            userId
        }).select('+credentials');
        if (!credential) {
            return res.status(404).json({
                success: false,
                message: '凭据不存在或无权访问'
            });
        }
        const isValid = credential.validateCredentials();
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: '凭据格式不完整'
            });
        }
        try {
            const { createPlatformPublisher } = await Promise.resolve().then(() => __importStar(require('../services/publishers/index')));
            const publisher = createPlatformPublisher(credential.platform);
            if (!publisher) {
                return res.status(400).json({
                    success: false,
                    message: '不支持的平台'
                });
            }
            const loginResult = await publisher.login(credential.credentials);
            if (loginResult) {
                await PlatformCredential_1.PlatformCredential.updateLastUsed(userId, credential.platform);
                res.json({
                    success: true,
                    message: '凭据测试成功'
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: '凭据验证失败，请检查用户名和密码'
                });
            }
        }
        catch (error) {
            console.error('测试凭据失败:', error);
            res.status(400).json({
                success: false,
                message: '凭据测试失败: ' + (error instanceof Error ? error.message : '未知错误')
            });
        }
    }
    catch (error) {
        console.error('测试平台凭据错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.testCredential = testCredential;
const toggleCredential = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的凭据ID'
            });
        }
        const credential = await PlatformCredential_1.PlatformCredential.findOne({
            _id: id,
            userId
        });
        if (!credential) {
            return res.status(404).json({
                success: false,
                message: '凭据不存在或无权访问'
            });
        }
        credential.isActive = !credential.isActive;
        await credential.save();
        res.json({
            success: true,
            message: `凭据已${credential.isActive ? '启用' : '禁用'}`,
            data: { credential }
        });
    }
    catch (error) {
        console.error('切换凭据状态错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.toggleCredential = toggleCredential;
//# sourceMappingURL=credentialController.js.map