import { Job } from 'bull';
import { notificationQueue } from './index';

// 通知类型
export type NotificationType = 'publish_success' | 'publish_failed' | 'scrape_completed' | 'system_alert';

// 通知数据接口
export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  articleId?: string;
  platform?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// 通知结果接口
export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

/**
 * 发送邮件通知
 */
async function sendEmailNotification(data: NotificationData): Promise<NotificationResult> {
  try {
    // TODO: 集成邮件服务（如 nodemailer）
    console.log('发送邮件通知:', {
      to: data.userId,
      subject: data.title,
      content: data.message,
      type: data.type,
    });

    // 模拟邮件发送
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      notificationId: `email_${Date.now()}`,
    };
  } catch (error) {
    console.error('邮件通知发送失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '邮件发送失败',
    };
  }
}

/**
 * 发送系统内通知
 */
async function sendSystemNotification(data: NotificationData): Promise<NotificationResult> {
  try {
    // TODO: 保存到数据库通知表
    console.log('保存系统通知:', {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      timestamp: data.timestamp,
      metadata: data.metadata,
    });

    // 模拟数据库保存
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      notificationId: `system_${Date.now()}`,
    };
  } catch (error) {
    console.error('系统通知保存失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '系统通知保存失败',
    };
  }
}

/**
 * 发送WebSocket实时通知
 */
async function sendWebSocketNotification(data: NotificationData): Promise<NotificationResult> {
  try {
    // TODO: 集成WebSocket服务
    console.log('发送WebSocket通知:', {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      timestamp: data.timestamp,
    });

    // 模拟WebSocket发送
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      success: true,
      notificationId: `ws_${Date.now()}`,
    };
  } catch (error) {
    console.error('WebSocket通知发送失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'WebSocket通知发送失败',
    };
  }
}

/**
 * 通知处理器
 */
export async function processNotification(job: Job<NotificationData>): Promise<void> {
  const { data } = job;
  
  console.log(`开始处理通知任务: ${data.type}`);
  
  try {
    // 更新任务进度
    await job.progress(10);
    
    const results: NotificationResult[] = [];
    
    // 发送系统内通知
    await job.progress(30);
    const systemResult = await sendSystemNotification(data);
    results.push(systemResult);
    
    // 发送WebSocket实时通知
    await job.progress(50);
    const wsResult = await sendWebSocketNotification(data);
    results.push(wsResult);
    
    // 根据通知类型决定是否发送邮件
    if (data.type === 'publish_failed' || data.type === 'system_alert') {
      await job.progress(70);
      const emailResult = await sendEmailNotification(data);
      results.push(emailResult);
    }
    
    await job.progress(90);
    
    // 检查结果
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.warn('部分通知发送失败:', failedResults);
    }
    
    await job.progress(100);
    console.log(`通知任务处理完成: ${data.type}`);
    
  } catch (error) {
    console.error('通知任务处理失败:', error);
    throw error;
  }
}

/**
 * 添加通知任务到队列
 */
export async function addNotificationJob(
  notificationData: Omit<NotificationData, 'timestamp'>,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
): Promise<Job<NotificationData>> {
  const data: NotificationData = {
    ...notificationData,
    timestamp: new Date(),
  };
  
  const jobOptions = {
    delay: options?.delay || 0,
    priority: options?.priority || 0,
    attempts: options?.attempts || 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 50,
    removeOnFail: 20,
  };
  
  return notificationQueue.add('notification', data, jobOptions);
}

/**
 * 发布成功通知
 */
export async function notifyPublishSuccess(
  userId: string,
  articleId: string,
  platform: string,
  articleTitle: string
): Promise<void> {
  await addNotificationJob({
    type: 'publish_success',
    title: '文章发布成功',
    message: `您的文章《${articleTitle}》已成功发布到${platform}`,
    userId,
    articleId,
    platform,
    metadata: {
      articleTitle,
    },
  });
}

/**
 * 发布失败通知
 */
export async function notifyPublishFailed(
  userId: string,
  articleId: string,
  platform: string,
  articleTitle: string,
  error: string
): Promise<void> {
  await addNotificationJob(
    {
      type: 'publish_failed',
      title: '文章发布失败',
      message: `您的文章《${articleTitle}》发布到${platform}失败：${error}`,
      userId,
      articleId,
      platform,
      metadata: {
        articleTitle,
        error,
      },
    },
    {
      priority: 10, // 高优先级
    }
  );
}

/**
 * 抓取完成通知
 */
export async function notifyScrapeCompleted(
  userId: string,
  platform: string,
  scrapeType: string,
  results: any
): Promise<void> {
  await addNotificationJob({
    type: 'scrape_completed',
    title: '数据抓取完成',
    message: `${platform}的${scrapeType}数据抓取已完成`,
    userId,
    platform,
    metadata: {
      scrapeType,
      results,
    },
  });
}

/**
 * 系统警报通知
 */
export async function notifySystemAlert(
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  await addNotificationJob(
    {
      type: 'system_alert',
      title,
      message,
      metadata,
    },
    {
      priority: 20, // 最高优先级
    }
  );
}

/**
 * 批量发送通知
 */
export async function batchNotify(
  notifications: Array<Omit<NotificationData, 'timestamp'>>
): Promise<Job<NotificationData>[]> {
  const jobs = [];
  
  for (const notification of notifications) {
    const job = await addNotificationJob(notification);
    jobs.push(job);
  }
  
  return jobs;
}

export default {
  processNotificationJob: processNotification,
  addNotificationJob,
  notifyPublishSuccess,
  notifyPublishFailed,
  notifyScrapeCompleted,
  notifySystemAlert,
  sendBatchNotifications,
};