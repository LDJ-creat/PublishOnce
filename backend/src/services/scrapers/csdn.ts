import { Page } from 'playwright';
import { BasePlatformScraper, ArticleStats, Comment, UserProfile, ScrapeResult } from './base';

/**
 * CSDN抓取器
 */
export class CSDNScraper extends BasePlatformScraper {
  constructor() {
    super('CSDN', 'https://blog.csdn.net');
  }

  /**
   * 从URL中提取文章ID
   */
  private extractArticleId(url: string): string {
    const match = url.match(/article\/details\/(\d+)/);
    return match ? match[1] : url;
  }

  /**
   * 抓取文章统计数据
   */
  async scrapeArticleStats(articleUrl: string): Promise<ScrapeResult<ArticleStats>> {
    try {
      console.log(`开始抓取CSDN文章统计: ${articleUrl}`);
      
      if (!this.page) {
          throw new Error('页面未初始化');
        }
      await this.page.goto(articleUrl);
      await this.waitForLoad();
      
      // 处理可能的反爬虫检测
      await this.handleAntiBot();
      
      const stats: ArticleStats = {
        articleId: this.extractArticleId(articleUrl),
        platform: 'CSDN',
        url: articleUrl,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        collectedAt: new Date(),
      };

      // 获取阅读数
      try {
        const viewsElement = await this.page.locator('.read-count').first();
        if (await viewsElement.isVisible()) {
          const viewsText = await viewsElement.textContent();
          stats.views = this.parseNumber(viewsText || '0');
        }
      } catch (error) {
        console.warn('获取CSDN阅读数失败:', error);
      }

      // 获取点赞数
      try {
        const likesElement = await this.page.locator('.btn-like .count').first();
        if (await likesElement.isVisible()) {
          const likesText = await likesElement.textContent();
          stats.likes = this.parseNumber(likesText || '0');
        }
      } catch (error) {
        console.warn('获取CSDN点赞数失败:', error);
      }

      // 获取评论数
      try {
        const commentsElement = await this.page.locator('.comment-list-container .total-comment').first();
        if (await commentsElement.isVisible()) {
          const commentsText = await commentsElement.textContent();
          stats.comments = this.parseNumber(commentsText || '0');
        }
      } catch (error) {
        console.warn('获取CSDN评论数失败:', error);
      }

      // 获取收藏数（分享数）
      try {
        const sharesElement = await this.page.locator('.btn-collect .count').first();
        if (await sharesElement.isVisible()) {
          const sharesText = await sharesElement.textContent();
          stats.shares = this.parseNumber(sharesText || '0');
        }
      } catch (error) {
        console.warn('获取CSDN收藏数失败:', error);
      }

      console.log('CSDN文章统计抓取完成:', stats);
      
      return {
        success: true,
        data: stats,
      };
      
    } catch (error) {
      console.error('CSDN文章统计抓取失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '抓取失败',
      };
    }
  }

  /**
   * 抓取文章评论
   */
  async scrapeComments(articleUrl: string, limit: number = 20): Promise<ScrapeResult<Comment[]>> {
    try {
      console.log(`开始抓取CSDN文章评论: ${articleUrl}`);
      
      if (!this.page) {
        throw new Error('浏览器页面未初始化');
      }
      await this.page.goto(articleUrl);
      await this.waitForLoad();
      
      // 处理反爬虫检测
      await this.handleAntiBot();
      
      // 滚动到评论区
      if (this.page) {
        await this.page.locator('.comment-list-container').scrollIntoViewIfNeeded();
      }
      await this.wait(2000);

      const comments: Comment[] = [];
      
      // 获取评论列表
      const commentElements = this.page ? await this.page.locator('.comment-list .comment-line').all() : [];
      
      for (let i = 0; i < Math.min(commentElements.length, limit); i++) {
        const element = commentElements[i];
        
        try {
          const comment: Comment = {
            id: '',
            author: '',
            content: '',
            publishTime: new Date(),
            likes: 0,
            replies: [],
            platform: 'CSDN',
          };

          // 获取评论ID
          const commentId = await element.getAttribute('data-comment-id');
          comment.id = commentId || `csdn_comment_${i}`;

          // 获取作者信息
          const authorElement = await element.locator('.comment-username').first();
          if (await authorElement.isVisible()) {
            comment.author = await this.safeGetText(authorElement) || '匿名用户';
          }

          // 获取评论内容
          const contentElement = await element.locator('.comment-detail').first();
          if (await contentElement.isVisible()) {
            comment.content = await this.safeGetText(contentElement) || '';
          }

          // 获取发布时间
          const timeElement = await element.locator('.comment-time').first();
          if (await timeElement.isVisible()) {
            const timeText = await this.safeGetText(timeElement);
            comment.publishTime = this.parseDate(timeText || '') || new Date();
          }

          // 获取点赞数
          const likeElement = await element.locator('.comment-like .count').first();
          if (await likeElement.isVisible()) {
            const likeText = await this.safeGetText(likeElement);
            comment.likes = this.parseNumber(likeText || '0');
          }

          // 获取回复（如果有）
          const replyElements = await element.locator('.comment-reply .reply-item').all();
          for (const replyElement of replyElements.slice(0, 3)) { // 最多3个回复
            try {
              const reply: Comment = {
                id: '',
                author: '',
                content: '',
                publishTime: new Date(),
                likes: 0,
                replies: [],
                platform: 'CSDN',
              };

              const replyAuthor = await this.safeGetText(await replyElement.locator('.reply-username').first());
              const replyContent = await this.safeGetText(await replyElement.locator('.reply-content').first());
              const replyTime = await this.safeGetText(await replyElement.locator('.reply-time').first());

              reply.author = replyAuthor || '匿名用户';
              reply.content = replyContent || '';
              reply.publishTime = this.parseDate(replyTime || '') || new Date();
              reply.id = `${comment.id}_reply_${comment.replies?.length || 0}`;

              if (!comment.replies) {
                comment.replies = [];
              }
              comment.replies.push(reply);
            } catch (error) {
              console.warn('解析回复失败:', error);
            }
          }

          if (comment.content) {
            comments.push(comment);
          }
        } catch (error) {
          console.warn(`解析第${i + 1}条评论失败:`, error);
        }
      }

      console.log(`CSDN评论抓取完成，共${comments.length}条`);
      
      return {
        success: true,
        data: comments,
      };
      
    } catch (error) {
      console.error('CSDN评论抓取失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '抓取失败',
      };
    }
  }

