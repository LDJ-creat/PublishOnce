import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { PlatformCredential } from '../models/PlatformCredential';

/**
 * 获取用户的平台凭据列表
 */
export const getCredentials = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { platform } = req.query;

    const query: any = { userId };
    if (platform) {
      query.platform = platform;
    }

    const credentials = await PlatformCredential.find(query)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { credentials }
    });
  } catch (error) {
    console.error('获取平台凭据错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 创建或更新平台凭据
 */
export const saveCredential = async (req: Request, res: Response) => {
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
    const { platform, credentials } = req.body;

    // 查找现有凭据
    let platformCredential = await PlatformCredential.findOne({
      userId,
      platform
    });

    if (platformCredential) {
      // 更新现有凭据
      platformCredential.credentials = credentials;
      platformCredential.isActive = true;
      await platformCredential.save();
    } else {
      // 创建新凭据
      platformCredential = new PlatformCredential({
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
  } catch (error) {
    console.error('保存平台凭据错误:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if ((error as any).code === 11000) {
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

/**
 * 删除平台凭据
 */
export const deleteCredential = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 验证凭据ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的凭据ID'
      });
    }

    // 查找并删除凭据
    const credential = await PlatformCredential.findOneAndDelete({
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
  } catch (error) {
    console.error('删除平台凭据错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 测试平台凭据
 */
export const testCredential = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 验证凭据ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的凭据ID'
      });
    }

    // 查找凭据
    const credential = await PlatformCredential.findOne({
      _id: id,
      userId
    }).select('+credentials');

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: '凭据不存在或无权访问'
      });
    }

    // 验证凭据格式
    const isValid = credential.validateCredentials();
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: '凭据格式不完整'
      });
    }

    try {
      // 动态导入对应的发布器进行测试
      const { createPlatformPublisher } = await import('../services/publishers/index');
      const publisher = createPlatformPublisher(credential.platform);
      
      if (!publisher) {
        return res.status(400).json({
          success: false,
          message: '不支持的平台'
        });
      }

      // 测试登录
      const loginResult = await publisher.login(credential.credentials);
      
      if (loginResult) {
        // 更新最后使用时间
        await PlatformCredential.updateLastUsed(userId!, credential.platform);
        
        res.json({
          success: true,
          message: '凭据测试成功'
        });
      } else {
        res.status(400).json({
          success: false,
          message: '凭据验证失败，请检查用户名和密码'
        });
      }
    } catch (error) {
      console.error('测试凭据失败:', error);
      res.status(400).json({
        success: false,
        message: '凭据测试失败: ' + (error instanceof Error ? error.message : '未知错误')
      });
    }
  } catch (error) {
    console.error('测试平台凭据错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 切换凭据状态
 */
export const toggleCredential = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 验证凭据ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的凭据ID'
      });
    }

    // 查找并更新凭据状态
    const credential = await PlatformCredential.findOne({
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
  } catch (error) {
    console.error('切换凭据状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};