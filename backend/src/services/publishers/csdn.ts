import { Page } from 'playwright';
import { BasePlatformPublisher, LoginCredentials, PublishResult, ArticleData } from './base';

/**
 * CSDN登录凭据
 */
export interface CSDNCredentials extends LoginCredentials {
  username: string;
  password: string;
}

/**
 * CSDN发布器
 */
export class CSDNPublisher extends BasePlatformPublisher {

  /**
   * 登录CSDN
   */
  async login(credentials: CSDNCredentials): Promise<boolean> {
    try {
      console.log('开始登录CSDN...');
      
      if (!await this.safeGoto('https://passport.csdn.net/login')) {
        return false;
      }
      await this.waitForLoad();

      // 切换到密码登录
      try {
        await this.safeClick('.login-code__open--right');
        await this.wait(1000);
      } catch (error) {
        // 可能已经是密码登录模式
      }

      // 输入用户名
      await this.safeType('#loginname', credentials.username);
      await this.wait(1000);

      // 输入密码
      await this.safeType('#nloginpwd', credentials.password);
      await this.wait(1000);

      // 处理验证码（如果有）
      try {
        if (this.page) {
          const captchaImg = await this.page.waitForSelector('#imgCode', { timeout: 3000 });
          if (captchaImg) {
            console.log('检测到验证码，需要手动输入');
            await this.saveScreenshot('csdn-captcha.png');
            
            // 等待用户手动输入验证码
            await this.page!.waitForFunction(
              () => {
                const input = (document as any).querySelector('#validCode') as any;
                return input && input.value && input.value.length > 0;
              },
              { timeout: 60000 }
            );
          }
        }
      } catch (error) {
        // 没有验证码，继续
      }

      // 点击登录按钮
      await this.safeClick('.logging');
      
      // 等待登录成功
      if (this.page) {
        await this.page.waitForURL('**/blog.csdn.net/**', { timeout: 30000 });
      }
      
      console.log('CSDN登录成功');
      return true;
      
    } catch (error) {
      console.error('CSDN登录失败:', error);
      await this.saveScreenshot('csdn-login-error.png');
      return false;
    }
  }

