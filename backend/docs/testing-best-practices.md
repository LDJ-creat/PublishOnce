# 测试最佳实践

## 概述

本文档详细介绍了 PublishOnce 项目中测试开发的最佳实践，包括代码规范、设计模式、性能优化和团队协作指南。

## 测试设计原则

### 1. FIRST 原则

- **Fast (快速)**：测试应该快速执行
- **Independent (独立)**：测试之间不应相互依赖
- **Repeatable (可重复)**：测试结果应该一致
- **Self-Validating (自验证)**：测试应该有明确的通过/失败结果
- **Timely (及时)**：测试应该及时编写

### 2. 测试驱动开发 (TDD)

```javascript
// 1. 红色阶段：编写失败的测试
test('should calculate user age correctly', () => {
  const user = { birthDate: '1990-01-01' };
  expect(calculateAge(user)).toBe(34); // 假设当前年份是2024
});

// 2. 绿色阶段：编写最少代码使测试通过
function calculateAge(user) {
  const today = new Date();
  const birthDate = new Date(user.birthDate);
  return today.getFullYear() - birthDate.getFullYear();
}

// 3. 重构阶段：优化代码
function calculateAge(user) {
  const today = new Date();
  const birthDate = new Date(user.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}
```

## 测试结构和组织

### 1. 测试文件组织

```
tests/
├── unit/                 # 单元测试
│   ├── controllers/      # 控制器测试
│   ├── services/         # 服务层测试
│   ├── models/           # 模型测试
│   ├── utils/            # 工具函数测试
│   └── middleware/       # 中间件测试
├── integration/          # 集成测试
│   ├── api/              # API 集成测试
│   ├── database/         # 数据库集成测试
│   └── external/         # 外部服务集成测试
├── performance/          # 性能测试
│   ├── load.test.js      # 负载测试
│   ├── stress.test.js    # 压力测试
│   └── capacity.test.js  # 容量测试
├── e2e/                  # 端到端测试
├── helpers/              # 测试辅助工具
├── factories/            # 测试数据工厂
└── fixtures/             # 测试固定数据
```

### 2. 测试套件结构

```javascript
describe('UserService', () => {
  // 测试设置
  let userService;
  let mockDatabase;
  
  beforeAll(async () => {
    // 一次性设置
    mockDatabase = await setupTestDatabase();
  });
  
  afterAll(async () => {
    // 一次性清理
    await cleanupTestDatabase(mockDatabase);
  });
  
  beforeEach(() => {
    // 每个测试前的设置
    userService = new UserService(mockDatabase);
  });
  
  afterEach(async () => {
    // 每个测试后的清理
    await clearTestData();
  });
  
  describe('createUser', () => {
    test('should create user with valid data', async () => {
      // 测试实现
    });
    
    test('should throw error with invalid email', async () => {
      // 测试实现
    });
    
    test('should hash password before saving', async () => {
      // 测试实现
    });
  });
  
  describe('getUserById', () => {
    test('should return user when found', async () => {
      // 测试实现
    });
    
    test('should return null when not found', async () => {
      // 测试实现
    });
  });
});
```

## 测试数据管理

### 1. 工厂模式

```javascript
// tests/factories/user.factory.js
const faker = require('faker');
const bcrypt = require('bcrypt');

class UserFactory {
  static async create(overrides = {}) {
    const defaultData = {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: await bcrypt.hash('password123', 10),
      profile: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        bio: faker.lorem.sentence(),
        avatar: faker.internet.avatar(),
        location: faker.address.city(),
        website: faker.internet.url()
      },
      preferences: {
        notifications: {
          email: true,
          push: false,
          sms: false
        },
        privacy: {
          profileVisible: true,
          showEmail: false
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return { ...defaultData, ...overrides };
  }
  
  static async createMany(count, overrides = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(overrides));
    }
    return users;
  }
  
  static createAdmin(overrides = {}) {
    return this.create({
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'admin'],
      ...overrides
    });
  }
  
  static createWithArticles(articleCount = 3, overrides = {}) {
    return this.create({
      articles: Array.from({ length: articleCount }, (_, i) => ({
        title: `Article ${i + 1}`,
        content: faker.lorem.paragraphs(3),
        status: 'published'
      })),
      ...overrides
    });
  }
}

module.exports = UserFactory;
```

