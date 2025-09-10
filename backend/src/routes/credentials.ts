import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import {
  getCredentials,
  saveCredential,
  deleteCredential,
  testCredential,
  toggleCredential
} from '../controllers/credentialController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 验证规则
const saveCredentialValidation = [
  body('platform')
    .notEmpty()
    .withMessage('平台名称不能为空')
    .isIn(['csdn', 'juejin', 'huawei', 'wechat', 'zhihu', 'segmentfault'])
    .withMessage('不支持的平台'),
  body('credentials')
    .isObject()
    .withMessage('凭据必须是对象格式'),
  body('credentials.username')
    .optional()
    .isString()
    .withMessage('用户名必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('用户名长度必须在1-100个字符之间'),
  body('credentials.password')
    .optional()
    .isString()
    .withMessage('密码必须是字符串')
    .isLength({ min: 1, max: 200 })
    .withMessage('密码长度必须在1-200个字符之间'),
  body('credentials.email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式无效'),
  body('credentials.phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式无效'),
  body('credentials.token')
    .optional()
    .isString()
    .withMessage('令牌必须是字符串'),
  body('credentials.apiKey')
    .optional()
    .isString()
    .withMessage('API密钥必须是字符串')
];

// 获取平台凭据列表
router.get('/', getCredentials);

// 保存平台凭据
router.post('/',
  saveCredentialValidation,
  saveCredential
);

// 删除平台凭据
router.delete('/:id',
  param('id').isMongoId().withMessage('凭据ID格式无效'),
  deleteCredential
);

// 测试平台凭据
router.post('/:id/test',
  param('id').isMongoId().withMessage('凭据ID格式无效'),
  testCredential
);

// 切换凭据状态
router.patch('/:id/toggle',
  param('id').isMongoId().withMessage('凭据ID格式无效'),
  toggleCredential
);

export default router;