  /**
   * 发布文章到CSDN
   */
  async publishArticle(article: ArticleData): Promise<PublishResult> {
    try {
      console.log(`开始发布文章到CSDN: ${article.title}`);
      
      // 进入写博客页面
      if (!await this.safeGoto('https://editor.csdn.net/md/')) {
        return { success: false, error: '无法访问编辑页面', platform: 'CSDN' };
      }
      await this.waitForLoad();

      // 等待编辑器加载完成
        if (this.page) {
          await this.page.waitForSelector('.editor-title-input', { timeout: 10000 });
        }
      await this.wait(2000);

      // 填写标题
      await this.safeType('.editor-title-input', article.title);
      await this.wait(1000);

      // 填写内容到Markdown编辑器
      if (article.content) {
        // 点击编辑器区域
        await this.safeClick('.editor-md-input');
        await this.wait(1000);
        
        // 清空编辑器
          if (this.page) {
            await this.page?.keyboard.press('Control+A');
        await this.page?.keyboard.press('Delete');
            await this.wait(500);
            
            // 输入内容
            await this.page?.keyboard.type(article.content);
            await this.wait(2000);
          }
      }

      // 点击发布按钮
      await this.safeClick('.btn-publish');
      await this.wait(2000);

      // 等待发布设置弹窗
        if (this.page) {
          await this.page.waitForSelector('.article-bar', { timeout: 10000 });
        }

      // 设置文章分类
      if (article.category && this.page) {
        try {
          await this.safeClick('.select-item-category');
          await this.wait(1000);
          
          // 查找匹配的分类
          const categoryOptions = await this.page.locator('.el-select-dropdown__item').all();
          for (const option of categoryOptions) {
            const text = await option.textContent();
            if (text && text.includes(article.category)) {
              await option.click();
              break;
            }
          }
          await this.wait(500);
        } catch (error) {
          console.warn('设置分类失败:', error);
        }
      }

      // 设置标签
      if (article.tags && article.tags.length > 0) {
        try {
          const tagInput = await this.page!.locator('.tag-input-new');
          for (const tag of article.tags.slice(0, 5)) { // CSDN最多5个标签
            await tagInput.fill(tag);
            await this.page!.keyboard.press('Enter');
            await this.wait(500);
          }
        } catch (error) {
          console.warn('设置标签失败:', error);
        }
      }

      // 设置文章摘要
      if (article.summary) {
        try {
          await this.safeType('.article-bar__content textarea', article.summary);
          await this.wait(500);
        } catch (error) {
          console.warn('设置摘要失败:', error);
        }
      }

      // 设置文章类型（原创/转载/翻译）
      try {
        const articleType = article.isOriginal !== false ? '原创' : '转载';
        await this.safeClick(`[title="${articleType}"]`);
        await this.wait(500);
      } catch (error) {
        console.warn('设置文章类型失败:', error);
      }

      // 发布文章
      if (article.publishImmediately !== false) {
        await this.safeClick('.btn-publish-immediately');
      } else {
        await this.safeClick('.btn-save-draft');
      }
      
      await this.wait(3000);

      // 检查发布结果
      try {
        // 等待成功提示或跳转
        await this.page!.waitForFunction(
          () => {
            return document.querySelector('.success-tips') || 
                   window.location.href.includes('/article/details/');
          },
          { timeout: 15000 }
        );
        
        // 获取文章链接
        let articleUrl = '';
        if (this.page!.url().includes('/article/details/')) {
        articleUrl = this.page!.url() || '';
        } else {
          // 尝试从成功提示中获取链接
          try {
            const linkElement = await this.page!.locator('.success-tips a').first();
            if (await linkElement.isVisible()) {
              articleUrl = (await linkElement.getAttribute('href')) || '';
            }
          } catch (error) {
            console.warn('获取文章链接失败:', error);
          }
        }

        await this.saveScreenshot('csdn-publish-success.png');
        
        return {
          success: true,
          platform: 'CSDN',
          url: articleUrl,
          message: article.publishImmediately !== false ? '文章发布成功' : '文章已保存为草稿',
        };
        
      } catch (error) {
        // 检查是否有错误提示
        const errorMsg = await this.page!.locator('.error-tips').textContent();
        throw new Error(errorMsg || '发布超时或失败');
      }
      
    } catch (error) {
      console.error('CSDN发布失败:', error);
      await this.saveScreenshot('csdn-publish-error.png');
      
      return {
        success: false,
        platform: 'CSDN',
        error: error instanceof Error ? error.message : '发布失败',
      };
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus(): Promise<boolean> {
    try {
      await this.page!.goto('https://blog.csdn.net');
      await this.wait(3000);
      
      // 检查是否有登录用户信息
      const userInfo = await this.page!.locator('.toolbar-btn-login').isVisible();
      return !userInfo; // 如果没有登录按钮，说明已登录
    } catch (error) {
      console.error('检查CSDN登录状态失败:', error);
      return false;
    }
  }

  /**
   * 获取用户发布的文章列表
   */
  async getPublishedArticles(limit: number = 10): Promise<any[]> {
    try {
      // 进入个人博客管理页面
      await this.page?.goto('https://blog.csdn.net/nav/watchers');
      await this.waitForLoad();

      const articles: any[] = [];
      const articleElements = await this.page?.locator('.article-item-box').all();
      
      if (!articleElements) return articles;
      
      for (let i = 0; i < Math.min(articleElements.length, limit); i++) {
        const element = articleElements[i];
        
        try {
          const title = await element.locator('.article-title').textContent();
          const url = await element.locator('.article-title a').getAttribute('href');
          const publishTime = await element.locator('.article-time').textContent();
          const views = await element.locator('.article-view').textContent();
          
          articles.push({
            title: title?.trim(),
            url: url ? `https://blog.csdn.net${url}` : '',
            publishTime: publishTime?.trim(),
            views: views?.trim(),
          });
        } catch (error) {
          console.warn(`解析第${i + 1}篇文章信息失败:`, error);
        }
      }
      
      return articles;
    } catch (error) {
      console.error('获取CSDN文章列表失败:', error);
      return [];
    }
  }

  /**
   * 更新文章
   */
  async updateArticle(articleId: string, article: ArticleData): Promise<boolean> {
    try {
      console.log(`更新CSDN文章: ${articleId}`);
      // TODO: 实现文章更新逻辑
      return false;
    } catch (error) {
      console.error('更新CSDN文章失败:', error);
      return false;
    }
  }

  /**
   * 删除文章
   */
  async deleteArticle(articleId: string): Promise<boolean> {
    try {
      console.log(`删除CSDN文章: ${articleId}`);
      // 实现删除逻辑
      return true;
    } catch (error) {
      console.error('删除文章失败:', error);
      return false;
    }
  }

  async publish(article: ArticleData): Promise<PublishResult> {
    return this.publishArticle(article);
  }
}

export default CSDNPublisher;