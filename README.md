# PublishOnce - 聚合发布平台

## 项目简介

PublishOnce 是一个技术文章聚合发布平台，旨在解决技术博主需要在多个平台手动发布文章的痛点，同时提供统一的数据收集和管理功能。

### 核心功能

- 📝 **Markdown编辑器** - 支持文章编写，兼容Notion/VSCode粘贴导入
- 🚀 **一键发布** - 同时发布到CSDN、稀土掘金、华为开发者社区、Hexo个人博客
- 📊 **数据统计** - 收集各平台阅读量、点赞数、评论数据并可视化展示
- 💬 **评论管理** - 统一管理和回复各平台评论

## 技术架构
  
### 技术栈选择

#### 前端技术栈 
- **React 18** + **TypeScript** - 现代化前端框架
- **Ant Design** - 企业级UI组件库
- **React Router** - 路由管理
- **Zustand** - 轻量级状态管理
- **Axios** - HTTP客户端
- **ECharts** - 数据可视化
- **@uiw/react-md-editor** - Markdown编辑器

#### 后端技术栈
- **Node.js** + **Express** - 服务端框架
- **TypeScript** - 类型安全
- **MongoDB** - 主数据库
- **Redis** - 缓存和任务队列
- **Bull Queue** - 任务队列管理
- **JWT** - 身份认证
- **Playwright** - 浏览器自动化

#### 基础设施
- **Docker** - 容器化部署
- **Nginx** - 反向代理
- **PM2** - 进程管理n ,

### 系统架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 React    │────│  Nginx 反向代理  │────│   后端 Node.js  │
│   应用程序      │    │                 │    │   API 服务      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │   Bull Queue    │
                                               │   任务队列      │
                                               └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    MongoDB      │    │     Redis       │    │   Playwright    │
│   主数据库      │    │   缓存/队列     │    │  浏览器自动化   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │  各平台适配器   │
                                               │ CSDN/掘金/华为  │
                                               └─────────────────┘
