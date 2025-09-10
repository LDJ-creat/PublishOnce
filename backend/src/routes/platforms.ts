import express from 'express';
import { body, param } from 'express-validator';
import {
  getAllPlatforms,
  getPlatformById,
  createPlatform,
  updatePlatform,
  deletePlatform,
  testPlatformConnection,
  getPlatformStats
} from '../controllers/platformController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 验证规则
const createPlatformValidation = [
  body('name')
    .isString()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-z0-9_-]+$/)
    .withMessage('平台名称只能包含小写字母、数字、下划线和连字符'),
  body('displayName')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('显示名称长度必须在2-100字符之间'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('描述长度不能超过500字符'),
  body('icon')
    .optional()
    .isURL()
    .withMessage('图标必须是有效的URL'),
  body('apiEndpoint')
    .optional()
    .isURL()
    .withMessage('API端点必须是有效的URL'),
  body('authType')
    .isIn(['oauth', 'token', 'username_password', 'api_key'])
    .withMessage('认证类型必须是oauth、token、username_password或api_key之一'),
  body('supportedFeatures')
    .optional()
    .isArray()
    .withMessage('支持的功能必须是数组'),
  body('supportedFeatures.*')
    .optional()
    .isIn(['publish', 'draft', 'schedule', 'tags', 'categories', 'images'])
    .withMessage('不支持的功能类型'),
  body('config')
    .optional()
    .isObject()
    .withMessage('配置必须是对象')
];

const updatePlatformValidation = [
  param('id')
    .isMongoId()
    .withMessage('无效的平台ID'),
  body('name')
    .optional()
    .isString()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-z0-9_-]+$/)
    .withMessage('平台名称只能包含小写字母、数字、下划线和连字符'),
  body('displayName')
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('显示名称长度必须在2-100字符之间'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('描述长度不能超过500字符'),
  body('icon')
    .optional()
    .isURL()
    .withMessage('图标必须是有效的URL'),
  body('apiEndpoint')
    .optional()
    .isURL()
    .withMessage('API端点必须是有效的URL'),
  body('authType')
    .optional()
    .isIn(['oauth', 'token', 'username_password', 'api_key'])
    .withMessage('认证类型必须是oauth、token、username_password或api_key之一'),
  body('supportedFeatures')
    .optional()
    .isArray()
    .withMessage('支持的功能必须是数组'),
  body('supportedFeatures.*')
    .optional()
    .isIn(['publish', 'draft', 'schedule', 'tags', 'categories', 'images'])
    .withMessage('不支持的功能类型'),
  body('config')
    .optional()
    .isObject()
    .withMessage('配置必须是对象'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值')
];

const testConnectionValidation = [
  body('platformId')
    .isMongoId()
    .withMessage('无效的平台ID'),
  body('credentials')
    .isObject()
    .withMessage('认证信息必须是对象'),
  body('credentials.username')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('用户名长度必须在1-100字符之间'),
  body('credentials.password')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('密码长度必须在1-200字符之间'),
  body('credentials.token')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('令牌长度必须在1-500字符之间'),
  body('credentials.apiKey')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('API密钥长度必须在1-200字符之间'),
  body('credentials.secretKey')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('密钥长度必须在1-200字符之间'),
  body('credentials.deployUrl')
    .optional()
    .isURL()
    .withMessage('部署URL必须是有效的URL')
];

const platformIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('无效的平台ID')
];

// 公开路由 - 获取所有可用平台
router.get('/', getAllPlatforms);

// 公开路由 - 获取单个平台详情
router.get('/:id', platformIdValidation, getPlatformById);

// 需要认证的路由
router.use(authenticateToken);

// 测试平台连接
router.post('/test-connection', testConnectionValidation, testPlatformConnection);

// 获取平台统计信息（管理员功能）
router.get('/admin/stats', getPlatformStats);

// 管理员功能 - 创建平台
router.post('/admin', createPlatformValidation, createPlatform);

// 管理员功能 - 更新平台
router.put('/admin/:id', updatePlatformValidation, updatePlatform);

// 管理员功能 - 删除平台
router.delete('/admin/:id', platformIdValidation, deletePlatform);

export default router;