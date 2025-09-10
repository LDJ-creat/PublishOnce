import { Page } from 'playwright';
import { BasePlatformPublisher, LoginCredentials, PublishResult, ArticleData } from './base';

/**
 * 华为开发者社区登录凭据
 */
export interface HuaweiCredentials extends LoginCredentials {
  username: string;
  password: string;
}

/**
 * 华为开发者社区发布器
 */
export class HuaweiPublisher extends BasePlatformPublisher {
  protected platformName = '华为开发者社区';
  protected baseUrl = 'https://developer.huawei.com';

  /**
   * 登录华为开发者社区
   */
  async login(credentials: HuaweiCredentials): Promise<boolean> {
    try {
      console.log('开始登录华为开发者社区...');
      
      if (!this.page) {
        throw new Error('浏览器页面未初始化');
      }
      
      await this.page.goto('https://id1.cloud.huawei.com/CAS/portal/login.html');
      await this.waitForLoad();

      // 输入用户名
      await this.safeType('#userName', credentials.username);
      await this.wait(1000);

      // 输入密码
      await this.safeType('#password', credentials.password);
      await this.wait(1000);

      // 处理验证码（如果有）
      try {
        const captchaImg = await this.page.waitForSelector('#verifyCode_img', { timeout: 3000 });
        if (captchaImg) {
          console.log('检测到验证码，需要手动输入');
          await this.saveScreenshot('huawei-captcha.png');
          
          // 等待用户手动输入验证码
          await this.page.waitForFunction(
            () => {
              const input = document.querySelector('#verifyCode') as HTMLInputElement;
              return input && input.value.length > 0;
            },
            { timeout: 60000 }
          );
        }
      } catch (error) {
        // 没有验证码，继续
      }

      // 点击登录按钮
      await this.safeClick('#btn_submit');
      
      // 等待登录成功，可能需要处理二次验证
      try {
        // 检查是否需要短信验证
        const smsVerify = await this.page.waitForSelector('.sms-verify', { timeout: 5000 });
        if (smsVerify) {
          console.log('需要短信验证，请手动完成');
          await this.saveScreenshot('huawei-sms-verify.png');
          
          // 等待短信验证完成
          await this.page.waitForNavigation({ timeout: 120000 });
        }
      } catch (error) {
        // 没有短信验证，继续
      }

      // 验证登录成功
      await this.page.waitForURL('**/developer.huawei.com/**', { timeout: 30000 });
      
      console.log('华为开发者社区登录成功');
      return true;
      
    } catch (error) {
      console.error('华为开发者社区登录失败:', error);
      await this.saveScreenshot('huawei-login-error.png');
      return false;
    }
  }

