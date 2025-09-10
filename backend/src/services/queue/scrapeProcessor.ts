import { Job } from 'bull';
import { scrapeQueue } from './index';
import { Article } from '../../models/Article';
import { Stats } from '../../models/Stats';
import { CSDNScraper } from '../scrapers/csdn';
import { JuejinScraper } from '../scrapers/juejin';
import { HuaweiScraper } from '../scrapers/huawei';
import { BasePlatformScraper, ArticleStats, Comment } from '../scrapers/base';

/**
 * 抓取任务类型
 */
export type ScrapeJobType = 'article-stats' | 'comments' | 'user-profile' | 'batch-stats';

/**
 * 抓取任务数据接口
 */
export interface ScrapeJobData {
  type: ScrapeJobType;
  platform: string;
  articleId?: string;
  articleUrl?: string;
  userId?: string;
  articleIds?: string[]; // 批量抓取
  config?: {
    scrapeUserArticles?: boolean;
    scrapeFollowedAuthors?: boolean;
    scrapeTrendingTopics?: boolean;
    [key: string]: any;
  };
}

/**
 * 抓取任务结果接口
 */
export interface ScrapeJobResult {
  type: ScrapeJobType;
  platform: string;
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 获取平台抓取器
 */
function getPlatformScraper(platformName: string): BasePlatformScraper | null {
  switch (platformName.toLowerCase()) {
    case 'csdn':
      return new CSDNScraper();
    case 'juejin':
      return new JuejinScraper();
    case 'huawei':
      return new HuaweiScraper();
    default:
      return null;
  }
}

/**
 * 保存文章统计数据
 */
async function saveArticleStats(stats: ArticleStats): Promise<void> {
  try {
    // 更新文章模型中的统计数据
    await Article.findOneAndUpdate(
      { _id: stats.articleId },
      {
        $set: {
          [`platforms.$.views`]: stats.views,
          [`platforms.$.likes`]: stats.likes,
          [`platforms.$.comments`]: stats.comments,
          [`platforms.$.shares`]: stats.shares,
          [`platforms.$.lastStatsUpdate`]: stats.collectedAt,
        }
      },
      { arrayFilters: [{ 'platforms.platform': stats.platform }] }
    );

    // 保存到统计数据集合
    await Stats.create({
      articleId: stats.articleId,
      platform: stats.platform,
      type: 'article',
      data: {
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        shares: stats.shares || 0,
        url: stats.url,
      },
      collectedAt: stats.collectedAt,
    });

    console.log(`保存统计数据成功: ${stats.platform} - ${stats.articleId}`);
  } catch (error) {
    console.error('保存统计数据失败:', error);
    throw error;
  }
}

/**
 * 文章统计抓取处理器
 */
async function processArticleStatsJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult> {
  const { platform, articleUrl, articleId } = job.data;
  
  if (!articleUrl || !articleId) {
    throw new Error('缺少必要参数: articleUrl 或 articleId');
  }

  const scraper = getPlatformScraper(platform);
  if (!scraper) {
    throw new Error(`不支持的抓取平台: ${platform}`);
  }

  try {
    console.log(`开始抓取文章统计: ${platform} - ${articleUrl}`);
    
    const result = await scraper.scrapeArticleStats(articleUrl);
    
    if (result.success && result.data) {
      result.data.articleId = articleId;
      await saveArticleStats(result.data);
    }

    return {
      type: 'article-stats',
      platform,
      success: result.success,
      data: result.data,
      error: result.error,
    };
  } catch (error) {
    console.error(`抓取文章统计失败: ${platform} - ${articleUrl}`, error);
    return {
      type: 'article-stats',
      platform,
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 评论抓取处理器
 */
async function processCommentsJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult> {
  const { platform, articleUrl, articleId } = job.data;
  
  if (!articleUrl || !articleId) {
    throw new Error('缺少必要参数: articleUrl 或 articleId');
  }

  const scraper = getPlatformScraper(platform);
  if (!scraper) {
    throw new Error(`不支持的抓取平台: ${platform}`);
  }

  try {
    console.log(`开始抓取评论: ${platform} - ${articleUrl}`);
    
    const result = await scraper.scrapeComments(articleUrl, 50); // 限制50条评论
    
    if (result.success && result.data) {
      // 保存评论数据到数据库
      await Stats.create({
        articleId,
        platform,
        type: 'comments',
        data: {
          comments: result.data,
          count: result.data.length,
        },
        collectedAt: new Date(),
      });
    }

    return {
      type: 'comments',
      platform,
      success: result.success,
      data: result.data,
      error: result.error,
    };
  } catch (error) {
    console.error(`抓取评论失败: ${platform} - ${articleUrl}`, error);
    return {
      type: 'comments',
      platform,
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 批量统计抓取处理器
 */
async function processBatchStatsJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult> {
  const { platform, articleIds } = job.data;
  
  if (!articleIds || articleIds.length === 0) {
    throw new Error('缺少文章ID列表');
  }

  const scraper = getPlatformScraper(platform);
  if (!scraper) {
    throw new Error(`不支持的抓取平台: ${platform}`);
  }

  const results: any[] = [];
  const errors: string[] = [];

  try {
    console.log(`开始批量抓取统计: ${platform} - ${articleIds.length}篇文章`);
    
    for (let i = 0; i < articleIds.length; i++) {
      const articleId = articleIds[i];
      
      try {
        // 获取文章URL
        const article = await Article.findById(articleId);
        if (!article) {
          errors.push(`文章不存在: ${articleId}`);
          continue;
        }

        const platformInfo = article.publishedPlatforms.find((p: any) => p.platform === platform);
        if (!platformInfo || !platformInfo.platformUrl) {
          errors.push(`文章未在${platform}平台发布: ${articleId}`);
          continue;
        }

        // 抓取统计数据
        const result = await scraper.scrapeArticleStats(platformInfo.platformUrl);
        
        if (result.success && result.data) {
          result.data.articleId = articleId;
          await saveArticleStats(result.data);
          results.push(result.data);
        } else {
          errors.push(`抓取失败 ${articleId}: ${result.error}`);
        }

        // 更新进度
        const progress = Math.floor(((i + 1) / articleIds.length) * 100);
        await job.progress(progress);
        
        // 请求间隔，避免被封
        if (i < articleIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        errors.push(`处理文章${articleId}时出错: ${error}`);
      }
    }

    return {
      type: 'batch-stats',
      platform,
      success: results.length > 0,
      data: {
        success: results.length,
        failed: errors.length,
        results,
        errors,
      },
    };
  } catch (error) {
    console.error(`批量抓取统计失败: ${platform}`, error);
    return {
      type: 'batch-stats',
      platform,
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 抓取任务处理器
 */
export async function processScrapeJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult> {
  const { type } = job.data;
  
  console.log(`开始处理抓取任务: ${job.id}, 类型: ${type}`);
  
  try {
    switch (type) {
      case 'article-stats':
        return await processArticleStatsJob(job);
      case 'comments':
        return await processCommentsJob(job);
      case 'batch-stats':
        return await processBatchStatsJob(job);
      default:
        throw new Error(`不支持的抓取任务类型: ${type}`);
    }
  } catch (error) {
    console.error(`抓取任务失败: ${job.id}`, error);
    throw error;
  }
}

/**
 * 添加抓取任务到队列
 */
export async function addScrapeJob(jobData: ScrapeJobData, delay: number = 0): Promise<Job<ScrapeJobData>> {
  return scrapeQueue.add(`scrape-${jobData.type}`, jobData, {
    priority: jobData.type === 'batch-stats' ? 2 : 3,
    delay,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  });
}

/**
 * 添加定时抓取任务
 */
export async function addScheduledScrapeJobs(): Promise<void> {
  try {
    // 获取所有已发布的文章
    const articles = await Article.find({
      status: 'published',
      'platforms.status': 'published',
    }).select('_id platforms');

    console.log(`找到 ${articles.length} 篇已发布文章，准备添加抓取任务`);

    for (const article of articles) {
      for (const platform of article.publishedPlatforms) {
        if (platform.status === 'success' && platform.platformUrl) {
          // 添加统计抓取任务，随机延迟避免同时请求
          const delay = Math.floor(Math.random() * 300000); // 0-5分钟随机延迟
          
          await addScrapeJob({
            type: 'article-stats',
            platform: platform.platform,
            articleId: article._id.toString(),
            articleUrl: platform.platformUrl,
          }, delay);
        }
      }
    }

    console.log('定时抓取任务添加完成');
  } catch (error) {
    console.error('添加定时抓取任务失败:', error);
  }
}

export default {
  processScrapeJob,
  addScrapeJob,
  addScheduledScrapeJobs,
};