"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authUtils = exports.rateLimit = exports.apiKeyAuth = exports.refreshTokenAuth = exports.requireOwnership = exports.requireAdmin = exports.requireRole = exports.optionalAuth = exports.authenticate = exports.verifyToken = exports.generateRefreshToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const errorHandler_1 = require("./errorHandler");
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};
exports.generateToken = generateToken;
const generateRefreshToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Invalid or expired token', 401);
    }
};
exports.verifyToken = verifyToken;
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.AppError('Access token is required', 401);
        }
        const token = authHeader.substring(7);
        const decoded = (0, exports.verifyToken)(token);
        if (decoded.type === 'refresh') {
            throw new errorHandler_1.AppError('Invalid token type', 401);
        }
        const user = await User_1.User.findById(decoded.userId).select('-password');
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 401);
        }
        if (!user.isActive) {
            throw new errorHandler_1.AppError('Account is deactivated', 401);
        }
        req.user = user;
        req.userId = user._id.toString();
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = (0, exports.verifyToken)(token);
            if (decoded.type !== 'refresh') {
                const user = await User_1.User.findById(decoded.userId).select('-password');
                if (user && user.isActive) {
                    req.user = user;
                    req.userId = user._id.toString();
                }
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.AppError('Authentication required', 401));
        }
        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(userRole)) {
            return next(new errorHandler_1.AppError('Insufficient permissions', 403));
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)('admin');
const requireOwnership = (resourceField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.AppError('Authentication required', 401));
        }
        if (req.user.role === 'admin') {
            return next();
        }
        const resourceUserId = req.params[resourceField] || req.body[resourceField];
        if (resourceUserId && resourceUserId !== req.userId) {
            return next(new errorHandler_1.AppError('Access denied: You can only access your own resources', 403));
        }
        next();
    };
};
exports.requireOwnership = requireOwnership;
const refreshTokenAuth = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new errorHandler_1.AppError('Refresh token is required', 401);
        }
        const decoded = (0, exports.verifyToken)(refreshToken);
        if (decoded.type !== 'refresh') {
            throw new errorHandler_1.AppError('Invalid refresh token', 401);
        }
        const user = await User_1.User.findById(decoded.userId).select('-password');
        if (!user || !user.isActive) {
            throw new errorHandler_1.AppError('User not found or inactive', 401);
        }
        req.user = user;
        req.userId = user._id.toString();
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.refreshTokenAuth = refreshTokenAuth;
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.API_KEY;
    if (!expectedApiKey) {
        return next(new errorHandler_1.AppError('API key authentication not configured', 500));
    }
    if (!apiKey || apiKey !== expectedApiKey) {
        return next(new errorHandler_1.AppError('Invalid API key', 401));
    }
    next();
};
exports.apiKeyAuth = apiKeyAuth;
const rateLimitStore = new Map();
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        const record = rateLimitStore.get(key);
        if (!record || now > record.resetTime) {
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }
        if (record.count >= maxRequests) {
            return next(new errorHandler_1.AppError('Too many requests', 429));
        }
        record.count++;
        next();
    };
};
exports.rateLimit = rateLimit;
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);
exports.authUtils = {
    generateToken: exports.generateToken,
    generateRefreshToken: exports.generateRefreshToken,
    verifyToken: exports.verifyToken,
    generateAuthResponse: (user) => {
        const token = (0, exports.generateToken)(user._id.toString());
        const refreshToken = (0, exports.generateRefreshToken)(user._id.toString());
        return {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                bio: user.bio,
                preferences: user.preferences
            },
            token,
            refreshToken,
            expiresIn: JWT_EXPIRES_IN
        };
    },
    getUserId: (req) => {
        return req.userId || null;
    },
    hasPermission: (user, permission) => {
        if (user.role === 'admin')
            return true;
        const userPermissions = {
            user: ['read:own', 'write:own', 'delete:own'],
            admin: ['read:all', 'write:all', 'delete:all', 'manage:users', 'manage:system']
        };
        return userPermissions[user.role]?.includes(permission) || false;
    }
};
//# sourceMappingURL=auth.js.map