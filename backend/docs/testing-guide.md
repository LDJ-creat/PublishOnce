# PublishOnce 测试指南

## 概述

本文档提供了 PublishOnce 项目的完整测试指南，包括测试策略、最佳实践、工具使用和测试执行流程。

## 目录

- [测试策略](#测试策略)
- [测试环境](#测试环境)
- [测试类型](#测试类型)
- [测试工具](#测试工具)
- [编写测试](#编写测试)
- [运行测试](#运行测试)
- [最佳实践](#最佳实践)
- [CI/CD 集成](#cicd-集成)
- [性能测试](#性能测试)
- [故障排除](#故障排除)

## 测试策略

### 测试金字塔

我们采用标准的测试金字塔策略：

```
    /\     E2E Tests (10%)
   /  \    
  /____\   Integration Tests (20%)
 /______\  
/________\ Unit Tests (70%)
```

- **单元测试 (70%)**：测试单个函数、方法或类
- **集成测试 (20%)**：测试模块间的交互
- **端到端测试 (10%)**：测试完整的用户流程

### 测试覆盖率目标

- **总体覆盖率**：≥ 85%
- **关键业务逻辑**：≥ 95%
- **API 端点**：≥ 90%
- **工具函数**：≥ 80%

## 测试环境

### 环境配置

```bash
# 安装测试依赖
npm install --save-dev jest supertest mongodb-memory-server

# 设置测试环境变量
cp .env.test.example .env.test
```

### 环境变量

```env
# .env.test
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/publishonce_test
JWT_SECRET=test_jwt_secret_key
REDIS_URL=redis://localhost:6379/1
LOG_LEVEL=error
```

## 测试类型

### 1. 单元测试

**位置**：`tests/unit/`

**特点**：
- 测试单个函数或方法
- 快速执行
- 不依赖外部服务
- 使用 mock 和 stub

**示例**：
```javascript
// tests/unit/utils/validation.test.js
const { validateEmail } = require('../../../src/utils/validation');

describe('Email Validation', () => {
  test('should validate correct email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });
  
  test('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

### 2. 集成测试

**位置**：`tests/integration/`

**特点**：
- 测试模块间交互
- 使用真实数据库
- 测试 API 端点
- 验证数据流

**示例**：
```javascript
// tests/integration/api/auth.test.js
const request = require('supertest');
const app = require('../../../src/app');

describe('Auth API', () => {
  test('POST /api/auth/login should authenticate user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

### 3. 端到端测试

**位置**：`tests/e2e/`

**特点**：
- 测试完整用户流程
- 使用真实浏览器
- 测试 UI 交互
- 验证业务场景

### 4. 性能测试

**位置**：`tests/performance/`

**类型**：
- **负载测试**：正常负载下的性能
- **压力测试**：极限条件下的表现
- **容量测试**：系统最大处理能力
- **稳定性测试**：长时间运行的稳定性

## 测试工具

### 主要工具

| 工具 | 用途 | 配置文件 |
|------|------|----------|
| Jest | 测试框架 | `jest.config.js` |
| Supertest | HTTP 测试 | - |
| MongoDB Memory Server | 内存数据库 | `tests/helpers/database.js` |
| Faker.js | 测试数据生成 | `tests/factories/` |
| Sinon | Mock 和 Stub | - |

### Jest 配置

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000
};
```

## 编写测试

### 测试结构

使用 AAA 模式（Arrange, Act, Assert）：

```javascript
describe('User Service', () => {
  test('should create new user', async () => {
    // Arrange - 准备测试数据
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    
    // Act - 执行被测试的操作
    const user = await userService.createUser(userData);
    
    // Assert - 验证结果
    expect(user).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.password).not.toBe('password123'); // 应该被加密
  });
});
```

### 测试命名规范

```javascript
// ✅ 好的测试名称
test('should return 401 when user is not authenticated', () => {});
test('should create article with valid data', () => {});
test('should throw error when email is invalid', () => {});

// ❌ 不好的测试名称
test('user test', () => {});
test('test login', () => {});
test('should work', () => {});
```

### 测试数据管理

使用工厂模式创建测试数据：

```javascript
// tests/factories/user.factory.js
const faker = require('faker');
const User = require('../../src/models/User');

const createTestUser = async (overrides = {}) => {
  const userData = {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: 'password123',
    profile: {
      bio: faker.lorem.sentence(),
      avatar: faker.internet.avatar()
    },
    ...overrides
  };
  
  return await User.create(userData);
};

module.exports = { createTestUser };
```

### Mock 和 Stub

```javascript
// Mock 外部服务
const weiboService = require('../../../src/services/weiboService');
jest.mock('../../../src/services/weiboService');

describe('Article Publishing', () => {
  beforeEach(() => {
    weiboService.publishPost.mockClear();
  });
  
  test('should publish to Weibo', async () => {
    // 设置 mock 返回值
    weiboService.publishPost.mockResolvedValue({
      id: '12345',
      url: 'https://weibo.com/12345'
    });
    
    const result = await publishService.publishToWeibo(article);
    
    expect(weiboService.publishPost).toHaveBeenCalledWith(article);
    expect(result.success).toBe(true);
  });
});
```

## 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- auth.test.js

# 运行特定测试套件
npm test -- --testNamePattern="User Authentication"

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch

# 运行性能测试
npm run test:performance
```

### 自定义脚本

```bash
# 运行单元测试
node scripts/test.js --type=unit

# 运行集成测试
node scripts/test.js --type=integration

# 运行所有测试并生成报告
node scripts/test.js --coverage --report

# 并行运行测试
node scripts/test.js --parallel --workers=4
```

## 最佳实践

### 1. 测试独立性

```javascript
// ✅ 每个测试都是独立的
describe('User Service', () => {
  let testUser;
  
  beforeEach(async () => {
    testUser = await createTestUser();
  });
  
  afterEach(async () => {
    await User.deleteMany({});
  });
  
  test('should update user profile', async () => {
    // 测试逻辑
  });
});
```

### 2. 测试数据清理

```javascript
// 全局清理
afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Article.deleteMany({}),
    PublishTask.deleteMany({})
  ]);
});
```

### 3. 异步测试处理

```javascript
// ✅ 正确处理异步操作
test('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// ✅ 测试 Promise 拒绝
test('should reject with invalid data', async () => {
  await expect(asyncFunction(invalidData))
    .rejects
    .toThrow('Invalid data');
});
```

### 4. 错误测试

```javascript
test('should handle database connection error', async () => {
  // 模拟数据库错误
  jest.spyOn(mongoose, 'connect')
    .mockRejectedValueOnce(new Error('Connection failed'));
  
  await expect(connectDatabase())
    .rejects
    .toThrow('Connection failed');
});
```

### 5. 边界条件测试

```javascript
describe('Input Validation', () => {
  test.each([
    ['', false],
    ['a', false],
    ['ab', false],
    ['abc', true],
    ['a'.repeat(100), true],
    ['a'.repeat(101), false]
  ])('should validate username length: %s -> %s', (username, expected) => {
    expect(validateUsername(username)).toBe(expected);
  });
});
```

## CI/CD 集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run performance tests
      run: npm run test:performance
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### 测试阶段

1. **代码检查**：ESLint, Prettier
2. **单元测试**：快速反馈
3. **集成测试**：API 和数据库测试
4. **性能测试**：负载和压力测试
5. **安全测试**：依赖漏洞扫描
6. **覆盖率检查**：确保达到目标覆盖率

## 性能测试

### 负载测试

```javascript
// tests/performance/load.test.js
describe('Load Testing', () => {
  test('should handle 100 concurrent users', async () => {
    const concurrentUsers = 100;
    const requestsPerUser = 10;
    
    const promises = [];
    for (let i = 0; i < concurrentUsers; i++) {
      for (let j = 0; j < requestsPerUser; j++) {
        promises.push(
          request(app)
            .get('/api/articles')
            .set('Authorization', `Bearer ${token}`)
        );
      }
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const successRate = (successful / promises.length) * 100;
    
    expect(successRate).toBeGreaterThan(95);
  });
});
```

### 性能指标

- **响应时间**：P95 < 500ms, P99 < 1000ms
- **吞吐量**：> 1000 RPS
- **错误率**：< 0.1%
- **资源使用**：CPU < 80%, Memory < 85%

## 故障排除

### 常见问题

#### 1. 测试超时

```javascript
// 增加超时时间
test('slow operation', async () => {
  // 测试逻辑
}, 30000); // 30秒超时

// 或在 Jest 配置中设置
// jest.config.js
module.exports = {
  testTimeout: 30000
};
```

#### 2. 数据库连接问题

```javascript
// 确保数据库连接正确关闭
afterAll(async () => {
  await mongoose.connection.close();
});
```

#### 3. Mock 没有重置

```javascript
// 在每个测试后重置 mock
afterEach(() => {
  jest.clearAllMocks();
});
```

#### 4. 异步操作未等待

```javascript
// ❌ 错误：没有等待异步操作
test('async test', () => {
  asyncFunction().then(result => {
    expect(result).toBe('expected');
  });
});

// ✅ 正确：使用 async/await
test('async test', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

### 调试技巧

```javascript
// 1. 使用 console.log 调试
test('debug test', () => {
  console.log('Debug info:', debugData);
  // 测试逻辑
});

// 2. 使用 Jest 的调试模式
// package.json
{
  "scripts": {
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}

// 3. 只运行特定测试
test.only('focus on this test', () => {
  // 只运行这个测试
});

// 4. 跳过测试
test.skip('skip this test', () => {
  // 跳过这个测试
});
```

## 测试报告

### 覆盖率报告

```bash
# 生成 HTML 覆盖率报告
npm run test:coverage

# 查看报告
open coverage/lcov-report/index.html
```

### 性能报告

```bash
# 生成性能测试报告
npm run test:performance -- --report

# 查看报告
open reports/performance/index.html
```

## 总结

良好的测试实践包括：

1. **全面覆盖**：单元、集成、端到端测试
2. **快速反馈**：测试应该快速执行
3. **可靠性**：测试结果应该一致
4. **可维护性**：测试代码应该易于理解和修改
5. **自动化**：集成到 CI/CD 流程中

遵循这些指南，可以确保 PublishOnce 项目的代码质量和稳定性。