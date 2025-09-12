import { Page } from 'playwright';
import { BasePlatformPublisher, LoginCredentials, PublishResult, ArticleData } from './base';

/**
 * 掘金登录凭据
 */
export interface JuejinCredentials extends LoginCredentials {
  phone?: string;
  email?: string;
}

/**
 * 掘金发布器
 */
export class JuejinPublisher extends BasePlatformPublisher {

  /**
   * 登录掘金（主要通过扫码）
   */
  async login(credentials: JuejinCredentials): Promise<boolean> {
    try {
      console.log('开始登录掘金...');
      
      if (!await this.safeGoto('https://juejin.cn/login')) {
        return false;
      }
      await this.waitForLoad();

      // 掘金主要使用扫码登录，也支持手机号登录
      if (credentials.phone && credentials.password) {
        try {
          // 切换到手机号登录
          await this.safeClick('.clickable');
          await this.wait(1000);

          // 输入手机号
          await this.safeType('input[name="loginPhoneOrEmail"]', credentials.phone);
          await this.wait(1000);

          // 输入密码
          await this.safeType('input[name="loginPassword"]', credentials.password);
          await this.wait(1000);

          // 点击登录
          await this.safeClick('.btn');
          await this.wait(3000);
        } catch (error) {
          console.log('手机号登录失败，尝试扫码登录');
        }
      }

      // 检查是否需要扫码
      const qrcode = await this.page?.locator('.qrcode-img').isVisible();
      if (qrcode) {
        console.log('请扫描二维码登录掘金');
        await this.saveScreenshot('juejin-qrcode.png');
        
        // 等待扫码完成
        await this.page?.waitForURL('**/juejin.cn/**', { timeout: 120000 });
      }

      // 验证登录成功
      await this.page!.waitForSelector('.avatar', { timeout: 10000 });
      
      console.log('掘金登录成功');
      return true;
      
    } catch (error) {
      console.error('掘金登录失败:', error);
      await this.saveScreenshot('juejin-login-error.png');
      return false;
    }
  }

