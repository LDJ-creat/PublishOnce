import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import taskScheduler from './services/scheduler';
import authRoutes from './routes/auth';
import articleRoutes from './routes/articles';
import platformRoutes from './routes/platforms';
import credentialRoutes from './routes/credentials';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(helmet()); // 安全头
app.use(cors()); // 跨域支持
app.use(morgan('combined')); // 日志记录
app.use(express.json({ limit: '10mb' })); // JSON解析
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL编码解析

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'PublishOnce Backend Service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/credentials', credentialRoutes);

app.use('/api/v1', (req, res) => {
  res.json({ message: 'API routes will be implemented here' });
});

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 尝试连接数据库
    try {
      await connectDatabase();
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.warn('⚠️ Database connection failed, running without database:', (dbError as Error).message);
      console.warn('💡 To enable database features, please install and start MongoDB');
    }
    
    // 初始化任务调度器
     await taskScheduler.initialize();
     console.log('✅ Task scheduler initialized');
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API endpoint: http://localhost:${PORT}/api/v1`);
      console.log('\n🎉 PublishOnce Backend is ready!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await taskScheduler.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await taskScheduler.shutdown();
  process.exit(0);
});

// 启动应用
startServer();

export default app;