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
exports.batchOperateArticles = exports.getArticleStats = exports.getPublishStatus = exports.publishArticle = exports.deleteArticle = exports.updateArticle = exports.getArticleById = exports.getArticles = exports.createArticle = void 0;
const Article_1 = require("../models/Article");
const express_validator_1 = require("express-validator");
const mongoose_1 = __importDefault(require("mongoose"));
const createArticle = async (req, res) => {
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
        const { title, content, summary, tags, category, platforms } = req.body;
        const article = new Article_1.Article({
            title,
            content,
            summary,
            tags: tags || [],
            category,
            author: userId,
            platforms: platforms || [],
            status: 'draft'
        });
        await article.save();
        await article.populate('author', 'username email');
        res.status(201).json({
            success: true,
            message: '文章创建成功',
            data: { article }
        });
    }
    catch (error) {
        console.error('创建文章错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.createArticle = createArticle;
const getArticles = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { page = 1, limit = 10, status, category, tags, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = { author: userId };
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
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const articles = await Article_1.Article.find(query)
            .populate('author', 'username email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean();
        const total = await Article_1.Article.countDocuments(query);
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
    }
    catch (error) {
        console.error('获取文章列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getArticles = getArticles;
const getArticleById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的文章ID'
            });
        }
        const article = await Article_1.Article.findOne({
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
    }
    catch (error) {
        console.error('获取文章错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getArticleById = getArticleById;
const updateArticle = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的文章ID'
            });
        }
        const article = await Article_1.Article.findOneAndUpdate({ _id: id, author: userId }, { ...updateData, updatedAt: new Date() }, { new: true, runValidators: true }).populate('author', 'username email');
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
    }
    catch (error) {
        console.error('更新文章错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.updateArticle = updateArticle;
const deleteArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的文章ID'
            });
        }
        const article = await Article_1.Article.findOneAndDelete({
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
    }
    catch (error) {
        console.error('删除文章错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.deleteArticle = deleteArticle;
const publishArticle = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的文章ID'
            });
        }
        const article = await Article_1.Article.findOne({
            _id: id,
            author: userId
        });
        if (!article) {
            return res.status(404).json({
                success: false,
                message: '文章不存在或无权访问'
            });
        }
        for (const platformName of platforms) {
            const platformIndex = article.platforms.findIndex((p) => p.platform === platformName);
            if (platformIndex >= 0) {
                article.platforms[platformIndex].status = 'publishing';
                article.platforms[platformIndex].publishedAt = new Date();
            }
            else {
                article.platforms.push({
                    platform: platformName,
                    status: 'publishing',
                    publishedAt: new Date()
                });
            }
        }
        article.status = 'published';
        article.publishedAt = new Date();
        await article.save();
        const { addPublishJob } = await Promise.resolve().then(() => __importStar(require('../services/queue/publishProcessor')));
        const { PlatformCredential } = await Promise.resolve().then(() => __importStar(require('../models/PlatformCredential')));
        const credentials = await PlatformCredential.getUserCredentials(userId, platforms);
        const missingCredentials = platforms.filter(platform => !credentials[platform]);
        if (missingCredentials.length > 0) {
            return res.status(400).json({
                success: false,
                message: `缺少以下平台的登录凭据: ${missingCredentials.join(', ')}`,
                missingPlatforms: missingCredentials
            });
        }
        const publishJob = await addPublishJob({
            articleId: id,
            userId: userId,
            platforms,
            credentials
        });
        console.log(`发布任务已添加到队列: ${publishJob.id}`);
        res.json({
            success: true,
            message: '文章发布中，请稍后查看发布状态',
            data: {
                article,
                jobId: publishJob.id
            }
        });
    }
    catch (error) {
        console.error('发布文章错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.publishArticle = publishArticle;
const getPublishStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const { jobId } = req.query;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '无效的文章ID'
            });
        }
        const article = await Article_1.Article.findOne({
            _id: id,
            author: userId
        });
        if (!article) {
            return res.status(404).json({
                success: false,
                message: '文章不存在或无权访问'
            });
        }
        let jobStatus = null;
        if (jobId) {
            try {
                const { publishQueue } = await Promise.resolve().then(() => __importStar(require('../services/queue/index')));
                const job = await publishQueue.getJob(jobId);
                if (job) {
                    const state = await job.getState();
                    const progress = job.progress();
                    jobStatus = {
                        id: job.id,
                        state,
                        progress,
                        processedOn: job.processedOn,
                        finishedOn: job.finishedOn,
                        failedReason: job.failedReason,
                        returnvalue: job.returnvalue
                    };
                }
            }
            catch (error) {
                console.error('获取任务状态失败:', error);
            }
        }
        res.json({
            success: true,
            data: {
                article,
                jobStatus
            }
        });
    }
    catch (error) {
        console.error('获取发布状态错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getPublishStatus = getPublishStatus;
const getArticleStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        const stats = await Article_1.Article.aggregate([
            { $match: { author: new mongoose_1.default.Types.ObjectId(userId) } },
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
        const categoryStats = await Article_1.Article.aggregate([
            { $match: { author: new mongoose_1.default.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        const tagStats = await Article_1.Article.aggregate([
            { $match: { author: new mongoose_1.default.Types.ObjectId(userId) } },
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
        const platformStats = await Article_1.Article.aggregate([
            { $match: { author: new mongoose_1.default.Types.ObjectId(userId) } },
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
    }
    catch (error) {
        console.error('获取文章统计错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.getArticleStats = getArticleStats;
const batchOperateArticles = async (req, res) => {
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
        const { articleIds, operation, data } = req.body;
        const validIds = articleIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有有效的文章ID'
            });
        }
        let result;
        switch (operation) {
            case 'delete':
                result = await Article_1.Article.deleteMany({
                    _id: { $in: validIds },
                    author: userId
                });
                break;
            case 'updateStatus':
                result = await Article_1.Article.updateMany({ _id: { $in: validIds }, author: userId }, { status: data.status, updatedAt: new Date() });
                break;
            case 'updateCategory':
                result = await Article_1.Article.updateMany({ _id: { $in: validIds }, author: userId }, { category: data.category, updatedAt: new Date() });
                break;
            case 'addTags':
                result = await Article_1.Article.updateMany({ _id: { $in: validIds }, author: userId }, { $addToSet: { tags: { $each: data.tags } }, updatedAt: new Date() });
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
    }
    catch (error) {
        console.error('批量操作文章错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};
exports.batchOperateArticles = batchOperateArticles;
//# sourceMappingURL=articleController.js.map