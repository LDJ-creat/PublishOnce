import { Page } from 'playwright';
import { BasePlatformScraper, ArticleStats, Comment, UserProfile, ScrapeResult } from './base';

/**
 * 华为开发者社区抓取器
 */
export class HuaweiScraper extends BasePlatformScraper {
  constructor() {
    super('华为开发者社区', 'https://developer.huawei.com');
  }

  /**
   * 从URL中提取文章ID
   */
  private extractArticleId(url: string): string {
    const match = url.match(/\/([^/]+)\/?$/);
    return match ? match[1] : url;
  }

  /**
   * 抓取文章统计数据
   */
  async scrapeArticleStats(articleUrl: string): Promise<ScrapeResult<ArticleStats>> {
    try {
      console.log(`开始抓取华为开发者社区文章统计: ${articleUrl}`);
      
      if (!this.page) {
        throw new Error('页面未初始化');
      }
      
      await this.page.goto(articleUrl);
      await this.waitForLoad();
      
      // 处理可能的反爬虫检测
      await this.handleAntiBot();
      
      const stats: ArticleStats = {
        articleId: this.extractArticleId(articleUrl),
        platform: '华为开发者社区',
        url: articleUrl,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        collectedAt: new Date(),
      };

      // 获取阅读数
      try {
        const viewsElement = await this.page.locator('.article-info .view-count').first();
        if (await viewsElement.isVisible()) {
          const viewsText = await viewsElement.textContent();
          stats.views = this.parseNumber(viewsText || '0');
        }
      } catch (error) {
        console.warn('获取华为开发者社区阅读数失败:', error);
      }

      // 获取点赞数
      try {
        const likesElement = await this.page.locator('.article-actions .like-btn .count').first();
        if (await likesElement.isVisible()) {
          const likesText = await likesElement.textContent();
          stats.likes = this.parseNumber(likesText || '0');
        }
      } catch (error) {
        console.warn('获取华为开发者社区点赞数失败:', error);
      }

      // 获取评论数
      try {
        const commentsElement = await this.page.locator('.article-actions .comment-btn .count').first();
        if (await commentsElement.isVisible()) {
          const commentsText = await commentsElement.textContent();
          stats.comments = this.parseNumber(commentsText || '0');
        }
      } catch (error) {
        console.warn('获取华为开发者社区评论数失败:', error);
      }

      // 获取收藏数
      try {
        const collectElement = await this.page.locator('.article-actions .collect-btn .count').first();
        if (await collectElement.isVisible()) {
          const collectText = await collectElement.textContent();
          stats.shares = this.parseNumber(collectText || '0');
        }
      } catch (error) {
        console.warn('获取华为开发者社区收藏数失败:', error);
      }

      console.log('华为开发者社区文章统计抓取完成:', stats);
      
      return {
        success: true,
        data: stats,
      };
      
    } catch (error) {
      console.error('华为开发者社区文章统计抓取失败:', error);
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
      console.log(`开始抓取华为开发者社区文章评论: ${articleUrl}`);
      
      if (!this.page) {
        throw new Error('页面未初始化');
      }
      
      await this.page.goto(articleUrl);
      await this.waitForLoad();
      
      // 处理反爬虫检测
      await this.handleAntiBot();
      
      // 滚动到评论区
      await this.page.locator('.comment-section').scrollIntoViewIfNeeded();
      await this.wait(2000);

      const comments: Comment[] = [];
      
      // 获取评论列表
      const commentElements = await this.page.locator('.comment-list .comment-item').all();
      
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
            platform: '华为开发者社区',
          };

          // 获取评论ID
          const commentId = await element.getAttribute('data-id');
          comment.id = commentId || `huawei_comment_${i}`;

          // 获取作者信息
          const authorElement = await element.locator('.comment-author .author-name').first();
          if (await authorElement.isVisible()) {
            comment.author = await this.safeGetText(authorElement) || '匿名用户';
          }

          // 获取评论内容
          const contentElement = await element.locator('.comment-content .content-text').first();
          if (await contentElement.isVisible()) {
            comment.content = await this.safeGetText(contentElement) || '';
          }

          // 获取发布时间
          const timeElement = await element.locator('.comment-meta .publish-time').first();
          if (await timeElement.isVisible()) {
            const timeText = await this.safeGetText(timeElement);
            comment.publishTime = this.parseDate(timeText || '') || new Date();
          }

          // 获取点赞数
          const likeElement = await element.locator('.comment-actions .like-count').first();
          if (await likeElement.isVisible()) {
            const likeText = await this.safeGetText(likeElement);
            comment.likes = this.parseNumber(likeText || '0');
          }

          // 获取回复（如果有）
          const replyElements = await element.locator('.reply-list .reply-item').all();
          for (const replyElement of replyElements.slice(0, 3)) { // 最多3个回复
            try {
              const reply: Comment = {
                id: '',
                author: '',
                content: '',
                publishTime: new Date(),
                likes: 0,
                replies: [],
                platform: '华为开发者社区',
              };

              const replyAuthor = await this.safeGetText(await replyElement.locator('.reply-author').first());
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

      console.log(`华为开发者社区评论抓取完成，共${comments.length}条`);
      
      return {
        success: true,
        data: comments,
      };
      
    } catch (error) {
      console.error('华为开发者社区评论抓取失败:', error);
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
      console.log(`开始抓取华为开发者社区用户资料: ${userUrl}`);
      
      if (!this.page) {
        throw new Error('页面未初始化');
      }
      
      await this.page.goto(userUrl);
      await this.waitForLoad();
      
      // 处理反爬虫检测
      await this.handleAntiBot();
      
      const profile: UserProfile = {
        platform: '华为开发者社区',
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
        const usernameElement = await this.page.locator('.user-info .username').first();
        if (await usernameElement.isVisible()) {
          profile.displayName = await this.safeGetText(usernameElement) || '';
        }
      } catch (error) {
        console.warn('获取华为开发者社区用户名失败:', error);
      }

      // 获取头像
      try {
        const avatarElement = await this.page.locator('.user-avatar img').first();
        if (await avatarElement.isVisible()) {
          profile.avatar = await this.safeGetAttribute(avatarElement, 'src') || '';
        }
      } catch (error) {
        console.warn('获取华为开发者社区头像失败:', error);
      }

      // 获取个人简介
      try {
        const bioElement = await this.page.locator('.user-info .user-bio').first();
        if (await bioElement.isVisible()) {
          profile.bio = await this.safeGetText(bioElement) || '';
        }
      } catch (error) {
        console.warn('获取华为开发者社区个人简介失败:', error);
      }

      // 获取统计数据
      try {
        const statsElements = await this.page.locator('.user-stats .stat-item').all();
        for (const element of statsElements) {
          const label = await this.safeGetText(await element.locator('.stat-label').first());
          const value = await this.safeGetText(await element.locator('.stat-value').first());
          
          if (label && value) {
            const num = this.parseNumber(value);
            if (label.includes('粉丝') || label.includes('关注者')) {
              profile.followers = num;
            } else if (label.includes('关注')) {
              profile.following = num;
            } else if (label.includes('文章') || label.includes('博客')) {
              profile.articles = num;
            } else if (label.includes('点赞')) {
              profile.totalLikes = num;
            } else if (label.includes('阅读') || label.includes('浏览')) {
              profile.totalViews = num;
            }
          }
        }
      } catch (error) {
        console.warn('获取华为开发者社区统计数据失败:', error);
      }

      // 获取等级信息
      try {
        const levelElement = await this.page.locator('.user-level .level-name').first();
        if (await levelElement.isVisible()) {
          profile.level = await this.safeGetText(levelElement) || '';
        }
      } catch (error) {
        console.warn('获取华为开发者社区等级失败:', error);
      }

      // 获取加入时间
      try {
        const joinElement = await this.page.locator('.user-info .join-time').first();
        if (await joinElement.isVisible()) {
          profile.joinDate = await this.safeGetText(joinElement) || '';
        }
      } catch (error) {
        console.warn('获取华为开发者社区加入时间失败:', error);
      }

      console.log('华为开发者社区用户资料抓取完成:', profile);
      
      return {
        success: true,
        data: profile,
      };
      
    } catch (error) {
      console.error('华为开发者社区用户资料抓取失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '抓取失败',
      };
    }
  }

  /**
   * 处理华为开发者社区反爬虫检测
   */
  protected async handleAntiBot(): Promise<boolean> {
    try {
      // 检查是否有验证码或反爬虫页面
      if (this.page) {
        const captchaExists = await this.page.locator('.captcha-container').isVisible();
        if (captchaExists) {
          console.log('检测到华为开发者社区验证码，等待处理...');
          await this.wait(5000);
          
          // 尝试刷新页面
          await this.page.reload();
          await this.waitForLoad();
        }

        // 检查是否有登录提示
         const loginPrompt = await this.page.locator('.login-modal').isVisible();
         if (loginPrompt) {
           console.log('检测到登录提示，关闭弹窗');
           try {
             await this.page.locator('.login-modal .close-btn').click();
             await this.wait(1000);
           } catch (error) {
             // 忽略关闭失败
           }
         }
      }

      // 检查是否有Cookie同意弹窗
      if (this.page) {
        const cookieConsent = await this.page.locator('.cookie-consent').isVisible();
        if (cookieConsent) {
          console.log('检测到Cookie同意弹窗，点击同意');
          try {
            await this.page.locator('.cookie-consent .accept-btn').click();
            await this.wait(1000);
          } catch (error) {
            // 忽略点击失败
          }
        }
      }

      // 随机等待，模拟人类行为
      await this.applyRateLimit();
      
      return true;
    } catch (error) {
      console.warn('处理华为开发者社区反爬虫检测时出错:', error);
      return false;
    }
  }

  /**
   * 获取热门文章列表
   */
  async getHotArticles(limit: number = 10): Promise<ScrapeResult<any[]>> {
    try {
      console.log('开始抓取华为开发者社区热门文章列表');
      
      if (!this.page) {
        throw new Error('页面未初始化');
      }
      
      await this.page.goto('https://developer.huawei.com/consumer/cn/forum/home');
      await this.waitForLoad();
      
      const articles = [];
      const articleElements = await this.page.locator('.article-list .article-item').all();
      
      for (let i = 0; i < Math.min(articleElements.length, limit); i++) {
        const element = articleElements[i];
        
        try {
          const title = await this.safeGetText(await element.locator('.article-title').first());
          const url = await this.safeGetAttribute(await element.locator('.article-title a').first(), 'href');
          const author = await this.safeGetText(await element.locator('.article-author').first());
          const publishTime = await this.safeGetText(await element.locator('.publish-time').first());
          const views = await this.safeGetText(await element.locator('.view-count').first());
          const likes = await this.safeGetText(await element.locator('.like-count').first());
          const comments = await this.safeGetText(await element.locator('.comment-count').first());
          
          articles.push({
            title: title?.trim(),
            url: url ? (url.startsWith('http') ? url : `https://developer.huawei.com${url}`) : '',
            author: author?.trim(),
            publishTime: publishTime?.trim(),
            views: this.parseNumber(views || '0'),
            likes: this.parseNumber(likes || '0'),
            comments: this.parseNumber(comments || '0'),
          });
        } catch (error) {
          console.warn(`解析第${i + 1}篇文章信息失败:`, error);
        }
      }
      
      console.log(`华为开发者社区热门文章抓取完成，共${articles.length}篇`);
      
      return {
        success: true,
        data: articles,
      };
      
    } catch (error) {
      console.error('华为开发者社区热门文章抓取失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '抓取失败',
      };
    }
  }

  /**
   * 获取技术分类文章
   */
  async getArticlesByCategory(category: string, limit: number = 10): Promise<ScrapeResult<any[]>> {
    try {
      console.log(`开始抓取华为开发者社区${category}分类文章`);
      
      if (!this.page) {
        throw new Error('页面未初始化');
      }
      
      // 根据分类构建URL
      const categoryUrl = `https://developer.huawei.com/consumer/cn/forum/topic/${encodeURIComponent(category)}`;
      await this.page.goto(categoryUrl);
      await this.waitForLoad();
      
      const articles = [];
      const articleElements = await this.page.locator('.topic-list .topic-item').all();
      
      for (let i = 0; i < Math.min(articleElements.length, limit); i++) {
        const element = articleElements[i];
        
        try {
          const title = await this.safeGetText(await element.locator('.topic-title').first());
          const url = await this.safeGetAttribute(await element.locator('.topic-title a').first(), 'href');
          const author = await this.safeGetText(await element.locator('.topic-author').first());
          const publishTime = await this.safeGetText(await element.locator('.publish-time').first());
          const replies = await this.safeGetText(await element.locator('.reply-count').first());
          const views = await this.safeGetText(await element.locator('.view-count').first());
          
          articles.push({
            title: title?.trim(),
            url: url ? (url.startsWith('http') ? url : `https://developer.huawei.com${url}`) : '',
            author: author?.trim(),
            publishTime: publishTime?.trim(),
            category: category,
            replies: this.parseNumber(replies || '0'),
            views: this.parseNumber(views || '0'),
          });
        } catch (error) {
          console.warn(`解析第${i + 1}篇文章信息失败:`, error);
        }
      }
      
      console.log(`华为开发者社区${category}分类文章抓取完成，共${articles.length}篇`);
      
      return {
        success: true,
        data: articles,
      };
      
    } catch (error) {
      console.error(`华为开发者社区${category}分类文章抓取失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '抓取失败',
      };
    }
  }
}

export default HuaweiScraper;