### 2. 建造者模式

```javascript
// tests/builders/article.builder.js
class ArticleBuilder {
  constructor() {
    this.article = {
      title: 'Default Title',
      content: 'Default content',
      status: 'draft',
      platforms: [],
      tags: [],
      metadata: {}
    };
  }
  
  withTitle(title) {
    this.article.title = title;
    return this;
  }
  
  withContent(content) {
    this.article.content = content;
    return this;
  }
  
  withStatus(status) {
    this.article.status = status;
    return this;
  }
  
  forPlatforms(...platforms) {
    this.article.platforms = platforms;
    return this;
  }
  
  withTags(...tags) {
    this.article.tags = tags;
    return this;
  }
  
  published() {
    this.article.status = 'published';
    this.article.publishedAt = new Date();
    return this;
  }
  
  scheduled(publishAt) {
    this.article.status = 'scheduled';
    this.article.scheduledAt = publishAt;
    return this;
  }
  
  build() {
    return { ...this.article };
  }
}

// 使用示例
const article = new ArticleBuilder()
  .withTitle('Test Article')
  .withContent('This is test content')
  .forPlatforms('weibo', 'wechat')
  .withTags('test', 'article')
  .published()
  .build();
```

### 3. 固定数据 (Fixtures)

```javascript
// tests/fixtures/sample-data.js
module.exports = {
  users: {
    admin: {
      username: 'admin',
      email: 'admin@publishonce.com',
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'admin']
    },
    regularUser: {
      username: 'user1',
      email: 'user1@example.com',
      role: 'user',
      permissions: ['read', 'write']
    }
  },
  
  articles: {
    published: {
      title: 'Published Article',
      content: 'This is a published article',
      status: 'published',
      platforms: ['weibo', 'wechat'],
      publishedAt: new Date('2024-01-01')
    },
    draft: {
      title: 'Draft Article',
      content: 'This is a draft article',
      status: 'draft',
      platforms: []
    }
  },
  
  platforms: {
    weibo: {
      name: 'weibo',
      displayName: '微博',
      config: {
        maxLength: 140,
        supportImages: true,
        supportVideos: true
      }
    },
    wechat: {
      name: 'wechat',
      displayName: '微信公众号',
      config: {
        maxLength: 10000,
        supportImages: true,
        supportVideos: false
      }
    }
  }
};
```

## Mock 和 Stub 最佳实践

### 1. 外部服务 Mock

```javascript
// tests/mocks/weibo-service.mock.js
class WeiboServiceMock {
  constructor() {
    this.publishPost = jest.fn();
    this.deletePost = jest.fn();
    this.getPost = jest.fn();
    this.getUserInfo = jest.fn();
  }
  
  // 设置成功响应
  mockPublishSuccess(postId = '12345') {
    this.publishPost.mockResolvedValue({
      success: true,
      data: {
        id: postId,
        url: `https://weibo.com/${postId}`,
        createdAt: new Date().toISOString()
      }
    });
    return this;
  }
  
  // 设置失败响应
  mockPublishFailure(error = 'API Error') {
    this.publishPost.mockRejectedValue(new Error(error));
    return this;
  }
  
  // 设置限流响应
  mockRateLimit() {
    this.publishPost.mockRejectedValue({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      retryAfter: 3600
    });
    return this;
  }
  
  // 重置所有 mock
  reset() {
    this.publishPost.mockReset();
    this.deletePost.mockReset();
    this.getPost.mockReset();
    this.getUserInfo.mockReset();
    return this;
  }
}

module.exports = WeiboServiceMock;
```

### 2. 数据库 Mock

```javascript
// tests/mocks/database.mock.js
class DatabaseMock {
  constructor() {
    this.data = new Map();
    this.collections = new Map();
  }
  
  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new CollectionMock(name, this.data));
    }
    return this.collections.get(name);
  }
  
  clear() {
    this.data.clear();
    this.collections.clear();
  }
}

class CollectionMock {
  constructor(name, data) {
    this.name = name;
    this.data = data;
  }
  
