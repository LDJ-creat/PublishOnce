import { Page } from 'playwright';
import { BasePlatformPublisher, LoginCredentials, PublishResult, ArticleData } from './base';

/**
 * 微信公众号登录凭据
 */
export interface WechatCredentials extends LoginCredentials {
  username: string;
  password: string;
}

/**
 * 微信公众号发布器
 */
export class WechatPublisher extends BasePlatformPublisher {
  protected platformName = '微信公众号';
  protected baseUrl = 'https://mp.weixin.qq.com';

  /**
   * 登录微信公众号
   */
  async login(credentials: WechatCredentials): Promise<boolean> {
    try {
      console.log('开始登录微信公众号...');
      
      await this.page.goto(`${this.baseUrl}/cgi-bin/loginpage`);
      await this.waitForLoad();

      // 输入用户名
      await this.safeType('input[name="account"]', credentials.username);
      await this.wait(1000);

      // 输入密码
      await this.safeType('input[name="password"]', credentials.password);
      await this.wait(1000);

      // 点击登录按钮
      await this.safeClick('a.btn_login');
      
      // 等待可能的验证码或二维码扫描
      try {
        // 检查是否需要验证码
        const captchaInput = await this.page.waitForSelector('input[name="imgcode"]', { timeout: 3000 });
        if (captchaInput) {
          console.log('检测到验证码，需要手动输入');
          await this.saveScreenshot('wechat-captcha.png');
          
          // 等待用户手动输入验证码并点击登录
          await this.page.waitForNavigation({ timeout: 60000 });
        }
      } catch (error) {
        // 没有验证码，继续
      }

      // 检查是否需要扫码
      try {
        const qrcode = await this.page.waitForSelector('.qrcode', { timeout: 5000 });
        if (qrcode) {
          console.log('检测到二维码，需要扫码登录');
          await this.saveScreenshot('wechat-qrcode.png');
          
          // 等待扫码完成
          await this.page.waitForNavigation({ timeout: 120000 });
        }
      } catch (error) {
        // 没有二维码，继续
      }

      // 等待登录成功，检查是否跳转到主页
      await this.page.waitForURL('**/home**', { timeout: 30000 });
      
      console.log('微信公众号登录成功');
      return true;
      
    } catch (error) {
      console.error('微信公众号登录失败:', error);
      await this.saveScreenshot('wechat-login-error.png');
      return false;
    }
  }

  /**
   * 发布文章到微信公众号
   */
  async publishArticle(article: ArticleData): Promise<PublishResult> {
    try {
      console.log(`开始发布文章到微信公众号: ${article.title}`);
      
      // 进入素材管理页面
      await this.page.goto(`${this.baseUrl}/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&createType=0&token=${await this.getToken()}&lang=zh_CN`);
      await this.waitForLoad();

      // 填写标题
      await this.safeType('#title', article.title);
      await this.wait(1000);

      // 填写作者（如果有）
      if (article.author) {
        await this.safeType('#author', article.author);
        await this.wait(500);
      }

      // 处理内容编辑器
      const editorFrame = await this.page.frameLocator('#ueditor_0');
      
      // 清空编辑器内容
      await editorFrame.locator('body').click();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Delete');
      await this.wait(1000);

      // 输入文章内容
      if (article.content) {
        // 如果是Markdown格式，需要转换为富文本
        const htmlContent = this.convertMarkdownToHtml(article.content);
        await editorFrame.locator('body').fill(htmlContent);
      }
      
      await this.wait(2000);

      // 设置摘要（如果有）
      if (article.summary) {
        await this.safeClick('.js_summary');
        await this.wait(500);
        await this.safeType('textarea[name="summary"]', article.summary);
      }

      // 上传封面图片（如果有）
      if (article.coverImage) {
        try {
          await this.safeClick('.js_cover');
          await this.wait(1000);
          
          // 这里需要处理图片上传逻辑
          // 微信公众号的图片上传比较复杂，可能需要先上传到素材库
          console.log('封面图片上传功能待实现');
        } catch (error) {
          console.warn('封面图片上传失败:', error);
        }
      }

      // 设置标签（如果有）
      if (article.tags && article.tags.length > 0) {
        try {
          await this.safeClick('.js_tag');
          await this.wait(500);
          
          // 微信公众号的标签设置
          for (const tag of article.tags.slice(0, 3)) { // 最多3个标签
            await this.safeType('input.tag_input', tag);
            await this.page.keyboard.press('Enter');
            await this.wait(500);
          }
        } catch (error) {
          console.warn('标签设置失败:', error);
        }
      }

      // 保存草稿
      await this.safeClick('.js_save');
      await this.wait(3000);

      // 预览文章
      await this.safeClick('.js_preview');
      await this.wait(2000);

      // 检查预览是否成功
      const previewSuccess = await this.page.locator('.preview_success').isVisible();
      if (!previewSuccess) {
        throw new Error('文章预览失败');
      }

      // 发布文章（需要谨慎，可能需要审核）
      if (article.publishImmediately) {
        await this.safeClick('.js_send');
        await this.wait(2000);
        
        // 确认发布
        await this.safeClick('.js_confirm');
        await this.wait(5000);
        
        // 检查发布结果
        const publishSuccess = await this.page.locator('.publish_success').isVisible();
        if (publishSuccess) {
          console.log('文章发布成功');
        } else {
          console.log('文章已提交审核');
        }
      }

      // 获取文章链接（发布后才有）
      let articleUrl = '';
      try {
        const urlElement = await this.page.locator('.article_url').first();
        if (await urlElement.isVisible()) {
          articleUrl = await urlElement.textContent() || '';
        }
      } catch (error) {
        console.warn('获取文章链接失败:', error);
      }

      await this.saveScreenshot('wechat-publish-success.png');
      
      return {
        success: true,
        platform: '微信公众号',
        url: articleUrl,
        message: article.publishImmediately ? '文章发布成功' : '文章已保存为草稿',
      };
      
    } catch (error) {
      console.error('微信公众号发布失败:', error);
      await this.saveScreenshot('wechat-publish-error.png');
      
      return {
        success: false,
        platform: '微信公众号',
        error: error instanceof Error ? error.message : '发布失败',
      };
    }
  }

  /**
   * 获取访问令牌
   */
  private async getToken(): Promise<string> {
    try {
      const url = this.page.url();
      const tokenMatch = url.match(/token=([^&]+)/);
      return tokenMatch ? tokenMatch[1] : '';
    } catch (error) {
      console.warn('获取token失败:', error);
      return '';
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
   * 检查登录状态
   */
  async checkLoginStatus(): Promise<boolean> {
    try {
      await this.page.goto(`${this.baseUrl}/cgi-bin/home`);
      await this.wait(3000);
      
      // 检查是否在登录页面
      const isLoginPage = await this.page.locator('.login_form').isVisible();
      return !isLoginPage;
    } catch (error) {
      console.error('检查微信公众号登录状态失败:', error);
      return false;
    }
  }
}

export default WechatPublisher;