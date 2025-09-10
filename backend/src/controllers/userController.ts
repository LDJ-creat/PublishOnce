import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken, generateRefreshToken } from '../middleware/auth';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';

/**
 * 用户注册
 */
export const register = async (req: Request, res: Response) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求数据验证失败',
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password // 密码会在模型的pre save中间件中自动加密
    });

    await user.save();

    // 生成JWT token
    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // 返回用户信息（不包含密码）
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
  } catch (error) {
    console.error('用户注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 用户登录
 */
export const login = async (req: Request, res: Response) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求数据验证失败',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 检查用户是否激活
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用，请联系管理员'
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 生成JWT token
    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // 返回用户信息（不包含密码）
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
  } catch (error) {
    console.error('用户登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const user = await User.findById(userId);
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
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新用户信息
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求数据验证失败',
        errors: errors.array()
      });
    }

    const userId = req.user?.id;
    const { username, preferences } = req.body;

    // 检查用户名是否已被其他用户使用
    if (username) {
      const existingUser = await User.findOne({
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

    // 更新用户信息
    const updateData: any = {};
    if (username) updateData.username = username;
    if (preferences) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

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
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 修改密码
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求数据验证失败',
        errors: errors.array()
      });
    }

    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    // 获取用户信息（包含密码）
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 更新密码
    user.password = newPassword; // 密码会在模型的pre save中间件中自动加密
    await user.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新平台配置
 */
export const updatePlatformConfig = async (req: Request, res: Response) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求数据验证失败',
        errors: errors.array()
      });
    }

    const userId = req.user?.id;
    const { platform, config } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新平台配置
    const platformIndex = user.platformConfigs.findIndex(
      (pc: any) => pc.platform === platform
    );

    if (platformIndex >= 0) {
      // 更新现有配置
      user.platformConfigs[platformIndex] = {
        ...user.platformConfigs[platformIndex],
        ...config,
        platform,
        updatedAt: new Date()
      };
    } else {
      // 添加新配置
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
  } catch (error) {
    console.error('更新平台配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 删除平台配置
 */
export const deletePlatformConfig = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { platform } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 删除平台配置
    user.platformConfigs = user.platformConfigs.filter(
      (pc: any) => pc.platform !== platform
    );

    await user.save();

    res.json({
      success: true,
      message: '平台配置删除成功',
      data: {
        platformConfigs: user.platformConfigs
      }
    });
  } catch (error) {
    console.error('删除平台配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 刷新Token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 生成新的访问令牌
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (error) {
    console.error('刷新令牌错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 用户登出
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // 在实际应用中，可以在这里实现token黑名单机制
    // 或者记录登出时间等
    
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 验证Token
 */
export const verifyToken = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('验证令牌错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取平台配置列表
 */
export const getPlatforms = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    const userDoc = await User.findById(user.id);
    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        platforms: userDoc.platformConfigs?.map((config: any) => ({
          platform: config.platform,
          isEnabled: config.isEnabled,
          isActive: config.isActive,
          lastLoginAt: config.lastLoginAt,
          hasCredentials: !!(config.credentials?.username || config.credentials?.token)
        })) || []
      }
    });
  } catch (error) {
    console.error('获取平台配置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};