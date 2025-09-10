"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformStats = exports.testPlatformConnection = exports.deletePlatform = exports.updatePlatform = exports.createPlatform = exports.getPlatformById = exports.getAllPlatforms = void 0;
const Platform_1 = require("../models/Platform");
const User_1 = require("../models/User");
const express_validator_1 = require("express-validator");
const mongoose_1 = __importDefault(require("mongoose"));
const getAllPlatforms = async (req, res) => {
    try {
        const platforms = await Platform_1.Platform.find({ isActive: true })
            .select('name displayName description icon apiEndpoint supportedFeatures')
            .sort({ displayName: 1 });
        res.json({
            success: true,
            data: { platforms }
        });
    }
    catch (error) {
        console.error('获取平台列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getAllPlatforms = getAllPlatforms;
const getPlatformById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的平台ID'
            });
        }
        const platform = await Platform_1.Platform.findById(id);
        if (!platform) {
            return res.status(404).json({
                success: false,
                message: '平台不存在'
            });
        }
        res.json({
            success: true,
            data: { platform }
        });
    }
    catch (error) {
        console.error('获取平台详情错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getPlatformById = getPlatformById;
const createPlatform = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '请求数据验证失败',
                errors: errors.array()
            });
        }
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '权限不足，只有管理员可以创建平台配置'
            });
        }
        const { name, displayName, description, icon, apiEndpoint, authType, supportedFeatures, config } = req.body;
        const existingPlatform = await Platform_1.Platform.findOne({ name });
        if (existingPlatform) {
            return res.status(409).json({
                success: false,
                message: '平台名称已存在'
            });
        }
        const platform = new Platform_1.Platform({
            name,
            displayName,
            description,
            icon,
            apiEndpoint,
            authType,
            supportedFeatures: supportedFeatures || [],
            config: config || {}
        });
        await platform.save();
        res.status(201).json({
            success: true,
            message: '平台创建成功',
            data: { platform }
        });
    }
    catch (error) {
        console.error('创建平台错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.createPlatform = createPlatform;
const updatePlatform = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '请求数据验证失败',
                errors: errors.array()
            });
        }
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '权限不足，只有管理员可以更新平台配置'
            });
        }
        const { id } = req.params;
        const updateData = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的平台ID'
            });
        }
        if (updateData.name) {
            const existingPlatform = await Platform_1.Platform.findOne({
                name: updateData.name,
                _id: { $ne: id }
            });
            if (existingPlatform) {
                return res.status(409).json({
                    success: false,
                    message: '平台名称已存在'
                });
            }
        }
        const platform = await Platform_1.Platform.findByIdAndUpdate(id, { ...updateData, updatedAt: new Date() }, { new: true, runValidators: true });
        if (!platform) {
            return res.status(404).json({
                success: false,
                message: '平台不存在'
            });
        }
        res.json({
            success: true,
            message: '平台更新成功',
            data: { platform }
        });
    }
    catch (error) {
        console.error('更新平台错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.updatePlatform = updatePlatform;
const deletePlatform = async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '权限不足，只有管理员可以删除平台配置'
            });
        }
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的平台ID'
            });
        }
        const usersUsingPlatform = await User_1.User.countDocuments({
            'platformConfigs.platform': id
        });
        if (usersUsingPlatform > 0) {
            return res.status(400).json({
                success: false,
                message: `无法删除平台，还有 ${usersUsingPlatform} 个用户正在使用该平台`
            });
        }
        const platform = await Platform_1.Platform.findByIdAndDelete(id);
        if (!platform) {
            return res.status(404).json({
                success: false,
                message: '平台不存在'
            });
        }
        res.json({
            success: true,
            message: '平台删除成功'
        });
    }
    catch (error) {
        console.error('删除平台错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.deletePlatform = deletePlatform;
const testPlatformConnection = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '请求数据验证失败',
                errors: errors.array()
            });
        }
        const { platformId, credentials } = req.body;
        const userId = req.user?.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(platformId)) {
            return res.status(400).json({
                success: false,
                message: '无效的平台ID'
            });
        }
        const platform = await Platform_1.Platform.findById(platformId);
        if (!platform) {
            return res.status(404).json({
                success: false,
                message: '平台不存在'
            });
        }
        if (!platform.isActive) {
            return res.status(400).json({
                success: false,
                message: '平台已禁用'
            });
        }
        const testResult = await simulatePlatformTest(platform.name, credentials);
        if (testResult.success) {
            const user = await User_1.User.findById(userId);
            if (user) {
                const platformIndex = user.platformConfigs.findIndex((pc) => pc.platform === platform.name);
                const configData = {
                    platform: platform.name,
                    isEnabled: true,
                    isActive: true,
                    credentials,
                    lastTestAt: new Date(),
                    updatedAt: new Date()
                };
                if (platformIndex >= 0) {
                    user.platformConfigs[platformIndex] = {
                        ...user.platformConfigs[platformIndex],
                        ...configData
                    };
                }
                else {
                    user.platformConfigs.push({
                        ...configData,
                        createdAt: new Date()
                    });
                }
                await user.save();
            }
        }
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    }
    catch (error) {
        console.error('测试平台连接错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.testPlatformConnection = testPlatformConnection;
const getPlatformStats = async (req, res) => {
    try {
        const platformUsageStats = await User_1.User.aggregate([
            { $unwind: '$platformConfigs' },
            {
                $group: {
                    _id: '$platformConfigs.platform',
                    totalUsers: { $sum: 1 },
                    activeUsers: {
                        $sum: { $cond: ['$platformConfigs.isActive', 1, 0] }
                    },
                    enabledUsers: {
                        $sum: { $cond: ['$platformConfigs.isEnabled', 1, 0] }
                    }
                }
            },
            { $sort: { totalUsers: -1 } }
        ]);
        const totalPlatforms = await Platform_1.Platform.countDocuments();
        const activePlatforms = await Platform_1.Platform.countDocuments({ isActive: true });
        res.json({
            success: true,
            data: {
                overview: {
                    totalPlatforms,
                    activePlatforms,
                    inactivePlatforms: totalPlatforms - activePlatforms
                },
                usage: platformUsageStats
            }
        });
    }
    catch (error) {
        console.error('获取平台统计错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getPlatformStats = getPlatformStats;
async function simulatePlatformTest(platformName, credentials) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    switch (platformName) {
        case 'csdn':
            if (credentials.username && credentials.password) {
                return {
                    success: true,
                    message: 'CSDN连接测试成功',
                    data: {
                        username: credentials.username,
                        lastLoginAt: new Date()
                    }
                };
            }
            break;
        case 'juejin':
            if (credentials.token) {
                return {
                    success: true,
                    message: '掘金连接测试成功',
                    data: {
                        tokenValid: true,
                        lastLoginAt: new Date()
                    }
                };
            }
            break;
        case 'huawei':
            if (credentials.apiKey && credentials.secretKey) {
                return {
                    success: true,
                    message: '华为云连接测试成功',
                    data: {
                        apiKeyValid: true,
                        lastLoginAt: new Date()
                    }
                };
            }
            break;
        case 'hexo':
            if (credentials.deployUrl) {
                return {
                    success: true,
                    message: 'Hexo连接测试成功',
                    data: {
                        deployUrl: credentials.deployUrl,
                        lastLoginAt: new Date()
                    }
                };
            }
            break;
        default:
            return {
                success: false,
                message: '不支持的平台类型',
                data: null
            };
    }
    return {
        success: false,
        message: '认证信息不完整或无效',
        data: null
    };
}
//# sourceMappingURL=platformController.js.map