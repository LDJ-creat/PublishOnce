"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const platformController_1 = require("../controllers/platformController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const createPlatformValidation = [
    (0, express_validator_1.body)('name')
        .isString()
        .isLength({ min: 2, max: 50 })
        .matches(/^[a-z0-9_-]+$/)
        .withMessage('平台名称只能包含小写字母、数字、下划线和连字符'),
    (0, express_validator_1.body)('displayName')
        .isString()
        .isLength({ min: 2, max: 100 })
        .withMessage('显示名称长度必须在2-100字符之间'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('描述长度不能超过500字符'),
    (0, express_validator_1.body)('icon')
        .optional()
        .isURL()
        .withMessage('图标必须是有效的URL'),
    (0, express_validator_1.body)('apiEndpoint')
        .optional()
        .isURL()
        .withMessage('API端点必须是有效的URL'),
    (0, express_validator_1.body)('authType')
        .isIn(['oauth', 'token', 'username_password', 'api_key'])
        .withMessage('认证类型必须是oauth、token、username_password或api_key之一'),
    (0, express_validator_1.body)('supportedFeatures')
        .optional()
        .isArray()
        .withMessage('支持的功能必须是数组'),
    (0, express_validator_1.body)('supportedFeatures.*')
        .optional()
        .isIn(['publish', 'draft', 'schedule', 'tags', 'categories', 'images'])
        .withMessage('不支持的功能类型'),
    (0, express_validator_1.body)('config')
        .optional()
        .isObject()
        .withMessage('配置必须是对象')
];
const updatePlatformValidation = [
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('无效的平台ID'),
    (0, express_validator_1.body)('name')
        .optional()
        .isString()
        .isLength({ min: 2, max: 50 })
        .matches(/^[a-z0-9_-]+$/)
        .withMessage('平台名称只能包含小写字母、数字、下划线和连字符'),
    (0, express_validator_1.body)('displayName')
        .optional()
        .isString()
        .isLength({ min: 2, max: 100 })
        .withMessage('显示名称长度必须在2-100字符之间'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('描述长度不能超过500字符'),
    (0, express_validator_1.body)('icon')
        .optional()
        .isURL()
        .withMessage('图标必须是有效的URL'),
    (0, express_validator_1.body)('apiEndpoint')
        .optional()
        .isURL()
        .withMessage('API端点必须是有效的URL'),
    (0, express_validator_1.body)('authType')
        .optional()
        .isIn(['oauth', 'token', 'username_password', 'api_key'])
        .withMessage('认证类型必须是oauth、token、username_password或api_key之一'),
    (0, express_validator_1.body)('supportedFeatures')
        .optional()
        .isArray()
        .withMessage('支持的功能必须是数组'),
    (0, express_validator_1.body)('supportedFeatures.*')
        .optional()
        .isIn(['publish', 'draft', 'schedule', 'tags', 'categories', 'images'])
        .withMessage('不支持的功能类型'),
    (0, express_validator_1.body)('config')
        .optional()
        .isObject()
        .withMessage('配置必须是对象'),
    (0, express_validator_1.body)('isActive')
        .optional()
        .isBoolean()
        .withMessage('激活状态必须是布尔值')
];
const testConnectionValidation = [
    (0, express_validator_1.body)('platformId')
        .isMongoId()
        .withMessage('无效的平台ID'),
    (0, express_validator_1.body)('credentials')
        .isObject()
        .withMessage('认证信息必须是对象'),
    (0, express_validator_1.body)('credentials.username')
        .optional()
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('用户名长度必须在1-100字符之间'),
    (0, express_validator_1.body)('credentials.password')
        .optional()
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('密码长度必须在1-200字符之间'),
    (0, express_validator_1.body)('credentials.token')
        .optional()
        .isString()
        .isLength({ min: 1, max: 500 })
        .withMessage('令牌长度必须在1-500字符之间'),
    (0, express_validator_1.body)('credentials.apiKey')
        .optional()
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('API密钥长度必须在1-200字符之间'),
    (0, express_validator_1.body)('credentials.secretKey')
        .optional()
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('密钥长度必须在1-200字符之间'),
    (0, express_validator_1.body)('credentials.deployUrl')
        .optional()
        .isURL()
        .withMessage('部署URL必须是有效的URL')
];
const platformIdValidation = [
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('无效的平台ID')
];
router.get('/', platformController_1.getAllPlatforms);
router.get('/:id', platformIdValidation, platformController_1.getPlatformById);
router.use(auth_1.authenticateToken);
router.post('/test-connection', testConnectionValidation, platformController_1.testPlatformConnection);
router.get('/admin/stats', platformController_1.getPlatformStats);
router.post('/admin', createPlatformValidation, platformController_1.createPlatform);
router.put('/admin/:id', updatePlatformValidation, platformController_1.updatePlatform);
router.delete('/admin/:id', platformIdValidation, platformController_1.deletePlatform);
exports.default = router;
//# sourceMappingURL=platforms.js.map