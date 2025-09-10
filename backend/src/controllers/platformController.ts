import { Request, Response } from 'express';
import { Platform } from '../models/Platform';
import { User } from '../models/User';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * 获取所有可用平台
 */
export const getAllPlatforms = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const platforms = await Platform.find({ isActive: true })
      .select('name displayName description icon apiEndpoint supportedFeatures')
      .sort({ displayName: 1 });

    res.json({
      success: true,
      data: { platforms }
    });
  } catch (error) {
    console.error('获取平台列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取单个平台详情
 */
export const getPlatformById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    // 验证平台ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的平台ID'
      });
    }

    const platform = await Platform.findById(id);
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
  } catch (error) {
    console.error('获取平台详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 创建新平台配置（管理员功能）
 */
export const createPlatform = async (req: Request, res: Response): Promise<Response | void> => {
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

    // 检查用户权限（只有管理员可以创建平台）
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以创建平台配置'
      });
    }

    const {
      name,
      displayName,
      description,
      icon,
      apiEndpoint,
      authType,
      supportedFeatures,
      config
    } = req.body;

    // 检查平台名称是否已存在
    const existingPlatform = await Platform.findOne({ name });
    if (existingPlatform) {
      return res.status(409).json({
        success: false,
        message: '平台名称已存在'
      });
    }

    // 创建新平台
    const platform = new Platform({
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
  } catch (error) {
    console.error('创建平台错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新平台配置（管理员功能）
 */
export const updatePlatform = async (req: Request, res: Response): Promise<Response | void> => {
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

    // 检查用户权限
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以更新平台配置'
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // 验证平台ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的平台ID'
      });
    }

    // 如果要更新平台名称，检查是否已存在
    if (updateData.name) {
      const existingPlatform = await Platform.findOne({
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

    // 更新平台
    const platform = await Platform.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

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
  } catch (error) {
    console.error('更新平台错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 删除平台（管理员功能）
 */
export const deletePlatform = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // 检查用户权限
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以删除平台配置'
      });
    }

    const { id } = req.params;

    // 验证平台ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的平台ID'
      });
    }

    // 检查是否有用户正在使用该平台
    const usersUsingPlatform = await User.countDocuments({
      'platformConfigs.platform': id
    });

    if (usersUsingPlatform > 0) {
      return res.status(400).json({
        success: false,
        message: `无法删除平台，还有 ${usersUsingPlatform} 个用户正在使用该平台`
      });
    }

    // 删除平台
    const platform = await Platform.findByIdAndDelete(id);
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
  } catch (error) {
    console.error('删除平台错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 测试平台连接
 */
export const testPlatformConnection = async (req: Request, res: Response): Promise<Response | void> => {
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

    const { platformId, credentials } = req.body;
    const userId = req.user?.id;

    // 验证平台ID格式
    if (!mongoose.Types.ObjectId.isValid(platformId)) {
      return res.status(400).json({
        success: false,
        message: '无效的平台ID'
      });
    }

    // 获取平台配置
    const platform = await Platform.findById(platformId);
    if (!platform) {
      return res.status(404).json({
        success: false,
        message: '平台不存在'
      });
    }

    if (!(platform as any).isActive) {
      return res.status(400).json({
        success: false,
        message: '平台已禁用'
      });
    }

    // TODO: 这里应该实现实际的平台连接测试逻辑
    // 根据不同平台的API进行连接测试
    // 模拟测试过程
    const testResult = await simulatePlatformTest(platform.name, credentials);

    if (testResult.success) {
      // 更新用户的平台配置
      const user = await User.findById(userId);
      if (user) {
        const platformIndex = user.platformConfigs.findIndex(
          (pc: any) => pc.platform === platform.name
        );

        const configData = {
          platform: platform.name as any,
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
        } else {
          user.platformConfigs.push(configData);
        }

        await user.save();
      }
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.data
    });
  } catch (error) {
    console.error('测试平台连接错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取平台统计信息
 */
export const getPlatformStats = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // 获取平台使用统计
    const platformUsageStats = await User.aggregate([
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

    // 获取平台总数
    const totalPlatforms = await Platform.countDocuments();
    const activePlatforms = await Platform.countDocuments({ isActive: true });

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
  } catch (error) {
    console.error('获取平台统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 模拟平台连接测试
 */
async function simulatePlatformTest(platformName: string, credentials: any) {
  // 模拟异步测试过程
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 简单的验证逻辑（实际应用中应该调用真实的平台API）
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