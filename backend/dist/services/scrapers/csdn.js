"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSDNScraper = void 0;
const base_1 = require("./base");
class CSDNScraper extends base_1.BasePlatformScraper {
    constructor() {
        super('CSDN', 'https://blog.csdn.net');
    }
    extractArticleId(url) {
        const match = url.match(/article\/details\/(\d+)/);
        return match ? match[1] : url;
    }
    async scrapeArticleStats(articleUrl) {
        try {
            console.log(`开始抓取CSDN文章统计: ${articleUrl}`);
            if (!this.page) {
                throw new Error('页面未初始化');
            }
            await this.page.goto(articleUrl);
            await this.waitForLoad();
            await this.handleAntiBot();
            const stats = {
                articleId: this.extractArticleId(articleUrl),
                platform: 'CSDN',
                url: articleUrl,
                views: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                collectedAt: new Date(),
            };
            try {
                const viewsElement = await this.page.locator('.read-count').first();
                if (await viewsElement.isVisible()) {
                    const viewsText = await viewsElement.textContent();
                    stats.views = this.parseNumber(viewsText || '0');
                }
            }
            catch (error) {
                console.warn('获取CSDN阅读数失败:', error);
            }
            try {
                const likesElement = await this.page.locator('.btn-like .count').first();
                if (await likesElement.isVisible()) {
                    const likesText = await likesElement.textContent();
                    stats.likes = this.parseNumber(likesText || '0');
                }
            }
            catch (error) {
                console.warn('获取CSDN点赞数失败:', error);
            }
            try {
                const commentsElement = await this.page.locator('.comment-list-container .total-comment').first();
                if (await commentsElement.isVisible()) {
                    const commentsText = await commentsElement.textContent();
                    stats.comments = this.parseNumber(commentsText || '0');
                }
            }
            catch (error) {
                console.warn('获取CSDN评论数失败:', error);
            }
            try {
                const sharesElement = await this.page.locator('.btn-collect .count').first();
                if (await sharesElement.isVisible()) {
                    const sharesText = await sharesElement.textContent();
                    stats.shares = this.parseNumber(sharesText || '0');
                }
            }
            catch (error) {
                console.warn('获取CSDN收藏数失败:', error);
            }
            console.log('CSDN文章统计抓取完成:', stats);
            return {
                success: true,
                data: stats,
            };
        }
        catch (error) {
            console.error('CSDN文章统计抓取失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '抓取失败',
            };
        }
    }
    async scrapeComments(articleUrl, limit = 20) {
        try {
            console.log(`开始抓取CSDN文章评论: ${articleUrl}`);
            if (!this.page) {
                throw new Error('浏览器页面未初始化');
            }
            await this.page.goto(articleUrl);
            await this.waitForLoad();
            await this.handleAntiBot();
            if (this.page) {
                await this.page.locator('.comment-list-container').scrollIntoViewIfNeeded();
            }
            await this.wait(2000);
            const comments = [];
            const commentElements = this.page ? await this.page.locator('.comment-list .comment-line').all() : [];
            for (let i = 0; i < Math.min(commentElements.length, limit); i++) {
                const element = commentElements[i];
                try {
                    const comment = {
                        id: '',
                        author: '',
                        content: '',
                        publishTime: new Date(),
                        likes: 0,
                        replies: [],
                        platform: 'CSDN',
                    };
                    const commentId = await element.getAttribute('data-comment-id');
                    comment.id = commentId || `csdn_comment_${i}`;
                    const authorElement = await element.locator('.comment-username').first();
                    if (await authorElement.isVisible()) {
                        comment.author = await this.safeGetText(authorElement) || '匿名用户';
                    }
                    const contentElement = await element.locator('.comment-detail').first();
                    if (await contentElement.isVisible()) {
                        comment.content = await this.safeGetText(contentElement) || '';
                    }
                    const timeElement = await element.locator('.comment-time').first();
                    if (await timeElement.isVisible()) {
                        const timeText = await this.safeGetText(timeElement);
                        comment.publishTime = this.parseDate(timeText || '') || new Date();
                    }
                    const likeElement = await element.locator('.comment-like .count').first();
                    if (await likeElement.isVisible()) {
                        const likeText = await this.safeGetText(likeElement);
                        comment.likes = this.parseNumber(likeText || '0');
                    }
                    const replyElements = await element.locator('.comment-reply .reply-item').all();
                    for (const replyElement of replyElements.slice(0, 3)) {
                        try {
                            const reply = {
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
            console.log(`CSDN评论抓取完成，共${comments.length}条`);
            return {
                success: true,
                data: comments,
            };
        }
        catch (error) {
            console.error('CSDN评论抓取失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '抓取失败',
            };
        }
    }
    async scrapeUserProfile(userUrl) {
        try {
            console.log(`开始抓取CSDN用户资料: ${userUrl}`);
            if (!this.page) {
                throw new Error('页面未初始化');
            }
            await this.page.goto(userUrl);
            await this.waitForLoad();
            await this.handleAntiBot();
            const profile = {
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
            try {
                const usernameElement = await this.page.locator('.user-profile-head .username').first();
                if (await usernameElement.isVisible()) {
                    profile.displayName = await this.safeGetText(usernameElement) || '';
                }
            }
            catch (error) {
                console.warn('获取CSDN用户名失败:', error);
            }
            try {
                const avatarElement = await this.page.locator('.user-profile-head .avatar img').first();
                if (await avatarElement.isVisible()) {
                    profile.avatar = await this.safeGetAttribute(avatarElement, 'src') || '';
                }
            }
            catch (error) {
                console.warn('获取CSDN头像失败:', error);
            }
            try {
                const bioElement = await this.page.locator('.user-profile-head .user-desc').first();
                if (await bioElement.isVisible()) {
                    profile.bio = await this.safeGetText(bioElement) || '';
                }
            }
            catch (error) {
                console.warn('获取CSDN个人简介失败:', error);
            }
            try {
                const statsElements = await this.page.locator('.user-profile-statistics .item').all();
                for (const element of statsElements) {
                    const label = await this.safeGetText(await element.locator('.label').first());
                    const value = await this.safeGetText(await element.locator('.num').first());
                    if (label && value) {
                        const num = this.parseNumber(value);
                        if (label.includes('粉丝')) {
                            profile.followers = num;
                        }
                        else if (label.includes('关注')) {
                            profile.following = num;
                        }
                        else if (label.includes('文章')) {
                            profile.articles = num;
                        }
                        else if (label.includes('访问')) {
                            profile.totalViews = num;
                        }
                    }
                }
            }
            catch (error) {
                console.warn('获取CSDN统计数据失败:', error);
            }
            try {
                const levelElement = await this.page.locator('.user-profile-head .level').first();
                if (await levelElement.isVisible()) {
                    profile.level = await this.safeGetText(levelElement) || '';
                }
            }
            catch (error) {
                console.warn('获取CSDN等级失败:', error);
            }
            console.log('CSDN用户资料抓取完成:', profile);
            return {
                success: true,
                data: profile,
            };
        }
        catch (error) {
            console.error('CSDN用户资料抓取失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '抓取失败',
            };
        }
    }
    async handleAntiBot() {
        try {
            const captchaExists = this.page ? await this.page.locator('.captcha-container').isVisible() : false;
            if (captchaExists) {
                console.log('检测到CSDN验证码，等待处理...');
                await this.wait(5000);
                if (this.page) {
                    await this.page.reload();
                    await this.waitForLoad();
                }
            }
            if (this.page && this.page.url().includes('passport.csdn.net')) {
                throw new Error('需要登录才能访问该页面');
            }
            await this.applyRateLimit();
            return true;
        }
        catch (error) {
            console.warn('处理CSDN反爬虫检测时出错:', error);
            return false;
        }
    }
}
exports.CSDNScraper = CSDNScraper;
exports.default = CSDNScraper;
//# sourceMappingURL=csdn.js.map