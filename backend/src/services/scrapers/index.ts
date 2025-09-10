import { BasePlatformScraper } from './base';
import { CSDNScraper } from './csdn';
import { JuejinScraper } from './juejin';
import { HuaweiScraper } from './huawei';

// 导出基础抓取器和所有平台抓取器
export { BasePlatformScraper } from './base';
export { CSDNScraper } from './csdn';
export { JuejinScraper } from './juejin';
export { HuaweiScraper } from './huawei';

// 导出类型定义
export type {
  ArticleStats,
  Comment,
  UserProfile,
  ScrapeResult,
} from './base';

// 支持的抓取平台
export type SupportedScrapePlatform = 'csdn' | 'juejin' | 'huawei';

// 抓取器工厂函数
export function createScraper(platform: SupportedScrapePlatform): BasePlatformScraper {
  switch (platform) {
    case 'csdn':
      return new CSDNScraper();
    case 'juejin':
      return new JuejinScraper();
    case 'huawei':
      return new HuaweiScraper();
    default:
      throw new Error(`不支持的抓取平台: ${platform}`);
  }
}

// 获取所有支持的抓取平台
export function getSupportedScrapePlatforms(): SupportedScrapePlatform[] {
  return ['csdn', 'juejin', 'huawei'];
}

// 平台配置接口
export interface ScrapePlatformConfig {
  name: string;
  displayName: string;
  baseUrl: string;
  rateLimit: number; // 请求间隔（毫秒）
  maxRetries: number;
  timeout: number;
  features: {
    articleStats: boolean;
    comments: boolean;
    userProfile: boolean;
    hotArticles: boolean;
  };
}

// 平台配置
export const scrapePlatformConfigs: Record<SupportedScrapePlatform, ScrapePlatformConfig> = {
  csdn: {
    name: 'csdn',
    displayName: 'CSDN',
    baseUrl: 'https://www.csdn.net',
    rateLimit: 2000,
    maxRetries: 3,
    timeout: 30000,
    features: {
      articleStats: true,
      comments: true,
      userProfile: true,
      hotArticles: true,
    },
  },
  juejin: {
    name: 'juejin',
    displayName: '掘金',
    baseUrl: 'https://juejin.cn',
    rateLimit: 1500,
    maxRetries: 3,
    timeout: 30000,
    features: {
      articleStats: true,
      comments: true,
      userProfile: true,
      hotArticles: true,
    },
  },
  huawei: {
    name: 'huawei',
    displayName: '华为开发者社区',
    baseUrl: 'https://developer.huawei.com',
    rateLimit: 3000,
    maxRetries: 3,
    timeout: 30000,
    features: {
      articleStats: true,
      comments: true,
      userProfile: true,
      hotArticles: true,
    },
  },
};

// 获取平台配置
export function getPlatformConfig(platform: SupportedScrapePlatform): ScrapePlatformConfig {
  return scrapePlatformConfigs[platform];
}

// 检查平台是否支持特定功能
export function isPlatformFeatureSupported(
  platform: SupportedScrapePlatform,
  feature: keyof ScrapePlatformConfig['features']
): boolean {
  return scrapePlatformConfigs[platform].features[feature];
}

// 批量抓取器管理类
export class ScraperManager {
  private scrapers: Map<SupportedScrapePlatform, BasePlatformScraper> = new Map();

  /**
   * 获取或创建抓取器实例
   */
  getScraper(platform: SupportedScrapePlatform): BasePlatformScraper {
    if (!this.scrapers.has(platform)) {
      this.scrapers.set(platform, createScraper(platform));
    }
    return this.scrapers.get(platform)!;
  }

  /**
   * 初始化所有抓取器
   */
  async initializeAll(): Promise<void> {
    const platforms = getSupportedScrapePlatforms();
    const initPromises = platforms.map(async (platform) => {
      try {
        const scraper = this.getScraper(platform);
        await scraper.initialize();
        console.log(`${platform} 抓取器初始化成功`);
      } catch (error) {
        console.error(`${platform} 抓取器初始化失败:`, error);
      }
    });

    await Promise.allSettled(initPromises);
  }

  /**
   * 关闭所有抓取器
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.scrapers.values()).map(async (scraper) => {
      try {
        await scraper.close();
      } catch (error) {
        console.error('关闭抓取器失败:', error);
      }
    });

    await Promise.allSettled(closePromises);
    this.scrapers.clear();
  }

  /**
   * 批量抓取文章统计
   */
  async batchScrapeArticleStats(
    tasks: Array<{ platform: SupportedScrapePlatform; url: string }>
  ): Promise<Array<{ platform: SupportedScrapePlatform; url: string; result: any }>> {
    const results = [];

    for (const task of tasks) {
      try {
        const scraper = this.getScraper(task.platform);
        const result = await scraper.scrapeArticleStats(task.url);
        results.push({
          platform: task.platform,
          url: task.url,
          result,
        });

        // 应用速率限制
        const config = getPlatformConfig(task.platform);
        await new Promise(resolve => setTimeout(resolve, config.rateLimit));
      } catch (error) {
        console.error(`批量抓取 ${task.platform} 文章统计失败:`, error);
        results.push({
          platform: task.platform,
          url: task.url,
          result: {
            success: false,
            error: error instanceof Error ? error.message : '抓取失败',
          },
        });
      }
    }

    return results;
  }

  /**
   * 批量抓取用户资料
   */
  async batchScrapeUserProfiles(
    tasks: Array<{ platform: SupportedScrapePlatform; url: string }>
  ): Promise<Array<{ platform: SupportedScrapePlatform; url: string; result: any }>> {
    const results = [];

    for (const task of tasks) {
      try {
        const scraper = this.getScraper(task.platform);
        const result = await scraper.scrapeUserProfile(task.url);
        results.push({
          platform: task.platform,
          url: task.url,
          result,
        });

        // 应用速率限制
        const config = getPlatformConfig(task.platform);
        await new Promise(resolve => setTimeout(resolve, config.rateLimit));
      } catch (error) {
        console.error(`批量抓取 ${task.platform} 用户资料失败:`, error);
        results.push({
          platform: task.platform,
          url: task.url,
          result: {
            success: false,
            error: error instanceof Error ? error.message : '抓取失败',
          },
        });
      }
    }

    return results;
  }
}

// 默认导出抓取器管理器实例
export default new ScraperManager();