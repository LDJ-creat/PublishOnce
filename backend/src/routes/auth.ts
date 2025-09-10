import { Router } from 'express';
import { body } from 'express-validator';
import { 
  authenticate, 
  verifyRefreshToken,
  rateLimit 
} from '../middleware/auth';
import {
  register,
  login,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout,
  verifyToken,
  getPlatforms,
  updatePlatformConfig,
  deletePlatformConfig
} from '../controllers/userController';

const router = Router();

// 验证规则
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .isEmail()
    .withMessage('请提供有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字')
];

const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('请提供用户名或邮箱'),
  body('password')
    .notEmpty()
    .withMessage('请提供密码')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('请提供当前密码'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字')
];



// 用户注册
router.post('/register', registerValidation, register);

// 用户登录
router.post('/login', loginValidation, login);

// 刷新Token
router.post('/refresh', verifyRefreshToken, refreshToken);

// 获取当前用户信息
router.get('/me', authenticate, getCurrentUser);

// 更新用户信息
router.put('/profile',
  authenticate,
  [
    body('username')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('用户名长度必须在3-20个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('用户名只能包含字母、数字和下划线'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('偏好设置必须是对象')
  ],
  updateProfile
);

// 修改密码
router.put('/password',
  authenticate,
  changePasswordValidation,
  changePassword
);

// 用户登出
router.post('/logout', authenticate, logout);

// 验证Token
router.get('/verify', authenticate, verifyToken);

// 获取平台配置
router.get('/platforms', authenticate, getPlatforms);

// 更新平台配置
router.put('/platforms/:platform',
  authenticate,
  [
    body('isEnabled')
      .isBoolean()
      .withMessage('isEnabled必须是布尔值'),
    body('credentials')
      .optional()
      .isObject()
      .withMessage('credentials必须是对象')
  ],
  updatePlatformConfig
);

// 删除平台配置
router.delete('/platforms/:platform', authenticate, deletePlatformConfig);

export default router;