  async findOne(query) {
    const items = this.data.get(this.name) || [];
    return items.find(item => this.matchesQuery(item, query)) || null;
  }
  
  async find(query = {}) {
    const items = this.data.get(this.name) || [];
    return items.filter(item => this.matchesQuery(item, query));
  }
  
  async insertOne(doc) {
    const items = this.data.get(this.name) || [];
    const newDoc = { ...doc, _id: this.generateId() };
    items.push(newDoc);
    this.data.set(this.name, items);
    return { insertedId: newDoc._id };
  }
  
  async updateOne(query, update) {
    const items = this.data.get(this.name) || [];
    const index = items.findIndex(item => this.matchesQuery(item, query));
    if (index !== -1) {
      items[index] = { ...items[index], ...update.$set };
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  }
  
  async deleteOne(query) {
    const items = this.data.get(this.name) || [];
    const index = items.findIndex(item => this.matchesQuery(item, query));
    if (index !== -1) {
      items.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }
  
  matchesQuery(item, query) {
    return Object.keys(query).every(key => item[key] === query[key]);
  }
  
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = DatabaseMock;
```

### 3. 时间 Mock

```javascript
// tests/helpers/time.helper.js
class TimeHelper {
  static mockCurrentTime(date) {
    const mockDate = new Date(date);
    jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
  }
  
  static restoreTime() {
    jest.restoreAllMocks();
  }
  
  static advanceTime(milliseconds) {
    jest.advanceTimersByTime(milliseconds);
  }
}

// 使用示例
describe('Scheduled Publishing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    TimeHelper.mockCurrentTime('2024-01-01T00:00:00Z');
  });
  
  afterEach(() => {
    jest.useRealTimers();
    TimeHelper.restoreTime();
  });
  
  test('should publish article at scheduled time', async () => {
    const scheduledTime = new Date('2024-01-01T12:00:00Z');
    await scheduleArticle(article, scheduledTime);
    
    // 快进到预定时间
    TimeHelper.advanceTime(12 * 60 * 60 * 1000); // 12小时
    
    expect(publishService.publish).toHaveBeenCalled();
  });
});
```

## 异步测试最佳实践

### 1. Promise 测试

```javascript
// ✅ 正确的异步测试
test('should resolve with user data', async () => {
  const userData = await userService.getUser('123');
  expect(userData.id).toBe('123');
});

// ✅ 测试 Promise 拒绝
test('should reject with error for invalid user', async () => {
  await expect(userService.getUser('invalid'))
    .rejects
    .toThrow('User not found');
});

// ✅ 测试 Promise 解析值
test('should resolve with specific value', async () => {
  await expect(userService.createUser(validData))
    .resolves
    .toMatchObject({ id: expect.any(String) });
});
```

### 2. 回调函数测试

```javascript
// ✅ 使用 done 回调
test('should call callback with result', (done) => {
  userService.getUserAsync('123', (err, user) => {
    expect(err).toBeNull();
    expect(user.id).toBe('123');
    done();
  });
});

