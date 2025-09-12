import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AppError } from './errorHandler';
import { IUser } from '../types';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
    }
  }
}

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// JWT工具函数
export const generateToken = (userId: string): string => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string
  });
};

export const generateRefreshToken = (userId: string): string => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as string
  });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
};

// 认证中间件
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token is required', 401);
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    
    // 验证token
    const decoded = verifyToken(token);
    
    if (decoded.type === 'refresh') {
      throw new AppError('Invalid token type', 401);
    }

    // 查找用户
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    // 将用户信息添加到请求对象
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    next(error);
  }
};

// 可选认证中间件（不强制要求登录）
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded.type !== 'refresh') {
        const user = await User.findById(decoded.userId).select('-password');
        if (user && user.isActive) {
          req.user = user;
          req.userId = user._id.toString();
        }
      }
    }
    next();
  } catch (error) {
    // 可选认证失败时不抛出错误，继续执行
    next();
  }
};

// 角色验证中间件
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

// 管理员权限中间件
export const requireAdmin = requireRole('admin');

// 用户所有权验证中间件
export const requireOwnership = (resourceField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // 管理员可以访问所有资源
    if (req.user.role === 'admin') {
      return next();
    }

    // 检查资源所有权
    const resourceUserId = req.params[resourceField] || req.body[resourceField];
    if (resourceUserId && resourceUserId !== req.userId) {
      return next(new AppError('Access denied: You can only access your own resources', 403));
    }

    next();
  };
};

// 刷新token中间件
export const refreshTokenAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 401);
    }

    const decoded = verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    next(error);
  }
};

// API密钥认证中间件（用于webhook等）
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    return next(new AppError('API key authentication not configured', 500));
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    return next(new AppError('Invalid API key', 401));
  }

  next();
};

// 速率限制中间件（简单实现）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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
      return next(new AppError('Too many requests', 429));
    }
    
    record.count++;
    next();
  };
};

// 为了向后兼容，导出authenticate的别名
export const authenticateToken = authenticate;

// 为了向后兼容，导出refreshTokenAuth的别名
export const verifyRefreshToken = refreshTokenAuth;

// 清理过期的速率限制记录
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // 每5分钟清理一次

// 导出认证相关的工具函数
export const authUtils = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  
  // 生成完整的认证响应
  generateAuthResponse: (user: IUser) => {
    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    
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
  
  // 从请求中提取用户ID
  getUserId: (req: Request): string | null => {
    return req.userId || null;
  },
  
  // 检查用户是否有特定权限
  hasPermission: (user: IUser, permission: string): boolean => {
    if (user.role === 'admin') return true;
    
    // 这里可以扩展更复杂的权限系统
    const userPermissions: Record<string, string[]> = {
      user: ['read:own', 'write:own', 'delete:own'],
      admin: ['read:all', 'write:all', 'delete:all', 'manage:users', 'manage:system']
    };
    
    return userPermissions[user.role]?.includes(permission) || false;
  }
};