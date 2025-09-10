import mongoose from 'mongoose';

/**
 * 连接MongoDB数据库
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/publishonce';
    
    await mongoose.connect(mongoUri, {
      // 连接选项
      maxPoolSize: 10, // 最大连接池大小
      serverSelectionTimeoutMS: 5000, // 服务器选择超时
      socketTimeoutMS: 45000, // Socket超时
    });
    
    console.log(`📦 MongoDB connected: ${mongoUri}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

/**
 * 断开数据库连接
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('📦 MongoDB disconnected');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
    throw error;
  }
};

// 监听连接事件
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// 应用终止时关闭数据库连接
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 Mongoose connection closed through app termination');
  process.exit(0);
});