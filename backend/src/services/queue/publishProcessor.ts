import { Job } from 'bull';
import { publishQueue } from './index';
import { Article } from '../../models/Article';
import { Platform } from '../../models/Platform';
import { CSDNPublisher } from '../publishers/csdn';
import { JuejinPublisher } from '../publishers/juejin';
import { HuaweiPublisher } from '../publishers/huawei';
import { WechatPublisher } from '../publishers/wechat';
import { BasePlatformPublisher, LoginCredentials, ArticleData } from '../publishers/base';
import { PlatformType } from '../../types';

/**
 * 发布任务数据接口
 */
export interface PublishJobData {
  articleId: string;
  userId: string;
  platforms: string[];
  credentials: { [platform: string]: LoginCredentials };
}

/**
 * 发布任务结果接口
 */
export interface PublishJobResult {
  articleId: string;
  results: {
    platform: string;
    success: boolean;
    url?: string;
    error?: string;
  }[];
}

/**
 * 获取平台发布器
 */
function getPlatformPublisher(platformName: string): BasePlatformPublisher | null {
  switch (platformName.toLowerCase()) {
    case 'csdn':
      return new CSDNPublisher('csdn', 'https://blog.csdn.net');
    case 'juejin':
      return new JuejinPublisher('juejin', 'https://juejin.cn');
    case 'huawei':
      return new HuaweiPublisher('huawei', 'https://developer.huawei.com');
    case 'wechat':
      return new WechatPublisher('wechat', 'https://mp.weixin.qq.com');
    default:
      return null;
  }
}

/**
 * 转换文章数据为发布数据格式
 */
function convertArticleToPublishData(article: any): ArticleData {
  return {
    title: article.title,
    content: article.content,
    summary: article.summary,
    tags: article.tags || [],
    category: article.category,
    coverImage: article.coverImage,
    isDraft: false,
  };
}

/**
 * 发布任务处理器
 */
export async function processPublishJob(job: Job<PublishJobData>): Promise<PublishJobResult> {
  const { articleId, userId, platforms, credentials } = job.data;
  
  console.log(`开始处理发布任务: ${job.id}, 文章ID: ${articleId}`);
  
  try {
    // 获取文章数据
    const article = await Article.findOne({ _id: articleId, author: userId });
    if (!article) {
      throw new Error('文章不存在或无权访问');
    }

    const publishData = convertArticleToPublishData(article);
    const results: PublishJobResult['results'] = [];
    
    // 更新任务进度
    await job.progress(10);

    // 逐个平台发布
    for (let i = 0; i < platforms.length; i++) {
      const platformName = platforms[i];
      const platformCredentials = credentials[platformName];
      
      if (!platformCredentials) {
        results.push({
          platform: platformName,
          success: false,
          error: '缺少平台登录凭据'
        });
        continue;
      }

      try {
        console.log(`开始发布到 ${platformName}`);
        
        const publisher = getPlatformPublisher(platformName);
        if (!publisher) {
          results.push({
            platform: platformName,
            success: false,
            error: '不支持的发布平台'
          });
          continue;
        }

        // 执行发布
        const publishResult = await publisher.executePublish(platformCredentials, publishData);
        
        results.push({
          platform: platformName,
          success: publishResult.success,
          url: publishResult.url,
          error: publishResult.error
        });

        // 更新文章中的平台信息
        if (publishResult.success) {
          const platformIndex = article.publishedPlatforms.findIndex(
            (p: any) => p.platform === platformName
          );

          if (platformIndex >= 0) {
            article.publishedPlatforms[platformIndex].status = 'success';
            article.publishedPlatforms[platformIndex].platformUrl = publishResult.url;
            article.publishedPlatforms[platformIndex].platformArticleId = publishResult.articleId;
            article.publishedPlatforms[platformIndex].publishedAt = new Date();
          } else {
            article.publishedPlatforms.push({
               platform: platformName as PlatformType,
               status: 'success',
               platformUrl: publishResult.url,
               platformArticleId: publishResult.articleId,
               publishedAt: new Date()
             });
          }
          
          // 发送成功通知
          try {
            const { notifyPublishSuccess } = await import('./notificationProcessor');
            await notifyPublishSuccess(userId, articleId, platformName, article.title);
          } catch (notifyError) {
            console.error('发送成功通知失败:', notifyError);
          }
        } else {
          const platformIndex = article.publishedPlatforms.findIndex(
            (p: any) => p.platform === platformName
          );
          if (platformIndex >= 0) {
            article.publishedPlatforms[platformIndex].status = 'failed';
            article.publishedPlatforms[platformIndex].error = publishResult.error;
          }
          
          // 发送失败通知
          try {
            const { notifyPublishFailed } = await import('./notificationProcessor');
            await notifyPublishFailed(userId, articleId, platformName, article.title, publishResult.error || '未知错误');
          } catch (notifyError) {
            console.error('发送失败通知失败:', notifyError);
          }
        }

        console.log(`${platformName} 发布结果:`, publishResult.success ? '成功' : '失败');
        
      } catch (error) {
        console.error(`${platformName} 发布异常:`, error);
        results.push({
          platform: platformName,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }

      // 更新进度
      const progress = Math.floor(((i + 1) / platforms.length) * 80) + 10;
      await job.progress(progress);
      
      // 平台间延迟，避免被检测
      if (i < platforms.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // 保存文章更新
    await article.save();
    
    // 更新文章总体状态
    const hasSuccess = results.some(r => r.success);
    const allSuccess = results.every(r => r.success);
    
    if (allSuccess) {
      article.status = 'published';
    } else if (hasSuccess) {
      article.status = 'published';
    }
    
    await article.save();
    await job.progress(100);

    console.log(`发布任务完成: ${job.id}`);
    
    return {
      articleId,
      results
    };
    
  } catch (error) {
    console.error(`发布任务失败: ${job.id}`, error);
    throw error;
  }
}

/**
 * 添加发布任务到队列
 */
export async function addPublishJob(jobData: PublishJobData): Promise<Job<PublishJobData>> {
  return publishQueue.add('publish-article', jobData, {
    priority: 1,
    delay: 0,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}

export default {
  processPublishJob,
  addPublishJob,
};