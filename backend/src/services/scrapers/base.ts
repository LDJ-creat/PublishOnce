import { chromium, Browser, Page, Locator } from 'playwright';

/**
 * 文章统计数据接口
 */
export interface ArticleStats {
  articleId: string;
  platform: string;
  url: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  collectedAt: Date;
  title?: string;
  publishDate?: Date;
}

/**
 * 评论数据接口
 */
export interface Comment {
  id: string;
  content: string;
  author: string;
  authorAvatar?: string;
  publishTime: Date;
  likes: number;
  replies?: Comment[];
  platform: string;
}

/**
 * 用户资料接口
 */
export interface UserProfile {
  userId?: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  articles: number;
  totalViews: number;
  totalLikes: number;
  level?: string;
  joinDate?: string;
  platform: string;
  url?: string;
}

/**
 * 抓取结果接口
 */
export interface ScrapeResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryAfter?: number; // 建议重试间隔（毫秒）
}

/**
 * 平台抓取器基类
 */
export abstract class BasePlatformScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected platformName: string;
  protected baseUrl: string;
  protected rateLimitDelay: number = 2000; // 请求间隔

  constructor(platformName: string, baseUrl: string) {
    this.platformName = platformName;
    this.baseUrl = baseUrl;
  }

  /**
   * 初始化浏览器
   */
  protected async initBrowser(): Promise<void> {
    const { chromium } = require('playwright');
    
    this.browser = await chromium.launch({
      headless: true, // 抓取时通常使用无头模式
      slowMo: 200, // 减慢操作速度
    });
    
    this.page = await this.browser.newPage({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });

    // 设置请求拦截，过滤不必要的资源
    await this.page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // 设置额外的请求头
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });
  }

  /**
   * 关闭浏览器
   */
  protected async closeBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 初始化抓取器
   */
  async initialize(): Promise<void> {
    await this.initBrowser();
  }

  /**
   * 关闭抓取器
   */
  async close(): Promise<void> {
    await this.closeBrowser();
  }

  /**
   * 获取随机User-Agent
   */
  protected getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * 等待指定时间
   */
  protected async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 随机等待时间（避免被检测）
   */
  protected async randomWait(min: number = 1000, max: number = 3000): Promise<void> {
    const waitTime = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.wait(waitTime);
  }

  /**
   * 安全获取元素文本
   */
  protected async safeGetText(selectorOrElement: string | Locator, timeout: number = 5000): Promise<string | null> {
    try {
      if (!this.page) return null;
      
      if (typeof selectorOrElement === 'string') {
        const element = await this.page.waitForSelector(selectorOrElement, { timeout });
        return await element?.textContent();
      } else {
        // 如果是Locator对象，直接获取textContent
        return await selectorOrElement.textContent() || '';
      }
    } catch (error) {
      console.warn(`获取文本失败:`, error);
      return null;
    }
  }

  /**
   * 等待页面加载完成
   */
  protected async waitForLoad(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (error) {
      console.warn('等待页面加载超时:', error);
    }
  }

  /**
   * 安全获取元素属性
   */
  protected async safeGetAttribute(selectorOrElement: string | Locator, attribute: string, timeout: number = 5000): Promise<string | null> {
    try {
      if (!this.page) return null;
      
      let element;
      if (typeof selectorOrElement === 'string') {
        element = await this.page.waitForSelector(selectorOrElement, { timeout });
      } else {
        element = selectorOrElement;
      }
      
      return await element?.getAttribute(attribute);
    } catch (error) {
      console.warn(`获取属性失败:`, error);
      return null;
    }
  }

  /**
   * 解析数字字符串（处理k、w等单位）
   */
  protected parseNumber(text: string): number {
    if (!text) return 0;
    
    const cleanText = text.replace(/[^0-9.kw万千]/gi, '');
    const num = parseFloat(cleanText);
    
    if (isNaN(num)) return 0;
    
    if (cleanText.includes('w') || cleanText.includes('万')) {
      return Math.floor(num * 10000);
    }
    if (cleanText.includes('k') || cleanText.includes('千')) {
      return Math.floor(num * 1000);
    }
    
    return Math.floor(num);
  }

  /**
   * 解析日期字符串
   */
  protected parseDate(dateStr: string): Date {
    try {
      // 处理相对时间
      if (dateStr.includes('分钟前')) {
        const minutes = parseInt(dateStr);
        return new Date(Date.now() - minutes * 60 * 1000);
      }
      if (dateStr.includes('小时前')) {
        const hours = parseInt(dateStr);
        return new Date(Date.now() - hours * 60 * 60 * 1000);
      }
      if (dateStr.includes('天前')) {
        const days = parseInt(dateStr);
        return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }
      
      // 尝试直接解析
      return new Date(dateStr);
    } catch (error) {
      return new Date();
    }
  }

  /**
   * 处理反爬虫检测
   */
  protected async handleAntiBot(): Promise<boolean> {
    try {
      if (!this.page) return false;
      
      // 检查是否遇到验证码或反爬虫页面
      const captchaSelectors = [
        '[class*="captcha"]',
        '[class*="verify"]',
        '[id*="captcha"]',
        'img[src*="captcha"]'
      ];
      
      for (const selector of captchaSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          console.warn(`${this.platformName} 遇到验证码，需要人工处理`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return true; // 如果检查失败，假设没有反爬虫
    }
  }

  /**
   * 应用速率限制
   */
  protected async applyRateLimit(): Promise<void> {
    await this.wait(this.rateLimitDelay);
  }

  // 抽象方法，子类必须实现
  abstract scrapeArticleStats(articleUrl: string): Promise<ScrapeResult<ArticleStats>>;
  abstract scrapeComments(articleUrl: string, limit?: number): Promise<ScrapeResult<Comment[]>>;
  abstract scrapeUserProfile(userId: string): Promise<ScrapeResult<UserProfile>>;

  /**
   * 执行抓取流程（模板方法）
   */
  async executeScrape<T>(scrapeFunction: () => Promise<ScrapeResult<T>>): Promise<ScrapeResult<T>> {
    try {
      await this.initBrowser();
      
      const result = await scrapeFunction();
      
      return result;
    } catch (error) {
      console.error(`${this.platformName} 抓取失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    } finally {
      await this.closeBrowser();
    }
  }
}

export default BasePlatformScraper;