// ✅ 转换为 Promise
test('should get user via callback', async () => {
  const user = await new Promise((resolve, reject) => {
    userService.getUserAsync('123', (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
  
  expect(user.id).toBe('123');
});
```

### 3. 定时器测试

```javascript
describe('Timer Functions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  test('should execute callback after delay', () => {
    const callback = jest.fn();
    delayedFunction(callback, 1000);
    
    expect(callback).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(1000);
    
    expect(callback).toHaveBeenCalledTimes(1);
  });
  
  test('should handle interval', () => {
    const callback = jest.fn();
    const intervalId = setInterval(callback, 100);
    
    jest.advanceTimersByTime(500);
    
    expect(callback).toHaveBeenCalledTimes(5);
    
    clearInterval(intervalId);
  });
});
```

## 错误处理测试

### 1. 异常测试

```javascript
describe('Error Handling', () => {
  test('should throw validation error for invalid email', () => {
    expect(() => {
      validateEmail('invalid-email');
    }).toThrow('Invalid email format');
  });
  
  test('should throw specific error type', () => {
    expect(() => {
      processPayment(-100);
    }).toThrow(ValidationError);
  });
  
  test('should throw error with specific message', () => {
    expect(() => {
      createUser({ email: '' });
    }).toThrow(/email.*required/i);
  });
});
```

### 2. 异步错误测试

```javascript
test('should handle database connection error', async () => {
  // Mock 数据库连接失败
  jest.spyOn(database, 'connect')
    .mockRejectedValue(new Error('Connection failed'));
  
  await expect(userService.initialize())
    .rejects
    .toThrow('Connection failed');
});

test('should handle API timeout', async () => {
  // Mock API 超时
  jest.spyOn(httpClient, 'post')
    .mockRejectedValue(new Error('Request timeout'));
  
  const result = await publishService.publishToWeibo(article);
  
  expect(result.success).toBe(false);
  expect(result.error).toContain('timeout');
});
```

### 3. 错误恢复测试

```javascript
test('should retry on temporary failure', async () => {
  const mockPublish = jest.fn()
    .mockRejectedValueOnce(new Error('Temporary failure'))
    .mockRejectedValueOnce(new Error('Temporary failure'))
    .mockResolvedValueOnce({ success: true, id: '123' });
  
  publishService.publish = mockPublish;
  
  const result = await publishService.publishWithRetry(article, { maxRetries: 3 });
  
  expect(mockPublish).toHaveBeenCalledTimes(3);
  expect(result.success).toBe(true);
});
```

## 性能测试最佳实践

### 1. 基准测试

```javascript
// tests/performance/benchmark.test.js
const { performance } = require('perf_hooks');

describe('Performance Benchmarks', () => {
  test('should process 1000 articles within time limit', async () => {
    const articles = await ArticleFactory.createMany(1000);
    
    const startTime = performance.now();
    
    const results = await Promise.all(
      articles.map(article => processArticle(article))
    );
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Processed ${articles.length} articles in ${duration.toFixed(2)}ms`);
    console.log(`Average: ${(duration / articles.length).toFixed(2)}ms per article`);
    
    expect(duration).toBeLessThan(5000); // 5秒内完成
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

### 2. 内存使用测试

```javascript
test('should not cause memory leak', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // 执行大量操作
  for (let i = 0; i < 1000; i++) {
    await createAndProcessArticle();
  }
  
  // 强制垃圾回收
  if (global.gc) {
    global.gc();
  }
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  
  // 内存增长应该在合理范围内
  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
});
```

### 3. 并发测试

```javascript
test('should handle concurrent requests', async () => {
  const concurrentRequests = 100;
  const startTime = Date.now();
  
  const promises = Array.from({ length: concurrentRequests }, (_, i) => 
    request(app)
      .post('/api/articles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `Concurrent Article ${i}`,
        content: `Content for article ${i}`
      })
  );
  
  const results = await Promise.allSettled(promises);
  const endTime = Date.now();
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const duration = endTime - startTime;
  
  console.log(`Concurrent test results:`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Duration: ${duration}ms`);
  console.log(`  Throughput: ${Math.round(concurrentRequests / (duration / 1000))} req/s`);
  
  expect(successful / concurrentRequests).toBeGreaterThan(0.95); // 95% 成功率
});
```

## 测试维护和重构

### 1. 测试代码重构

```javascript
// ❌ 重复的测试代码
describe('User API', () => {
  test('should create user with valid data', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    
    const response = await request(app)
      .post('/api/users')
      .send(userData);
    
    expect(response.status).toBe(201);
    expect(response.body.username).toBe('testuser');
  });
  
  test('should update user profile', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    
    const createResponse = await request(app)
      .post('/api/users')
      .send(userData);
    
    const updateResponse = await request(app)
      .put(`/api/users/${createResponse.body.id}`)
      .send({ bio: 'Updated bio' });
    
    expect(updateResponse.status).toBe(200);
  });
});

// ✅ 重构后的测试代码
describe('User API', () => {
  let testUser;
  
  beforeEach(async () => {
    testUser = await createTestUser();
  });
  
  test('should create user with valid data', async () => {
    const userData = UserFactory.build();
    
    const response = await createUser(userData);
    
    expect(response.status).toBe(201);
    expect(response.body.username).toBe(userData.username);
  });
  
  test('should update user profile', async () => {
    const updateData = { bio: 'Updated bio' };
    
    const response = await updateUser(testUser.id, updateData);
    
    expect(response.status).toBe(200);
    expect(response.body.bio).toBe(updateData.bio);
  });
  
  // 辅助函数
  async function createUser(userData) {
    return request(app)
      .post('/api/users')
      .send(userData);
  }
  
  async function updateUser(userId, updateData) {
    return request(app)
      .put(`/api/users/${userId}`)
      .send(updateData);
  }
});
```

### 2. 测试数据清理

```javascript
// tests/helpers/cleanup.helper.js
class CleanupHelper {
  constructor() {
    this.cleanupTasks = [];
  }
  
  addCleanupTask(task) {
    this.cleanupTasks.push(task);
  }
  
  async cleanup() {
    for (const task of this.cleanupTasks.reverse()) {
      try {
        await task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    }
    this.cleanupTasks = [];
  }
  
  async cleanupDatabase() {
    const collections = ['users', 'articles', 'publishTasks', 'crawlTasks'];
    
    for (const collection of collections) {
      await mongoose.connection.db.collection(collection).deleteMany({});
    }
  }
  
  async cleanupFiles(directory) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const files = await fs.readdir(directory);
      for (const file of files) {
        await fs.unlink(path.join(directory, file));
      }
    } catch (error) {
      // 目录不存在或为空
    }
  }
}

module.exports = CleanupHelper;
```

### 3. 测试配置管理

```javascript
// tests/config/test.config.js
module.exports = {
  database: {
    url: process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/publishonce_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  redis: {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1'
  },
  
  performance: {
    timeouts: {
      unit: 5000,
      integration: 30000,
      performance: 300000
    },
    
    thresholds: {
      responseTime: {
        p95: 500,
        p99: 1000
      },
      throughput: {
        minimum: 100 // requests per second
      },
      errorRate: {
        maximum: 0.01 // 1%
      }
    }
  },
  
  mock: {
    externalServices: {
      weibo: process.env.MOCK_WEIBO !== 'false',
      wechat: process.env.MOCK_WECHAT !== 'false',
      email: process.env.MOCK_EMAIL !== 'false'
    }
  }
};
```

## 团队协作最佳实践

### 1. 测试代码审查清单

- [ ] 测试名称清晰描述测试内容
- [ ] 测试覆盖了正常和异常情况
- [ ] 测试是独立的，不依赖其他测试
- [ ] 使用了适当的断言
- [ ] 测试数据被正确清理
- [ ] 没有硬编码的值
- [ ] 异步操作被正确处理
- [ ] Mock 和 Stub 使用恰当

### 2. 测试文档规范

```javascript
/**
 * 测试用户认证功能
 * 
 * 测试场景：
 * 1. 有效凭据登录成功
 * 2. 无效凭据登录失败
 * 3. 账户被锁定时拒绝登录
 * 4. 登录后返回有效 JWT token
 * 
 * 依赖：
 * - 测试数据库
 * - 用户工厂
 * 
 * 注意事项：
 * - 密码需要正确加密
 * - Token 过期时间需要验证
 */
describe('User Authentication', () => {
  // 测试实现
});
```

### 3. 持续集成最佳实践

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
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
      run: npm run test:unit -- --coverage
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run performance tests
      run: npm run test:performance
      if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        fail_ci_if_error: true
    
    - name: Comment PR with test results
      uses: actions/github-script@v6
      if: github.event_name == 'pull_request'
      with:
        script: |
          const fs = require('fs');
          const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json'));
          const comment = `## Test Results\n\n` +
            `**Coverage:** ${coverage.total.lines.pct}%\n` +
            `**Tests:** ${coverage.total.statements.covered}/${coverage.total.statements.total} statements covered`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

## 总结

遵循这些最佳实践可以帮助团队：

1. **提高代码质量**：通过全面的测试覆盖
2. **减少 Bug**：早期发现和修复问题
3. **提升开发效率**：快速反馈和自动化测试
4. **增强代码可维护性**：清晰的测试文档和结构
5. **促进团队协作**：统一的测试标准和流程

记住，好的测试不仅仅是验证代码是否工作，更是确保代码在各种情况下都能正确工作，并且为未来的修改提供安全保障。