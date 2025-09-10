"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatforms = exports.verifyToken = exports.logout = exports.refreshToken = exports.deletePlatformConfig = exports.updatePlatformConfig = exports.changePassword = exports.updateProfile = exports.getCurrentUser = exports.login = exports.register = void 0;
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const register = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '请求数据验证失败',
                errors: errors.array()
            });
        }
        const { username, email, password } = req.body;
        const existingUser = await User_1.User.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: '用户名或邮箱已存在'
            });
        }
        const user = new User_1.User({
            username,
            email,
            password
        });
        await user.save();
        const token = (0, auth_1.generateToken)(user._id.toString());
        const refreshToken = (0, auth_1.generateRefreshToken)(user._id.toString());
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt
        };
        res.status(201).json({
            success: true,
            message: '用户注册成功',
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    }
    catch (error) {
        console.error('用户注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '请求数据验证失败',
                errors: errors.array()
            });
        }
        const { email, password } = req.body;
        const user = await User_1.User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: '账户已被禁用，请联系管理员'
            });
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }
        user.lastLoginAt = new Date();
        await user.save();
        const token = (0, auth_1.generateToken)(user._id.toString());
        const refreshToken = (0, auth_1.generateRefreshToken)(user._id.toString());
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
        };
        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    }
    catch (error) {
        console.error('用户登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.login = login;
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            platformConfigs: user.platformConfigs,
            preferences: user.preferences,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        res.json({
            success: true,
            data: { user: userResponse }
        });
    }
    catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getCurrentUser = getCurrentUser;
const updateProfile = async (req, res) => {
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
        const { username, preferences } = req.body;
        if (username) {
            const existingUser = await User_1.User.findOne({
                username,
                _id: { $ne: userId }
            });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: '用户名已被使用'
                });
            }
        }
        const updateData = {};
        if (username)
            updateData.username = username;
        if (preferences)
            updateData.preferences = preferences;
        const user = await User_1.User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            platformConfigs: user.platformConfigs,
            preferences: user.preferences,
            updatedAt: user.updatedAt
        };
        res.json({
            success: true,
            message: '用户信息更新成功',
            data: { user: userResponse }
        });
    }
    catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
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
        const { currentPassword, newPassword } = req.body;
        const user = await User_1.User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: '当前密码错误'
            });
        }
        user.password = newPassword;
        await user.save();
        res.json({
            success: true,
            message: '密码修改成功'
        });
    }
    catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.changePassword = changePassword;
const updatePlatformConfig = async (req, res) => {
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
        const { platform, config } = req.body;
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        const platformIndex = user.platformConfigs.findIndex((pc) => pc.platform === platform);
        if (platformIndex >= 0) {
            user.platformConfigs[platformIndex] = {
                ...user.platformConfigs[platformIndex],
                ...config,
                platform,
                updatedAt: new Date()
            };
        }
        else {
            user.platformConfigs.push({
                platform,
                ...config,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        await user.save();
        res.json({
            success: true,
            message: '平台配置更新成功',
            data: {
                platformConfigs: user.platformConfigs
            }
        });
    }
    catch (error) {
        console.error('更新平台配置错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.updatePlatformConfig = updatePlatformConfig;
const deletePlatformConfig = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { platform } = req.params;
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        user.platformConfigs = user.platformConfigs.filter((pc) => pc.platform !== platform);
        await user.save();
        res.json({
            success: true,
            message: '平台配置删除成功',
            data: {
                platformConfigs: user.platformConfigs
            }
        });
    }
    catch (error) {
        console.error('删除平台配置错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.deletePlatformConfig = deletePlatformConfig;
const refreshToken = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }
        const token = (0, auth_1.generateToken)(user.id);
        res.json({
            success: true,
            message: '令牌刷新成功',
            data: {
                token,
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            }
        });
    }
    catch (error) {
        console.error('刷新令牌错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.refreshToken = refreshToken;
const logout = async (req, res) => {
    try {
        res.json({
            success: true,
            message: '登出成功'
        });
    }
    catch (error) {
        console.error('登出错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.logout = logout;
const verifyToken = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }
        res.json({
            success: true,
            message: 'Token有效',
            data: {
                userId: user.id,
                username: user.username,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('验证令牌错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.verifyToken = verifyToken;
const getPlatforms = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }
        const userDoc = await User_1.User.findById(user.id);
        if (!userDoc) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        res.json({
            success: true,
            data: {
                platforms: userDoc.platformConfigs?.map((config) => ({
                    platform: config.platform,
                    isEnabled: config.isEnabled,
                    isActive: config.isActive,
                    lastLoginAt: config.lastLoginAt,
                    hasCredentials: !!(config.credentials?.username || config.credentials?.token)
                })) || []
            }
        });
    }
    catch (error) {
        console.error('获取平台配置错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getPlatforms = getPlatforms;
//# sourceMappingURL=userController.js.map