  /**
   * 抓取用户资料
   */
  async scrapeUserProfile(userUrl: string): Promise<ScrapeResult<UserProfile>> {
    try {
      console.log(`开始抓取CSDN用户资料: ${userUrl}`);
      
      if (!this.page) {
        throw new Error('页面未初始化');
      }
      await this.page.goto(userUrl);
      await this.waitForLoad();
      
      // 处理反爬虫检测
      await this.handleAntiBot();
      
      const profile: UserProfile = {
        platform: 'CSDN',
        username: '',
        displayName: '',
        avatar: '',
        bio: '',
        followers: 0,
        following: 0,
        articles: 0,
        totalViews: 0,
        totalLikes: 0,
        level: '',
        joinDate: '',
        url: userUrl,
      };

      // 获取用户名
      try {
        const usernameElement = await this.page.locator('.user-profile-head .username').first();
        if (await usernameElement.isVisible()) {
          profile.displayName = await this.safeGetText(usernameElement) || '';
        }
      } catch (error) {
        console.warn('获取CSDN用户名失败:', error);
      }

      // 获取头像
      try {
        const avatarElement = await this.page.locator('.user-profile-head .avatar img').first();
        if (await avatarElement.isVisible()) {
          profile.avatar = await this.safeGetAttribute(avatarElement, 'src') || '';
        }
      } catch (error) {
        console.warn('获取CSDN头像失败:', error);
      }

      // 获取个人简介
      try {
        const bioElement = await this.page.locator('.user-profile-head .user-desc').first();
        if (await bioElement.isVisible()) {
          profile.bio = await this.safeGetText(bioElement) || '';
        }
      } catch (error) {
        console.warn('获取CSDN个人简介失败:', error);
      }

      // 获取统计数据
      try {
        const statsElements = await this.page.locator('.user-profile-statistics .item').all();
        for (const element of statsElements) {
          const label = await this.safeGetText(await element.locator('.label').first());
          const value = await this.safeGetText(await element.locator('.num').first());
          
          if (label && value) {
            const num = this.parseNumber(value);
            if (label.includes('粉丝')) {
              profile.followers = num;
            } else if (label.includes('关注')) {
              profile.following = num;
            } else if (label.includes('文章')) {
              profile.articles = num;
            } else if (label.includes('访问')) {
              profile.totalViews = num;
            }
          }
        }
      } catch (error) {
        console.warn('获取CSDN统计数据失败:', error);
      }

      // 获取等级信息
      try {
        const levelElement = await this.page.locator('.user-profile-head .level').first();
        if (await levelElement.isVisible()) {
          profile.level = await this.safeGetText(levelElement) || '';
        }
      } catch (error) {
        console.warn('获取CSDN等级失败:', error);
      }

      console.log('CSDN用户资料抓取完成:', profile);
      
      return {
        success: true,
        data: profile,
      };
      
    } catch (error) {
      console.error('CSDN用户资料抓取失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '抓取失败',
      };
    }
  }

  /**
   * 处理CSDN反爬虫检测
   */
  protected async handleAntiBot(): Promise<boolean> {
    try {
      // 检查是否有验证码或反爬虫页面
      const captchaExists = this.page ? await this.page.locator('.captcha-container').isVisible() : false;
      if (captchaExists) {
        console.log('检测到CSDN验证码，等待处理...');
        await this.wait(5000);
        
        // 尝试刷新页面
        if (this.page) {
          await this.page.reload();
          await this.waitForLoad();
        }
      }

      // 检查是否被重定向到登录页面
      if (this.page && this.page.url().includes('passport.csdn.net')) {
        throw new Error('需要登录才能访问该页面');
      }

      // 随机等待，模拟人类行为
      await this.applyRateLimit();
      
      return true;
    } catch (error) {
      console.warn('处理CSDN反爬虫检测时出错:', error);
      return false;
    }
  }
}

export default CSDNScraper;