  /**
   * 发布文章到华为开发者社区
   */
  async publishArticle(article: ArticleData): Promise<PublishResult> {
    try {
      console.log(`开始发布文章到华为开发者社区: ${article.title}`);
      
      if (!this.page) {
        throw new Error('浏览器页面未初始化');
      }
      
      // 进入创作中心
      await this.page.goto('https://developer.huawei.com/consumer/cn/forum/home');
      await this.waitForLoad();

      // 点击发帖按钮
      await this.safeClick('.post-btn');
      await this.wait(2000);

      // 等待编辑器加载
      await this.page.waitForSelector('.editor-container', { timeout: 15000 });
      await this.wait(3000);

      // 选择板块（如果需要）
      try {
        await this.safeClick('.board-select');
        await this.wait(1000);
        
        // 选择合适的板块，默认选择第一个
        const boardOptions = await this.page.locator('.board-option').all();
        if (boardOptions.length > 0) {
          await boardOptions[0].click();
          await this.wait(500);
        }
      } catch (error) {
        console.warn('选择板块失败:', error);
      }

      // 填写标题
      await this.safeType('.title-input input', article.title);
      await this.wait(1000);

      // 设置标签
      if (article.tags && article.tags.length > 0) {
        try {
          for (const tag of article.tags.slice(0, 3)) { // 华为社区最多3个标签
            await this.safeType('.tag-input input', tag);
            await this.page.keyboard.press('Enter');
            await this.wait(500);
          }
        } catch (error) {
          console.warn('设置标签失败:', error);
        }
      }

      // 填写内容
      if (article.content) {
        // 华为社区支持富文本编辑器
        try {
          // 尝试切换到Markdown模式
          await this.safeClick('.markdown-mode');
          await this.wait(1000);
          
          // 在Markdown编辑器中输入内容
          await this.safeClick('.markdown-editor');
          await this.wait(500);
          
          await this.page.keyboard.press('Control+A');
          await this.page.keyboard.press('Delete');
          await this.wait(500);
          
          await this.page.keyboard.type(article.content);
          await this.wait(2000);
        } catch (error) {
          // 如果没有Markdown模式，使用富文本编辑器
          console.log('使用富文本编辑器');
          
          const editorFrame = await this.page.frameLocator('.editor-frame');
          await editorFrame.locator('body').click();
          await this.page.keyboard.press('Control+A');
          await this.page.keyboard.press('Delete');
          await this.wait(500);
          
          // 简单转换Markdown为HTML
          const htmlContent = this.convertMarkdownToHtml(article.content);
          await editorFrame.locator('body').fill(htmlContent);
          await this.wait(2000);
        }
      }

      // 上传封面图片（如果有）
      if (article.coverImage) {
        try {
          await this.safeClick('.cover-upload');
          await this.wait(1000);
          
          // 这里需要处理图片上传逻辑
          console.log('封面图片上传功能待实现');
        } catch (error) {
          console.warn('封面图片上传失败:', error);
        }
      }

      // 设置文章摘要
      if (article.summary) {
        try {
          await this.safeType('.summary-input textarea', article.summary);
          await this.wait(500);
        } catch (error) {
          console.warn('设置摘要失败:', error);
        }
      }

      // 发布设置
      try {
        // 设置为原创
        if (article.isOriginal !== false) {
          await this.safeClick('.original-checkbox');
          await this.wait(500);
        }

        // 设置公开可见
        await this.safeClick('.public-visible');
        await this.wait(500);
      } catch (error) {
        console.warn('设置发布选项失败:', error);
      }

      // 发布文章
      if (article.publishImmediately !== false) {
        await this.safeClick('.publish-btn');
      } else {
        await this.safeClick('.save-draft-btn');
      }
      
      await this.wait(5000);

      // 检查发布结果
      try {
        // 等待发布成功提示或跳转
        await this.page.waitForFunction(
          () => {
            return document.querySelector('.success-message') || 
                   window.location.href.includes('/topic/');
          },
          { timeout: 20000 }
        );
        
        // 获取文章链接
        let articleUrl = '';
        if (this.page.url().includes('/topic/')) {
          articleUrl = this.page.url();
        } else {
          // 尝试从成功提示中获取链接
          try {
            const linkElement = await this.page.locator('.article-link').first();
            if (await linkElement.isVisible()) {
              articleUrl = await linkElement.getAttribute('href') || '';
              if (articleUrl && !articleUrl.startsWith('http')) {
                articleUrl = `https://developer.huawei.com${articleUrl}`;
              }
            }
          } catch (error) {
            console.warn('获取文章链接失败:', error);
          }
        }

        await this.saveScreenshot('huawei-publish-success.png');
        
        return {
          success: true,
          platform: '华为开发者社区',
          url: articleUrl,
          message: article.publishImmediately !== false ? '文章发布成功' : '文章已保存为草稿',
        };
        
      } catch (error) {
        // 检查是否有错误提示
        const errorMsg = await this.page.locator('.error-tip').textContent();
        throw new Error(errorMsg || '发布超时或失败');
      }
      
    } catch (error) {
      console.error('华为开发者社区发布失败:', error);
      await this.saveScreenshot('huawei-publish-error.png');
      
      return {
        success: false,
        platform: '华为开发者社区',
        error: error instanceof Error ? error.message : '发布失败',
      };
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus(): Promise<boolean> {
    try {
      if (!this.page) {
        throw new Error('浏览器页面未初始化');
      }
      
      await this.page.goto('https://developer.huawei.com/consumer/cn/forum/home');
      await this.wait(3000);
      
      // 检查是否有用户信息
      const userInfo = await this.page.locator('.user-info').isVisible();
      return userInfo;
    } catch (error) {
      console.error('检查华为开发者社区登录状态失败:', error);
      return false;
    }
  }

  /**
   * 获取用户发布的文章列表
   */
  async getPublishedArticles(limit: number = 10): Promise<any[]> {
    try {
      if (!this.page) {
        throw new Error('浏览器页面未初始化');
      }
      
      // 进入个人中心
      await this.page.goto('https://developer.huawei.com/consumer/cn/forum/user/posts');
      await this.waitForLoad();

      const articles = [];
      const articleElements = await this.page.locator('.post-item').all();
      
      for (let i = 0; i < Math.min(articleElements.length, limit); i++) {
        const element = articleElements[i];
        
        try {
          const title = await element.locator('.post-title').textContent();
          const url = await element.locator('.post-title a').getAttribute('href');
          const publishTime = await element.locator('.post-time').textContent();
          const stats = await element.locator('.post-stats').textContent();
          
          articles.push({
            title: title?.trim(),
            url: url ? `https://developer.huawei.com${url}` : '',
            publishTime: publishTime?.trim(),
            stats: stats?.trim(),
          });
        } catch (error) {
          console.warn(`解析第${i + 1}篇文章信息失败:`, error);
        }
      }
      
      return articles;
    } catch (error) {
      console.error('获取华为开发者社区文章列表失败:', error);
      return [];
    }
  }

  /**
   * 简单的Markdown到HTML转换
   */
  private convertMarkdownToHtml(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/\n/gim, '<br>');
  }

  /**
   * 获取文章统计数据
   */
  async getArticleStats(articleUrl: string): Promise<any> {
    try {
      if (!this.page) {
        throw new Error('浏览器页面未初始化');
      }
      
      await this.page.goto(articleUrl);
      await this.waitForLoad();

      const stats = {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };

      // 获取浏览数
      try {
        const viewsText = await this.page.locator('.view-count').textContent();
        stats.views = this.parseNumber(viewsText || '0');
      } catch (error) {
        console.warn('获取浏览数失败:', error);
      }

      // 获取点赞数
      try {
        const likesText = await this.page.locator('.like-count').textContent();
        stats.likes = this.parseNumber(likesText || '0');
      } catch (error) {
        console.warn('获取点赞数失败:', error);
      }

      // 获取评论数
      try {
        const commentsText = await this.page.locator('.comment-count').textContent();
        stats.comments = this.parseNumber(commentsText || '0');
      } catch (error) {
        console.warn('获取评论数失败:', error);
      }

      return stats;
    } catch (error) {
      console.error('获取华为开发者社区文章统计失败:', error);
      return null;
    }
  }

  /**
   * 更新文章
   */
  async updateArticle(articleId: string, article: ArticleData): Promise<boolean> {
    // 华为开发者社区暂不支持文章更新功能
    console.warn('华为开发者社区暂不支持文章更新功能');
    return false;
  }

  /**
   * 删除文章
   */
  async deleteArticle(articleId: string): Promise<boolean> {
    // 华为开发者社区暂不支持文章删除功能
    console.warn('华为开发者社区暂不支持文章删除功能');
    return false;
  }

  /**
   * 解析数字
   */
  private parseNumber(text: string): number {
    const num = parseInt(text.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 0 : num;
  }
}

export default HuaweiPublisher;