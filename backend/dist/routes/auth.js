"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
const registerValidation = [
    (0, express_validator_1.body)('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('用户名长度必须在3-30个字符之间')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名只能包含字母、数字和下划线'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('请提供有效的邮箱地址')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('密码长度至少6个字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字')
];
const loginValidation = [
    (0, express_validator_1.body)('identifier')
        .notEmpty()
        .withMessage('请提供用户名或邮箱'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('请提供密码')
];
const changePasswordValidation = [
    (0, express_validator_1.body)('currentPassword')
        .notEmpty()
        .withMessage('请提供当前密码'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 6 })
        .withMessage('新密码长度至少6个字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字')
];
router.post('/register', registerValidation, userController_1.register);
router.post('/login', loginValidation, userController_1.login);
router.post('/refresh', auth_1.verifyRefreshToken, userController_1.refreshToken);
router.get('/me', auth_1.authenticateToken, userController_1.getCurrentUser);
router.put('/profile', auth_1.authenticateToken, [
    (0, express_validator_1.body)('username')
        .optional()
        .isLength({ min: 3, max: 20 })
        .withMessage('用户名长度必须在3-20个字符之间')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名只能包含字母、数字和下划线'),
    (0, express_validator_1.body)('preferences')
        .optional()
        .isObject()
        .withMessage('偏好设置必须是对象')
], userController_1.updateProfile);
router.put('/password', auth_1.authenticateToken, changePasswordValidation, userController_1.changePassword);
router.post('/logout', auth_1.authenticateToken, userController_1.logout);
router.get('/verify', auth_1.authenticateToken, userController_1.verifyToken);
router.get('/platforms', auth_1.authenticateToken, userController_1.getPlatforms);
router.put('/platforms/:platform', auth_1.authenticateToken, [
    (0, express_validator_1.body)('isEnabled')
        .isBoolean()
        .withMessage('isEnabled必须是布尔值'),
    (0, express_validator_1.body)('credentials')
        .optional()
        .isObject()
        .withMessage('credentials必须是对象')
], userController_1.updatePlatformConfig);
router.delete('/platforms/:platform', auth_1.authenticateToken, userController_1.deletePlatformConfig);
exports.default = router;
//# sourceMappingURL=auth.js.map