  /**
   * 发布文章到掘金
   */
  async publishArticle(article: ArticleData): Promise<PublishResult> {
    try {
      console.log(`开始发布文章到掘金: ${article.title}`);
      
      // 进入创作者中心
      if (!await this.safeGoto('https://juejin.cn/editor/drafts/new?v=2')) {
        return { success: false, error: '无法访问编辑页面', platform: '掘金' };
      }
      await this.waitForLoad();

      // 等待编辑器加载
      if (this.page) {
        await this.page.waitForSelector('.editor-title', { timeout: 15000 });
      }
      await this.wait(3000);

      // 填写标题
      await this.safeType('.editor-title textarea', article.title);
      await this.wait(1000);

      // 填写内容到Markdown编辑器
      if (article.content) {
        // 点击编辑器区域
        await this.safeClick('.CodeMirror-scroll');
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

      // 保存草稿
      await this.safeClick('.save-btn');
      await this.wait(2000);

      // 点击发布按钮
      await this.safeClick('.publish-btn');
      await this.wait(2000);

      // 等待发布设置弹窗
      if (this.page) {
        await this.page.waitForSelector('.publish-popup', { timeout: 10000 });
      }

      // 设置文章封面（如果有）
      if (article.coverImage) {
        try {
          await this.safeClick('.cover-upload');
          await this.wait(1000);
          
          // 这里需要处理图片上传
          console.log('封面图片上传功能待实现');
        } catch (error) {
          console.warn('设置封面失败:', error);
        }
      }

      // 设置文章摘要
      if (article.summary) {
        try {
          await this.safeType('.abstract-input textarea', article.summary);
          await this.wait(500);
        } catch (error) {
          console.warn('设置摘要失败:', error);
        }
      }

      // 设置分类
      if (article.category) {
        try {
          await this.safeClick('.category-select');
          await this.wait(1000);
          
          // 查找匹配的分类
          const categoryOptions = await this.page!.locator('.option-item').all();
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
          for (const tag of article.tags.slice(0, 5)) { // 掘金最多5个标签
            await this.safeType('.tag-input input', tag);
            await this.page?.keyboard.press('Enter');
            await this.wait(500);
          }
        } catch (error) {
          console.warn('设置标签失败:', error);
        }
      }

      // 设置发布选项
      try {
        // 选择「稀土掘金」发布
        await this.safeClick('.platform-juejin');
        await this.wait(500);

        // 设置为原创文章
        if (article.isOriginal !== false) {
          await this.safeClick('.original-checkbox');
          await this.wait(500);
        }
      } catch (error) {
        console.warn('设置发布选项失败:', error);
      }

      // 发布文章
      if (article.publishImmediately !== false) {
        await this.safeClick('.confirm-btn');
      } else {
        await this.safeClick('.save-draft-btn');
      }
      
      await this.wait(5000);

      // 检查发布结果
      try {
        // 等待发布成功页面或跳转
        await this.page!.waitForFunction(
          () => {
            return document.querySelector('.success-tip') || 
                   window.location.href.includes('/post/');
          },
          { timeout: 20000 }
        );
        
        // 获取文章链接
        let articleUrl = '';
        if (this.page?.url().includes('/post/')) {
        articleUrl = this.page?.url() || '';
        } else {
          // 尝试从页面中获取链接
          try {
            const linkElement = await this.page!.locator('.article-link').first();
            if (await linkElement.isVisible()) {
              articleUrl = await linkElement.getAttribute('href') || '';
              if (articleUrl && !articleUrl.startsWith('http')) {
                articleUrl = `https://juejin.cn${articleUrl}`;
              }
            }
          } catch (error) {
            console.warn('获取文章链接失败:', error);
          }
        }

        await this.saveScreenshot('juejin-publish-success.png');
        
        return {
          success: true,
          platform: '掘金',
          url: articleUrl,
          message: article.publishImmediately !== false ? '文章发布成功' : '文章已保存为草稿',
        };
        
      } catch (error) {
        // 检查是否有错误提示
        const errorMsg = await this.page!.locator('.error-message').textContent();
        throw new Error(errorMsg || '发布超时或失败');
      }
      
    } catch (error) {
      console.error('掘金发布失败:', error);
      await this.saveScreenshot('juejin-publish-error.png');
      
      return {
        success: false,
        platform: '掘金',
        error: error instanceof Error ? error.message : '发布失败',
      };
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus(): Promise<boolean> {
    try {
      await this.page!.goto('https://juejin.cn');
      await this.wait(3000);
      
      // 检查是否有用户头像
      const avatar = await this.page!.locator('.avatar').isVisible();
      return avatar;
    } catch (error) {
      console.error('检查掘金登录状态失败:', error);
      return false;
    }
  }

  /**
   * 获取用户发布的文章列表
   */
  async getPublishedArticles(limit: number = 10): Promise<any[]> {
    try {
      // 进入个人主页
      await this.page!.goto('https://juejin.cn/user/center/posts');
      await this.waitForLoad();

      const articles = [];
      const articleElements = await this.page!.locator('.article-item').all();
      
      for (let i = 0; i < Math.min(articleElements.length, limit); i++) {
        const element = articleElements[i];
        
        try {
          const title = await element.locator('.title').textContent();
          const url = await element.locator('.title a').getAttribute('href');
          const publishTime = await element.locator('.time').textContent();
          const stats = await element.locator('.stats').textContent();
          
          articles.push({
            title: title?.trim(),
            url: url ? `https://juejin.cn${url}` : '',
            publishTime: publishTime?.trim(),
            stats: stats?.trim(),
          });
        } catch (error) {
          console.warn(`解析第${i + 1}篇文章信息失败:`, error);
        }
      }
      
      return articles;
    } catch (error) {
      console.error('获取掘金文章列表失败:', error);
      return [];
    }
  }

  /**
   * 更新文章
   */
  async updateArticle(articleId: string, article: ArticleData): Promise<boolean> {
    try {
      console.log(`更新掘金文章: ${articleId}`);
      // TODO: 实现文章更新逻辑
      return false;
    } catch (error) {
      console.error('更新掘金文章失败:', error);
      return false;
    }
  }

  /**
   * 删除文章
   */
  async deleteArticle(articleId: string): Promise<boolean> {
    try {
      console.log(`删除掘金文章: ${articleId}`);
      // TODO: 实现文章删除逻辑
      return false;
    } catch (error) {
      console.error('删除掘金文章失败:', error);
      return false;
    }
  }

  async publish(article: ArticleData): Promise<PublishResult> {
    return this.publishArticle(article);
  }

  /**
   * 获取文章统计数据
   */
  async getArticleStats(articleUrl: string): Promise<any> {
    try {
      await this.page!.goto(articleUrl);
      await this.waitForLoad();

      const stats = {
        views: 0,
        likes: 0,
        comments: 0,
        collects: 0,
      };

      // 获取阅读数
      try {
        const viewsText = await this.page!.locator('.view-count').textContent();
        stats.views = this.parseNumber(viewsText || '0');
      } catch (error) {
        console.warn('获取阅读数失败:', error);
      }

      // 获取点赞数
      try {
        const likesText = await this.page!.locator('.like-count').textContent();
        stats.likes = this.parseNumber(likesText || '0');
      } catch (error) {
        console.warn('获取点赞数失败:', error);
      }

      // 获取评论数
      try {
        const commentsText = await this.page!.locator('.comment-count').textContent();
        stats.comments = this.parseNumber(commentsText || '0');
      } catch (error) {
        console.warn('获取评论数失败:', error);
      }

      // 获取收藏数
      try {
        const collectsText = await this.page!.locator('.collect-count').textContent();
        stats.collects = this.parseNumber(collectsText || '0');
      } catch (error) {
        console.warn('获取收藏数失败:', error);
      }

      return stats;
    } catch (error) {
      console.error('获取掘金文章统计失败:', error);
      return null;
    }
  }

  /**
   * 解析数字（处理k、w等单位）
   */
  private parseNumber(text: string): number {
    const cleanText = text.replace(/[^0-9.kw]/gi, '');
    const num = parseFloat(cleanText);
    
    if (cleanText.includes('w')) {
      return Math.floor(num * 10000);
    } else if (cleanText.includes('k')) {
      return Math.floor(num * 1000);
    }
    
    return Math.floor(num) || 0;
  }
}

export default JuejinPublisher;