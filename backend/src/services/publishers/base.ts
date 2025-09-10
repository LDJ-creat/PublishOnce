import { Browser, Page } from 'playwright';
import { Article } from '../../models/Article';

/**
 * 登录凭据接口
 */
export interface LoginCredentials {
  username: string;
  password: string;
  [key: string]: any;
}

/**
 * 发布结果接口
 */
export interface PublishResult {
  success: boolean;
  platform: string;
  articleId?: string;
  url?: string;
  message?: string;
  error?: string;
}

/**
 * 文章发布数据接口
 */
export interface ArticleData {
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  category?: string;
  coverImage?: string;
  isDraft?: boolean;
  author?: string;
  publishImmediately?: boolean;
  isOriginal?: boolean;
}

/**
 * 平台发布器基类
 */
export abstract class BasePlatformPublisher {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected isLoggedIn: boolean = false;
  protected platformName: string;
  protected baseUrl: string;

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
      headless: process.env.NODE_ENV === 'production',
      slowMo: 100, // 减慢操作速度，避免被检测
    });
    
    if (!this.browser) {
      throw new Error('浏览器未初始化');
    }
    this.page = await this.browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    // 设置额外的请求头
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
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
    this.isLoggedIn = false;
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
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.wait(delay);
  }

  /**
   * 等待页面加载完成
   */
  protected async waitForLoad(): Promise<void> {
    if (!this.page) {
      throw new Error('浏览器页面未初始化');
    }
    await this.page.waitForLoadState('networkidle');
    await this.wait(1000); // 额外等待确保页面完全加载
  }

  /**
   * 安全点击元素
   */
  protected async safeClick(selector: string, timeout: number = 10000): Promise<boolean> {
    if (!this.page) {
      console.error('页面未初始化');
      return false;
    }
    try {
      await this.page.waitForSelector(selector, { timeout });
      await this.randomWait(500, 1500);
      await this.page.click(selector);
      return true;
    } catch (error) {
      console.error(`点击元素失败 ${selector}:`, error);
      return false;
    }
  }

  /**
   * 安全填写输入框
   */
  protected async safeType(selector: string, text: string, timeout: number = 10000): Promise<boolean> {
    if (!this.page) {
      console.error('页面未初始化');
      return false;
    }
    try {
      await this.page.waitForSelector(selector, { timeout });
      await this.page.fill(selector, '');
      await this.randomWait(300, 800);
      await this.page.type(selector, text, { delay: 50 });
      return true;
    } catch (error) {
      console.error(`填写输入框失败 ${selector}:`, error);
      return false;
    }
  }

  /**
   * 截图保存（用于调试）
   */
  protected async saveScreenshot(filename: string): Promise<void> {
    if (!this.page) {
      console.warn('页面未初始化，无法保存截图');
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      try {
        await this.page.screenshot({ 
          path: `screenshots/${this.platformName}_${filename}_${Date.now()}.png`,
          fullPage: true 
        });
      } catch (error) {
        console.warn('保存截图失败:', error);
      }
    }
  }

  // 抽象方法，子类必须实现
  abstract login(credentials: LoginCredentials): Promise<boolean>;
  abstract publishArticle(article: ArticleData): Promise<PublishResult>;
  abstract updateArticle(articleId: string, article: ArticleData): Promise<boolean>;
  abstract deleteArticle(articleId: string): Promise<boolean>;

  /**
   * 执行发布流程（模板方法）
   */
  async executePublish(credentials: LoginCredentials, article: ArticleData): Promise<PublishResult> {
    try {
      await this.initBrowser();
      
      // 登录
      const loginSuccess = await this.login(credentials);
      if (!loginSuccess) {
        return {
          success: false,
          platform: this.platformName,
          error: '登录失败'
        };
      }

      // 发布文章
      const result = await this.publishArticle(article);
      
      return {
        ...result,
        platform: this.platformName
      };
    } catch (error) {
      console.error(`${this.platformName} 发布失败:`, error);
      return {
        success: false,
        platform: this.platformName,
        error: error instanceof Error ? error.message : '未知错误'
      };
    } finally {
      await this.closeBrowser();
    }
  }
}

export default BasePlatformPublisher;