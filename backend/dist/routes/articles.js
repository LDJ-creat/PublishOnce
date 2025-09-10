"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const articleController_1 = require("../controllers/articleController");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
const createArticleValidation = [
    (0, express_validator_1.body)('title')
        .notEmpty()
        .withMessage('文章标题不能为空')
        .isLength({ min: 1, max: 200 })
        .withMessage('文章标题长度必须在1-200个字符之间'),
    (0, express_validator_1.body)('content')
        .notEmpty()
        .withMessage('文章内容不能为空')
        .isLength({ min: 10 })
        .withMessage('文章内容至少需要10个字符'),
    (0, express_validator_1.body)('summary')
        .optional()
        .isLength({ max: 500 })
        .withMessage('文章摘要不能超过500个字符'),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('标签必须是数组格式'),
    (0, express_validator_1.body)('tags.*')
        .optional()
        .isString()
        .withMessage('标签必须是字符串')
        .isLength({ min: 1, max: 50 })
        .withMessage('标签长度必须在1-50个字符之间'),
    (0, express_validator_1.body)('category')
        .optional()
        .isString()
        .withMessage('分类必须是字符串')
        .isLength({ min: 1, max: 50 })
        .withMessage('分类长度必须在1-50个字符之间'),
    (0, express_validator_1.body)('platforms')
        .optional()
        .isArray()
        .withMessage('发布平台必须是数组格式')
];
const updateArticleValidation = [
    (0, express_validator_1.body)('title')
        .optional()
        .isLength({ min: 1, max: 200 })
        .withMessage('文章标题长度必须在1-200个字符之间'),
    (0, express_validator_1.body)('content')
        .optional()
        .isLength({ min: 10 })
        .withMessage('文章内容至少需要10个字符'),
    (0, express_validator_1.body)('summary')
        .optional()
        .isLength({ max: 500 })
        .withMessage('文章摘要不能超过500个字符'),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('标签必须是数组格式'),
    (0, express_validator_1.body)('tags.*')
        .optional()
        .isString()
        .withMessage('标签必须是字符串')
        .isLength({ min: 1, max: 50 })
        .withMessage('标签长度必须在1-50个字符之间'),
    (0, express_validator_1.body)('category')
        .optional()
        .isString()
        .withMessage('分类必须是字符串')
        .isLength({ min: 1, max: 50 })
        .withMessage('分类长度必须在1-50个字符之间'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['draft', 'published', 'archived'])
        .withMessage('状态必须是 draft、published 或 archived')
];
const publishArticleValidation = [
    (0, express_validator_1.body)('platforms')
        .isArray({ min: 1 })
        .withMessage('至少需要选择一个发布平台'),
    (0, express_validator_1.body)('platforms.*')
        .isString()
        .withMessage('平台名称必须是字符串')
        .isIn(['csdn', 'juejin', 'huawei', 'hexo'])
        .withMessage('不支持的发布平台')
];
const getArticlesValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是大于0的整数'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须是1-100之间的整数'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['draft', 'published', 'archived'])
        .withMessage('状态必须是 draft、published 或 archived'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'publishedAt', 'title', 'views', 'likes'])
        .withMessage('排序字段无效'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('排序方向必须是 asc 或 desc')
];
const batchOperateValidation = [
    (0, express_validator_1.body)('articleIds')
        .isArray({ min: 1 })
        .withMessage('至少需要选择一篇文章'),
    (0, express_validator_1.body)('articleIds.*')
        .isMongoId()
        .withMessage('文章ID格式无效'),
    (0, express_validator_1.body)('operation')
        .isIn(['delete', 'updateStatus', 'updateCategory', 'addTags'])
        .withMessage('不支持的操作类型'),
    (0, express_validator_1.body)('data')
        .optional()
        .isObject()
        .withMessage('操作数据必须是对象格式')
];
router.post('/', createArticleValidation, articleController_1.createArticle);
router.get('/', getArticlesValidation, articleController_1.getArticles);
router.get('/stats', articleController_1.getArticleStats);
router.post('/batch', batchOperateValidation, articleController_1.batchOperateArticles);
router.get('/:id', (0, express_validator_1.param)('id').isMongoId().withMessage('文章ID格式无效'), articleController_1.getArticleById);
router.put('/:id', (0, express_validator_1.param)('id').isMongoId().withMessage('文章ID格式无效'), updateArticleValidation, articleController_1.updateArticle);
router.delete('/:id', (0, express_validator_1.param)('id').isMongoId().withMessage('文章ID格式无效'), articleController_1.deleteArticle);
router.post('/:id/publish', (0, express_validator_1.param)('id').isMongoId().withMessage('文章ID格式无效'), publishArticleValidation, articleController_1.publishArticle);
router.get('/:id/publish/status', (0, express_validator_1.param)('id').isMongoId().withMessage('文章ID格式无效'), articleController_1.getPublishStatus);
exports.default = router;
//# sourceMappingURL=articles.js.map