```

## 项目结构

```
PublishOnce/
├── frontend/                   # 前端应用
│   ├── public/
│   ├── src/
│   │   ├── components/         # 通用组件
│   │   │   ├── Editor/         # Markdown编辑器
│   │   │   ├── Dashboard/      # 数据面板
│   │   │   └── Common/         # 公共组件
│   │   ├── pages/              # 页面组件
│   │   │   ├── Home/           # 首页
│   │   │   ├── Editor/         # 编辑器页面
│   │   │   ├── Dashboard/      # 数据统计页面
│   │   │   └── Settings/       # 设置页面
│   │   ├── hooks/              # 自定义Hooks
│   │   ├── services/           # API服务
│   │   ├── store/              # 状态管理
│   │   ├── types/              # TypeScript类型定义
│   │   └── utils/              # 工具函数
│   ├── package.json
│   └── tsconfig.json
├── backend/                    # 后端应用
│   ├── src/
│   │   ├── controllers/        # 控制器
│   │   │   ├── article.ts      # 文章管理
│   │   │   ├── publish.ts      # 发布管理
│   │   │   ├── stats.ts        # 统计数据
│   │   │   └── comment.ts      # 评论管理
│   │   ├── services/           # 业务逻辑
│   │   │   ├── publishers/     # 发布服务
│   │   │   │   ├── base.ts     # 基础发布器
│   │   │   │   ├── csdn.ts     # CSDN发布器
│   │   │   │   ├── juejin.ts   # 掘金发布器
│   │   │   │   ├── huawei.ts   # 华为发布器
│   │   │   │   └── hexo.ts     # Hexo发布器
│   │   │   ├── scrapers/       # 数据抓取
│   │   │   │   ├── base.ts     # 基础抓取器
│   │   │   │   ├── csdn.ts     # CSDN数据抓取
│   │   │   │   ├── juejin.ts   # 掘金数据抓取
│   │   │   │   └── huawei.ts   # 华为数据抓取
│   │   │   └── queue/          # 队列服务
│   │   │       ├── publish.ts  # 发布队列
│   │   │       └── scrape.ts   # 抓取队列
│   │   ├── models/             # 数据模型
│   │   │   ├── Article.ts      # 文章模型
│   │   │   ├── User.ts         # 用户模型
│   │   │   ├── Platform.ts     # 平台模型
│   │   │   └── Stats.ts        # 统计模型
│   │   ├── middleware/         # 中间件
│   │   │   ├── auth.ts         # 认证中间件
│   │   │   ├── cors.ts         # CORS中间件
│   │   │   └── error.ts        # 错误处理
│   │   ├── routes/             # 路由定义
│   │   │   ├── articles.ts     # 文章路由
│   │   │   ├── publish.ts      # 发布路由
│   │   │   ├── stats.ts        # 统计路由
│   │   │   └── auth.ts         # 认证路由
│   │   ├── config/             # 配置文件
│   │   │   ├── database.ts     # 数据库配置
│   │   │   ├── redis.ts        # Redis配置
│   │   │   └── platforms.ts    # 平台配置
│   │   ├── utils/              # 工具函数
│   │   │   ├── logger.ts       # 日志工具
│   │   │   ├── crypto.ts       # 加密工具
│   │   │   └── validator.ts    # 验证工具
│   │   └── app.ts              # 应用入口
│   ├── package.json
│   └── tsconfig.json
├── docker/                     # Docker配置
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── docs/                       # 文档
│   ├── api.md                  # API文档
│   ├── deployment.md           # 部署文档
│   └── development.md          # 开发文档
├── scripts/                    # 脚本文件
│   ├── build.sh               # 构建脚本
│   ├── deploy.sh              # 部署脚本
│   └── init-db.js             # 数据库初始化
├── .env.example               # 环境变量示例
├── .gitignore
├── package.json               # 根目录依赖
└── README.md
```

## 核心实现方案

### 1. 多平台发布实现

#### 发布器接口设计
```typescript
interface PlatformPublisher {
  login(credentials: LoginCredentials): Promise<boolean>;
  publish(article: Article): Promise<PublishResult>;
  updateArticle(articleId: string, article: Article): Promise<boolean>;
  deleteArticle(articleId: string): Promise<boolean>;
}
```

#### 发布流程
1. 用户在编辑器中完成文章编写
2. 选择目标发布平台
3. 系统将发布任务加入Bull Queue
4. 后台异步处理各平台发布
5. 实时反馈发布状态

### 2. 数据抓取实现

#### 抓取器接口设计
```typescript
interface PlatformScraper {
  scrapeArticleStats(articleUrl: string): Promise<ArticleStats>;
  scrapeComments(articleUrl: string): Promise<Comment[]>;
  scrapeUserProfile(userId: string): Promise<UserProfile>;
}
```

#### 抓取策略
- 使用Playwright进行浏览器自动化
- 实现代理池和请求头轮换
- 设置合理的抓取间隔避免被封
- 增量抓取减少资源消耗

### 3. 任务队列设计

#### 队列类型
- **发布队列**: 处理文章发布任务
- **抓取队列**: 处理数据抓取任务
- **通知队列**: 处理消息通知任务

#### 队列配置
```typescript
const queueConfig = {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: 'exponential',
  },
};
```

### 4. 数据库设计

#### 核心数据模型

**文章模型 (Article)**
```typescript
interface Article {
  id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  category: string;
  status: 'draft' | 'published' | 'archived';
  platforms: PlatformInfo[];
  createdAt: Date;
  updatedAt: Date;
}
```

**平台信息 (PlatformInfo)**
```typescript
interface PlatformInfo {
  platform: 'csdn' | 'juejin' | 'huawei' | 'hexo';
  articleId?: string;
  url?: string;
  publishedAt?: Date;
  status: 'pending' | 'published' | 'failed';
}
```

**统计数据 (ArticleStats)**
```typescript
interface ArticleStats {
  articleId: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  collectedAt: Date;
}
```

## 开发计划

### 第一阶段 (2-3周) - 基础架构
- [ ] 项目初始化和环境搭建
- [ ] 前端基础框架搭建
- [ ] 后端API框架搭建
- [ ] 数据库设计和模型创建
- [ ] 用户认证系统
- [ ] Markdown编辑器集成

### 第二阶段 (3-4周) - 核心功能
- [ ] 各平台发布适配器开发
- [ ] 发布队列系统实现
- [ ] 一键发布功能
- [ ] 基础数据抓取功能
- [ ] 文章管理界面

### 第三阶段 (2-3周) - 数据统计
- [ ] 数据抓取优化
- [ ] 统计数据可视化
- [ ] 评论管理系统
- [ ] 通知系统
- [ ] 系统监控和日志

### 第四阶段 (1-2周) - 优化部署
- [ ] 性能优化
- [ ] 错误处理完善
- [ ] 单元测试
- [ ] Docker化部署
- [ ] 文档完善

## 安装和运行

### 环境要求
- Node.js >= 16.0.0
- MongoDB >= 4.4
- Redis >= 6.0
- Docker (可选)

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/LDJ-creat/PublishOnce
cd PublishOnce
```

2. **安装依赖**
```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd ../backend && npm install
```

3. **环境配置**
```bash
# 复制环境变量文件
cp .env.example .env

# 编辑环境变量
vim .env
```

4. **启动服务**
```bash
# 启动数据库服务
docker-compose up -d mongodb redis

# 启动后端服务
cd backend && npm run dev

# 启动前端服务
cd frontend && npm start
```

### Docker部署

```bash
# 构建和启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## API文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出

### 文章接口
- `GET /api/articles` - 获取文章列表
- `POST /api/articles` - 创建文章
- `GET /api/articles/:id` - 获取文章详情
- `PUT /api/articles/:id` - 更新文章
- `DELETE /api/articles/:id` - 删除文章

### 发布接口
- `POST /api/publish` - 发布文章到多平台
- `GET /api/publish/status/:jobId` - 获取发布状态
- `POST /api/publish/retry/:jobId` - 重试发布任务

### 统计接口
- `GET /api/stats/articles/:id` - 获取文章统计数据
- `GET /api/stats/dashboard` - 获取仪表板数据
- `GET /api/stats/trends` - 获取趋势数据

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目链接: [https://github.com/your-username/PublishOnce](https://github.com/your-username/PublishOnce)
- 问题反馈: [Issues](https://github.com/your-username/PublishOnce/issues)

## 致谢

感谢所有为这个项目做出贡献的开发者们！

---

**PublishOnce** - 让技术分享更简单 🚀