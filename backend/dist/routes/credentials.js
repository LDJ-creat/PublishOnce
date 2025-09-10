"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const credentialController_1 = require("../controllers/credentialController");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
const saveCredentialValidation = [
    (0, express_validator_1.body)('platform')
        .notEmpty()
        .withMessage('平台名称不能为空')
        .isIn(['csdn', 'juejin', 'huawei', 'wechat', 'zhihu', 'segmentfault'])
        .withMessage('不支持的平台'),
    (0, express_validator_1.body)('credentials')
        .isObject()
        .withMessage('凭据必须是对象格式'),
    (0, express_validator_1.body)('credentials.username')
        .optional()
        .isString()
        .withMessage('用户名必须是字符串')
        .isLength({ min: 1, max: 100 })
        .withMessage('用户名长度必须在1-100个字符之间'),
    (0, express_validator_1.body)('credentials.password')
        .optional()
        .isString()
        .withMessage('密码必须是字符串')
        .isLength({ min: 1, max: 200 })
        .withMessage('密码长度必须在1-200个字符之间'),
    (0, express_validator_1.body)('credentials.email')
        .optional()
        .isEmail()
        .withMessage('邮箱格式无效'),
    (0, express_validator_1.body)('credentials.phone')
        .optional()
        .isMobilePhone('zh-CN')
        .withMessage('手机号格式无效'),
    (0, express_validator_1.body)('credentials.token')
        .optional()
        .isString()
        .withMessage('令牌必须是字符串'),
    (0, express_validator_1.body)('credentials.apiKey')
        .optional()
        .isString()
        .withMessage('API密钥必须是字符串')
];
router.get('/', credentialController_1.getCredentials);
router.post('/', saveCredentialValidation, credentialController_1.saveCredential);
router.delete('/:id', (0, express_validator_1.param)('id').isMongoId().withMessage('凭据ID格式无效'), credentialController_1.deleteCredential);
router.post('/:id/test', (0, express_validator_1.param)('id').isMongoId().withMessage('凭据ID格式无效'), credentialController_1.testCredential);
router.patch('/:id/toggle', (0, express_validator_1.param)('id').isMongoId().withMessage('凭据ID格式无效'), credentialController_1.toggleCredential);
exports.default = router;
//# sourceMappingURL=credentials.js.map