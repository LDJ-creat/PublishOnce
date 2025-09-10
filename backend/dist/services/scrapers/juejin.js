"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JuejinScraper = void 0;
const base_1 = require("./base");
class JuejinScraper extends base_1.BasePlatformScraper {
    constructor() {
        super('掘金', 'https://juejin.cn');
    }
    extractArticleId(url) {
        const match = url.match(/post\/(\w+)/);
        return match ? match[1] : url;
    }
    async scrapeArticleStats(articleUrl) {
        try {
            console.log(`开始抓取掘金文章统计: ${articleUrl}`);
            if (!this.page) {
                throw new Error('浏览器页面未初始化');
            }
            await this.page.goto(articleUrl);
            await this.waitForLoad();
            await this.handleAntiBot();
            const stats = {
                articleId: this.extractArticleId(articleUrl),
                platform: '掘金',
                url: articleUrl,
                views: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                collectedAt: new Date(),
            };
            try {
                const viewsElement = await this.page.locator('.article-view-count').first();
                if (await viewsElement.isVisible()) {
                    const viewsText = await viewsElement.textContent();
                    stats.views = this.parseNumber(viewsText || '0');
                }
            }
            catch (error) {
                console.warn('获取掘金阅读数失败:', error);
            }
            try {
                const likesElement = await this.page.locator('.panel-btn.like .panel-btn-text').first();
                if (await likesElement.isVisible()) {
                    const likesText = await likesElement.textContent();
                    stats.likes = this.parseNumber(likesText || '0');
                }
            }
            catch (error) {
                console.warn('获取掘金点赞数失败:', error);
            }
            try {
                const commentsElement = await this.page.locator('.panel-btn.comment .panel-btn-text').first();
                if (await commentsElement.isVisible()) {
                    const commentsText = await commentsElement.textContent();
                    stats.comments = this.parseNumber(commentsText || '0');
                }
            }
            catch (error) {
                console.warn('获取掘金评论数失败:', error);
            }
            try {
                const collectElement = await this.page.locator('.panel-btn.collect .panel-btn-text').first();
                if (await collectElement.isVisible()) {
                    const collectText = await collectElement.textContent();
                    stats.shares = this.parseNumber(collectText || '0');
                }
            }
            catch (error) {
                console.warn('获取掘金收藏数失败:', error);
            }
            console.log('掘金文章统计抓取完成:', stats);
            return {
                success: true,
                data: stats,
            };
        }
        catch (error) {
            console.error('掘金文章统计抓取失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '抓取失败',
            };
        }
    }
    async scrapeComments(articleUrl, limit = 20) {
        try {
            console.log(`开始抓取掘金文章评论: ${articleUrl}`);
            if (!this.page) {
                throw new Error('浏览器页面未初始化');
            }
            await this.page.goto(articleUrl);
            await this.waitForLoad();
            await this.handleAntiBot();
            if (this.page) {
                await this.page.locator('.comment-list-box').scrollIntoViewIfNeeded();
            }
            await this.wait(2000);
            const comments = [];
            const commentElements = this.page ? await this.page.locator('.comment-list .comment-item').all() : [];
            for (let i = 0; i < Math.min(commentElements.length, limit); i++) {
                const element = commentElements[i];
                try {
                    const comment = {
                        id: `comment_${i}`,
                        author: '',
                        content: '',
                        publishTime: new Date(),
                        likes: 0,
                        replies: [],
                        platform: '掘金',
                    };
                    const commentId = await element.getAttribute('data-comment-id');
                    comment.id = commentId || `juejin_comment_${i}`;
                    const authorElement = await element.locator('.comment-author-name').first();
                    if (await authorElement.isVisible()) {
                        comment.author = await this.safeGetText(authorElement) || '匿名用户';
                    }
                    const contentElement = await element.locator('.comment-content').first();
                    if (await contentElement.isVisible()) {
                        comment.content = await this.safeGetText(contentElement) || '';
                    }
                    const timeElement = await element.locator('.comment-time').first();
                    if (await timeElement.isVisible()) {
                        const timeText = await this.safeGetText(timeElement) || '';
                        comment.publishTime = this.parseDate(timeText) || new Date();
                    }
                    const likeElement = await element.locator('.comment-like-count').first();
                    if (await likeElement.isVisible()) {
                        const likeText = await this.safeGetText(likeElement);
                        comment.likes = this.parseNumber(likeText || '0');
                    }
                    const replyElements = await element.locator('.reply-list .reply-item').all();
                    for (const replyElement of replyElements.slice(0, 3)) {
                        try {
                            const reply = {
                                id: '',
                                author: '',
                                content: '',
                                publishTime: new Date(),
                                likes: 0,
                                replies: [],
                                platform: '掘金',
                            };
                            const replyAuthor = await this.safeGetText(await replyElement.locator('.reply-author-name').first());
                            const replyContent = await this.safeGetText(await replyElement.locator('.reply-content').first());
                            const replyTime = await this.safeGetText(await replyElement.locator('.reply-time').first());
                            reply.author = replyAuthor || '匿名用户';
                            reply.content = replyContent || '';
                            reply.publishTime = this.parseDate(replyTime || '') || new Date();
                            if (!comment.replies) {
                                comment.replies = [];
                            }
                            reply.id = `${comment.id}_reply_${comment.replies.length}`;
                            comment.replies.push(reply);
                        }
                        catch (error) {
                            console.warn('解析回复失败:', error);
                        }
                    }
                    if (comment.content) {
                        comments.push(comment);
                    }
                }
                catch (error) {
                    console.warn(`解析第${i + 1}条评论失败:`, error);
                }
            }
            console.log(`掘金评论抓取完成，共${comments.length}条`);
            return {
                success: true,
                data: comments
            };
        }
        catch (error) {
            console.error('掘金评论抓取失败:', error);
            return {
                success: false,
                data: [],
                error: error instanceof Error ? error.message : '抓取评论失败'
            };
        }
    }
    async scrapeUserProfile(userUrl) {
        try {
            console.log(`开始抓取掘金用户资料: ${userUrl}`);
            if (!this.page) {
                throw new Error('页面未初始化');
            }
            await this.page.goto(userUrl);
            await this.waitForLoad();
            await this.handleAntiBot();
            const profile = {
                platform: '掘金',
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
            try {
                const usernameElement = this.page ? await this.page.locator('.username').first() : null;
                if (usernameElement && await usernameElement.isVisible()) {
                    profile.displayName = await this.safeGetText(usernameElement) || '';
                }
            }
            catch (error) {
                console.warn('获取掘金用户名失败:', error);
            }
            try {
                const avatarElement = this.page ? await this.page.locator('.avatar img').first() : null;
                if (avatarElement && await avatarElement.isVisible()) {
                    profile.avatar = await this.safeGetAttribute(avatarElement, 'src') || '';
                }
            }
            catch (error) {
                console.warn('获取掘金头像失败:', error);
            }
            try {
                const bioElement = this.page ? await this.page.locator('.user-info-block .description').first() : null;
                if (bioElement && await bioElement.isVisible()) {
                    profile.bio = await this.safeGetText(bioElement) || '';
                }
            }
            catch (error) {
                console.warn('获取掘金个人简介失败:', error);
            }
            try {
                const statsElements = this.page ? await this.page.locator('.stat-item').all() : [];
                for (const element of statsElements) {
                    const label = await this.safeGetText(await element.locator('.stat-label').first());
                    const value = await this.safeGetText(await element.locator('.stat-value').first());
                    if (label && value) {
                        const num = this.parseNumber(value);
                        if (label.includes('关注者')) {
                            profile.followers = num;
                        }
                        else if (label.includes('正在关注')) {
                            profile.following = num;
                        }
                        else if (label.includes('文章')) {
                            profile.articles = num;
                        }
                        else if (label.includes('获得点赞')) {
                            profile.totalLikes = num;
                        }
                        else if (label.includes('文章被阅读')) {
                            profile.totalViews = num;
                        }
                    }
                }
            }
            catch (error) {
                console.warn('获取掘金统计数据失败:', error);
            }
            try {
                const levelElement = this.page ? await this.page.locator('.level-info .level-name').first() : null;
                if (levelElement && await levelElement.isVisible()) {
                    profile.level = await this.safeGetText(levelElement) || '';
                }
            }
            catch (error) {
                console.warn('获取掘金等级失败:', error);
            }
            try {
                const joinElement = this.page ? await this.page.locator('.join-date').first() : null;
                if (joinElement && await joinElement.isVisible()) {
                    profile.joinDate = await this.safeGetText(joinElement) || '';
                }
            }
            catch (error) {
                console.warn('获取掘金加入时间失败:', error);
            }
            console.log('掘金用户资料抓取完成:', profile);
            return {
                success: true,
                data: profile,
            };
        }
        catch (error) {
            console.error('掘金用户资料抓取失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '抓取失败',
            };
        }
    }
    async handleAntiBot() {
        try {
            const captchaExists = this.page ? await this.page.locator('.captcha-box').isVisible() : false;
            if (captchaExists) {
                console.log('检测到掘金验证码，等待处理...');
                await this.wait(5000);
                if (this.page) {
                    await this.page.reload();
                }
                await this.waitForLoad();
                return true;
            }
            const loginPopup = this.page ? await this.page.locator('.login-popup').isVisible() : false;
            if (loginPopup) {
                console.log('检测到登录提示，关闭弹窗');
                try {
                    if (this.page) {
                        await this.page.locator('.login-popup .close-btn').click();
                    }
                    await this.wait(1000);
                }
                catch (error) {
                }
            }
            await this.applyRateLimit();
            return false;
        }
        catch (error) {
            console.warn('处理掘金反爬虫检测时出错:', error);
            return false;
        }
    }
    async getHotArticles(limit = 10) {
        try {
            console.log('开始抓取掘金热门文章列表');
            if (!this.page) {
                throw new Error('页面未初始化');
            }
            await this.page.goto('https://juejin.cn/recommended');
            await this.waitForLoad();
            const articles = [];
            const articleElements = await this.page.locator('.entry-list .item').all();
            for (let i = 0; i < Math.min(articleElements.length, limit); i++) {
                const element = articleElements[i];
                try {
                    const titleElement = await element.locator('.title').first();
                    const title = await this.safeGetText(titleElement);
                    const urlElement = await element.locator('.title a').first();
                    const url = await this.safeGetAttribute(urlElement, 'href');
                    const authorElement = await element.locator('.username').first();
                    const author = await this.safeGetText(authorElement);
                    const timeElement = await element.locator('.time').first();
                    const publishTime = await this.safeGetText(timeElement);
                    const likesElement = await element.locator('.like-count').first();
                    const likes = await this.safeGetText(likesElement);
                    const commentsElement = await element.locator('.comment-count').first();
                    const comments = await this.safeGetText(commentsElement);
                    articles.push({
                        title: title?.trim(),
                        url: url ? `https://juejin.cn${url}` : '',
                        author: author?.trim(),
                        publishTime: publishTime?.trim(),
                        likes: this.parseNumber(likes || '0'),
                        comments: this.parseNumber(comments || '0'),
                    });
                }
                catch (error) {
                    console.warn(`解析第${i + 1}篇文章信息失败:`, error);
                }
            }
            console.log(`掘金热门文章抓取完成，共${articles.length}篇`);
            return {
                success: true,
                data: articles,
            };
        }
        catch (error) {
            console.error('掘金热门文章抓取失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '抓取失败',
            };
        }
    }
}
exports.JuejinScraper = JuejinScraper;
exports.default = JuejinScraper;
//# sourceMappingURL=juejin.js.map