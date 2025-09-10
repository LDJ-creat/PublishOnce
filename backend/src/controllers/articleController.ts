import { Request, Response } from 'express';
import { Article } from '../models/Article';
import { User } from '../models/User';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * 创建文章
 */
export const createArticle = async (req: Request, res: Response) => {
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
    const { title, content, summary, tags, category, platforms } = req.body;

    // 创建新文章
    const article = new Article({
      title,
      content,
      summary,
      tags: tags || [],
      category,
      author: userId,
      platforms: platforms || [],
      status: 'draft' // 默认为草稿状态
    });

    await article.save();

    // 填充作者信息
    await article.populate('author', 'username email');

    res.status(201).json({
      success: true,
      message: '文章创建成功',
      data: { article }
    });
  } catch (error) {
    console.error('创建文章错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取文章列表
 */
export const getArticles = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      page = 1,
      limit = 10,
      status,
      category,
      tags,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query: any = { author: userId };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } }
      ];
    }

    // 分页参数
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 排序参数
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // 查询文章
    const articles = await Article.find(query)
      .populate('author', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // 获取总数
    const total = await Article.countDocuments(query);

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('获取文章列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取单篇文章
 */
export const getArticleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 验证文章ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的文章ID'
      });
    }

    // 查找文章
    const article = await Article.findOne({
      _id: id,
      author: userId
    }).populate('author', 'username email');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: '文章不存在或无权访问'
      });
    }

    res.json({
      success: true,
      data: { article }
    });
  } catch (error) {
    console.error('获取文章错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新文章
 */
export const updateArticle = async (req: Request, res: Response) => {
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

    const { id } = req.params;
    const userId = req.user?.id;
    const updateData = req.body;

    // 验证文章ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的文章ID'
      });
    }

    // 更新文章
    const article = await Article.findOneAndUpdate(
      { _id: id, author: userId },
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('author', 'username email');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: '文章不存在或无权访问'
      });
    }

    res.json({
      success: true,
      message: '文章更新成功',
      data: { article }
    });
  } catch (error) {
    console.error('更新文章错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 删除文章
 */
export const deleteArticle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 验证文章ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的文章ID'
      });
    }

    // 删除文章
    const article = await Article.findOneAndDelete({
      _id: id,
      author: userId
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: '文章不存在或无权访问'
      });
    }

    res.json({
      success: true,
      message: '文章删除成功'
    });
  } catch (error) {
    console.error('删除文章错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 发布文章到平台
 */
export const publishArticle = async (req: Request, res: Response) => {
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

    const { id } = req.params;
    const userId = req.user?.id;
    const { platforms } = req.body;

    // 验证文章ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的文章ID'
      });
    }

    // 查找文章
    const article = await Article.findOne({
      _id: id,
      author: userId
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: '文章不存在或无权访问'
      });
    }

    // 更新平台发布状态
    for (const platformName of platforms) {
      const platformIndex = article.platforms.findIndex(
        (p: any) => p.platform === platformName
      );

      if (platformIndex >= 0) {
        // 更新现有平台状态
        article.platforms[platformIndex].status = 'publishing';
        article.platforms[platformIndex].publishedAt = new Date();
      } else {
        // 添加新平台
        article.platforms.push({
          platform: platformName,
          status: 'publishing',
          publishedAt: new Date()
        });
      }
    }

    // 更新文章状态为已发布
    article.status = 'published';
    article.publishedAt = new Date();

    await article.save();

    // TODO: 这里应该调用实际的平台发布服务
    // 模拟发布过程
    setTimeout(async () => {
      try {
        const updatedArticle = await Article.findById(id);
        if (updatedArticle) {
          updatedArticle.platforms.forEach((platform: any) => {
            if (platforms.includes(platform.platform) && platform.status === 'publishing') {
              platform.status = 'published';
              platform.url = `https://${platform.platform}.com/article/${id}`; // 模拟URL
            }
          });
          await updatedArticle.save();
        }
      } catch (error) {
        console.error('更新发布状态错误:', error);
      }
    }, 2000);

    res.json({
      success: true,
      message: '文章发布中，请稍后查看发布状态',
      data: { article }
    });
  } catch (error) {
    console.error('发布文章错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取文章统计信息
 */
export const getArticleStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // 获取文章统计
    const stats = await Article.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalArticles: { $sum: 1 },
          publishedArticles: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          draftArticles: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          totalComments: { $sum: '$comments' }
        }
      }
    ]);

    // 获取分类统计
    const categoryStats = await Article.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 获取标签统计
    const tagStats = await Article.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 获取平台统计
    const platformStats = await Article.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$platforms' },
      {
        $group: {
          _id: '$platforms.platform',
          published: {
            $sum: { $cond: [{ $eq: ['$platforms.status', 'published'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$platforms.status', 'failed'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      }
    ]);

    const result = {
      overview: stats[0] || {
        totalArticles: 0,
        publishedArticles: 0,
        draftArticles: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0
      },
      categories: categoryStats,
      tags: tagStats,
      platforms: platformStats
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取文章统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 批量操作文章
 */
export const batchOperateArticles = async (req: Request, res: Response) => {
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
    const { articleIds, operation, data } = req.body;

    // 验证文章ID格式
    const validIds = articleIds.filter((id: string) => 
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有有效的文章ID'
      });
    }

    let result;
    switch (operation) {
      case 'delete':
        result = await Article.deleteMany({
          _id: { $in: validIds },
          author: userId
        });
        break;
      
      case 'updateStatus':
        result = await Article.updateMany(
          { _id: { $in: validIds }, author: userId },
          { status: data.status, updatedAt: new Date() }
        );
        break;
      
      case 'updateCategory':
        result = await Article.updateMany(
          { _id: { $in: validIds }, author: userId },
          { category: data.category, updatedAt: new Date() }
        );
        break;
      
      case 'addTags':
        result = await Article.updateMany(
          { _id: { $in: validIds }, author: userId },
          { $addToSet: { tags: { $each: data.tags } }, updatedAt: new Date() }
        );
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的操作类型'
        });
    }

    res.json({
      success: true,
      message: `批量操作完成，影响 ${result.modifiedCount || result.deletedCount} 篇文章`,
      data: {
        affected: result.modifiedCount || result.deletedCount
      }
    });
  } catch (error) {
    console.error('批量操作文章错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};