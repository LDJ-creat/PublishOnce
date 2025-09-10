import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  publishArticle,
  getArticleStats,
  batchOperateArticles
} from '../controllers/articleController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 验证规则
const createArticleValidation = [
  body('title')
    .notEmpty()
    .withMessage('文章标题不能为空')
    .isLength({ min: 1, max: 200 })
    .withMessage('文章标题长度必须在1-200个字符之间'),
  body('content')
    .notEmpty()
    .withMessage('文章内容不能为空')
    .isLength({ min: 10 })
    .withMessage('文章内容至少需要10个字符'),
  body('summary')
    .optional()
    .isLength({ max: 500 })
    .withMessage('文章摘要不能超过500个字符'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组格式'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('标签必须是字符串')
    .isLength({ min: 1, max: 50 })
    .withMessage('标签长度必须在1-50个字符之间'),
  body('category')
    .optional()
    .isString()
    .withMessage('分类必须是字符串')
    .isLength({ min: 1, max: 50 })
    .withMessage('分类长度必须在1-50个字符之间'),
  body('platforms')
    .optional()
    .isArray()
    .withMessage('发布平台必须是数组格式')
];

const updateArticleValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('文章标题长度必须在1-200个字符之间'),
  body('content')
    .optional()
    .isLength({ min: 10 })
    .withMessage('文章内容至少需要10个字符'),
  body('summary')
    .optional()
    .isLength({ max: 500 })
    .withMessage('文章摘要不能超过500个字符'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组格式'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('标签必须是字符串')
    .isLength({ min: 1, max: 50 })
    .withMessage('标签长度必须在1-50个字符之间'),
  body('category')
    .optional()
    .isString()
    .withMessage('分类必须是字符串')
    .isLength({ min: 1, max: 50 })
    .withMessage('分类长度必须在1-50个字符之间'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('状态必须是 draft、published 或 archived')
];

const publishArticleValidation = [
  body('platforms')
    .isArray({ min: 1 })
    .withMessage('至少需要选择一个发布平台'),
  body('platforms.*')
    .isString()
    .withMessage('平台名称必须是字符串')
    .isIn(['csdn', 'juejin', 'huawei', 'hexo'])
    .withMessage('不支持的发布平台')
];

const getArticlesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须是1-100之间的整数'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('状态必须是 draft、published 或 archived'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'publishedAt', 'title', 'views', 'likes'])
    .withMessage('排序字段无效'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向必须是 asc 或 desc')
];

const batchOperateValidation = [
  body('articleIds')
    .isArray({ min: 1 })
    .withMessage('至少需要选择一篇文章'),
  body('articleIds.*')
    .isMongoId()
    .withMessage('文章ID格式无效'),
  body('operation')
    .isIn(['delete', 'updateStatus', 'updateCategory', 'addTags'])
    .withMessage('不支持的操作类型'),
  body('data')
    .optional()
    .isObject()
    .withMessage('操作数据必须是对象格式')
];

// 文章路由

// 创建文章
router.post('/', createArticleValidation, createArticle);

// 获取文章列表
router.get('/', getArticlesValidation, getArticles);

// 获取文章统计信息
router.get('/stats', getArticleStats);

// 批量操作文章
router.post('/batch', batchOperateValidation, batchOperateArticles);

// 获取单篇文章
router.get('/:id', 
  param('id').isMongoId().withMessage('文章ID格式无效'),
  getArticleById
);

// 更新文章
router.put('/:id', 
  param('id').isMongoId().withMessage('文章ID格式无效'),
  updateArticleValidation, 
  updateArticle
);

// 删除文章
router.delete('/:id', 
  param('id').isMongoId().withMessage('文章ID格式无效'),
  deleteArticle
);

// 发布文章到平台
router.post('/:id/publish', 
  param('id').isMongoId().withMessage('文章ID格式无效'),
  publishArticleValidation,
  publishArticle
);

export default router;