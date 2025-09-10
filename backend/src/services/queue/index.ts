import Bull from 'bull';
import Redis from 'ioredis';

// Redis 配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};

// 创建 Redis 连接
export const redis = new Redis(redisConfig);

// 队列配置
const queueConfig = {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10, // 保留最近10个完成的任务
    removeOnFail: 5,      // 保留最近5个失败的任务
    attempts: 3,          // 最大重试次数
    backoff: {
      type: 'exponential',
      delay: 2000,        // 初始延迟2秒
    },
  },
};

// 发布队列
export const publishQueue = new Bull('publish', queueConfig);

// 抓取队列
export const scrapeQueue = new Bull('scrape', queueConfig);

// 通知队列
export const notificationQueue = new Bull('notification', queueConfig);

// 队列事件监听
function setupQueueEvents(queue: Bull.Queue, queueName: string) {
  queue.on('completed', (job, result) => {
    console.log(`${queueName} 任务完成:`, job.id, result);
  });

  queue.on('failed', (job, err) => {
    console.error(`${queueName} 任务失败:`, job.id, err.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`${queueName} 任务停滞:`, job.id);
  });

  queue.on('progress', (job, progress) => {
    console.log(`${queueName} 任务进度:`, job.id, `${progress}%`);
  });
}

// 设置队列事件监听
setupQueueEvents(publishQueue, 'PUBLISH');
setupQueueEvents(scrapeQueue, 'SCRAPE');
setupQueueEvents(notificationQueue, 'NOTIFICATION');

// 初始化队列处理器
async function initializeProcessors() {
  try {
    // 导入并注册发布处理器
    const publishProcessor = await import('./publishProcessor');
    publishQueue.process('publish-article', 1, publishProcessor.processPublishJob);
    
    // 导入并注册抓取处理器
    const scrapeProcessor = await import('./scrapeProcessor');
    scrapeQueue.process('scrape-article-stats', 2, scrapeProcessor.processScrapeJob);
    scrapeQueue.process('scrape-comments', 1, scrapeProcessor.processScrapeJob);
    scrapeQueue.process('scrape-batch-stats', 1, scrapeProcessor.processScrapeJob);
    
    // 导入并注册通知处理器
    const notificationProcessor = await import('./notificationProcessor');
    notificationQueue.process('notification', 3, notificationProcessor.processNotificationJob);
    
    console.log('队列处理器初始化完成');
  } catch (error) {
    console.error('队列处理器初始化失败:', error);
  }
}

// 启动处理器
initializeProcessors();

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('正在关闭队列...');
  await publishQueue.close();
  await scrapeQueue.close();
  await notificationQueue.close();
  await redis.disconnect();
  process.exit(0);
});

export default {
  publishQueue,
  scrapeQueue,
  notificationQueue,
  redis,
};