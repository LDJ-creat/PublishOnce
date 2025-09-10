"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JuejinPublisher = void 0;
const base_1 = require("./base");
class JuejinPublisher extends base_1.BasePlatformPublisher {
    constructor() {
        super(...arguments);
        this.platformName = '掘金';
        this.baseUrl = 'https://juejin.cn';
    }
    async login(credentials) {
        try {
            console.log('开始登录掘金...');
            await this.page.goto('https://juejin.cn/login');
            await this.waitForLoad();
            if (credentials.phone && credentials.password) {
                try {
                    await this.safeClick('.clickable');
                    await this.wait(1000);
                    await this.safeType('input[name="loginPhoneOrEmail"]', credentials.phone);
                    await this.wait(1000);
                    await this.safeType('input[name="loginPassword"]', credentials.password);
                    await this.wait(1000);
                    await this.safeClick('.btn');
                    await this.wait(3000);
                }
                catch (error) {
                    console.log('手机号登录失败，尝试扫码登录');
                }
            }
            const qrcode = await this.page.locator('.qrcode-img').isVisible();
            if (qrcode) {
                console.log('请扫描二维码登录掘金');
                await this.saveScreenshot('juejin-qrcode.png');
                await this.page.waitForURL('**/juejin.cn/**', { timeout: 120000 });
            }
            await this.page.waitForSelector('.avatar', { timeout: 10000 });
            console.log('掘金登录成功');
            return true;
        }
        catch (error) {
            console.error('掘金登录失败:', error);
            await this.saveScreenshot('juejin-login-error.png');
            return false;
        }
    }
    async publishArticle(article) {
        try {
            console.log(`开始发布文章到掘金: ${article.title}`);
            await this.page.goto('https://juejin.cn/editor/drafts/new?v=2');
            await this.waitForLoad();
            await this.page.waitForSelector('.editor-title', { timeout: 15000 });
            await this.wait(3000);
            await this.safeType('.editor-title textarea', article.title);
            await this.wait(1000);
            if (article.content) {
                await this.safeClick('.CodeMirror-scroll');
                await this.wait(1000);
                await this.page.keyboard.press('Control+A');
                await this.page.keyboard.press('Delete');
                await this.wait(500);
                await this.page.keyboard.type(article.content);
                await this.wait(2000);
            }
            await this.safeClick('.save-btn');
            await this.wait(2000);
            await this.safeClick('.publish-btn');
            await this.wait(2000);
            await this.page.waitForSelector('.publish-popup', { timeout: 10000 });
            if (article.coverImage) {
                try {
                    await this.safeClick('.cover-upload');
                    await this.wait(1000);
                    console.log('封面图片上传功能待实现');
                }
                catch (error) {
                    console.warn('设置封面失败:', error);
                }
            }
            if (article.summary) {
                try {
                    await this.safeType('.abstract-input textarea', article.summary);
                    await this.wait(500);
                }
                catch (error) {
                    console.warn('设置摘要失败:', error);
                }
            }
            if (article.category) {
                try {
                    await this.safeClick('.category-select');
                    await this.wait(1000);
                    const categoryOptions = await this.page.locator('.option-item').all();
                    for (const option of categoryOptions) {
                        const text = await option.textContent();
                        if (text && text.includes(article.category)) {
                            await option.click();
                            break;
                        }
                    }
                    await this.wait(500);
                }
                catch (error) {
                    console.warn('设置分类失败:', error);
                }
            }
            if (article.tags && article.tags.length > 0) {
                try {
                    for (const tag of article.tags.slice(0, 5)) {
                        await this.safeType('.tag-input input', tag);
                        await this.page.keyboard.press('Enter');
                        await this.wait(500);
                    }
                }
                catch (error) {
                    console.warn('设置标签失败:', error);
                }
            }
            try {
                await this.safeClick('.platform-juejin');
                await this.wait(500);
                if (article.isOriginal !== false) {
                    await this.safeClick('.original-checkbox');
                    await this.wait(500);
                }
            }
            catch (error) {
                console.warn('设置发布选项失败:', error);
            }
            if (article.publishImmediately !== false) {
                await this.safeClick('.confirm-btn');
            }
            else {
                await this.safeClick('.save-draft-btn');
            }
            await this.wait(5000);
            try {
                await this.page.waitForFunction(() => {
                    return document.querySelector('.success-tip') ||
                        window.location.href.includes('/post/');
                }, { timeout: 20000 });
                let articleUrl = '';
                if (this.page.url().includes('/post/')) {
                    articleUrl = this.page.url();
                }
                else {
                    try {
                        const linkElement = await this.page.locator('.article-link').first();
                        if (await linkElement.isVisible()) {
                            articleUrl = await linkElement.getAttribute('href') || '';
                            if (articleUrl && !articleUrl.startsWith('http')) {
                                articleUrl = `https://juejin.cn${articleUrl}`;
                            }
                        }
                    }
                    catch (error) {
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
            }
            catch (error) {
                const errorMsg = await this.page.locator('.error-message').textContent();
                throw new Error(errorMsg || '发布超时或失败');
            }
        }
        catch (error) {
            console.error('掘金发布失败:', error);
            await this.saveScreenshot('juejin-publish-error.png');
            return {
                success: false,
                platform: '掘金',
                error: error instanceof Error ? error.message : '发布失败',
            };
        }
    }
    async checkLoginStatus() {
        try {
            await this.page.goto('https://juejin.cn');
            await this.wait(3000);
            const avatar = await this.page.locator('.avatar').isVisible();
            return avatar;
        }
        catch (error) {
            console.error('检查掘金登录状态失败:', error);
            return false;
        }
    }
    async getPublishedArticles(limit = 10) {
        try {
            await this.page.goto('https://juejin.cn/user/center/posts');
            await this.waitForLoad();
            const articles = [];
            const articleElements = await this.page.locator('.article-item').all();
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
                }
                catch (error) {
                    console.warn(`解析第${i + 1}篇文章信息失败:`, error);
                }
            }
            return articles;
        }
        catch (error) {
            console.error('获取掘金文章列表失败:', error);
            return [];
        }
    }
    async getArticleStats(articleUrl) {
        try {
            await this.page.goto(articleUrl);
            await this.waitForLoad();
            const stats = {
                views: 0,
                likes: 0,
                comments: 0,
                collects: 0,
            };
            try {
                const viewsText = await this.page.locator('.view-count').textContent();
                stats.views = this.parseNumber(viewsText || '0');
            }
            catch (error) {
                console.warn('获取阅读数失败:', error);
            }
            try {
                const likesText = await this.page.locator('.like-count').textContent();
                stats.likes = this.parseNumber(likesText || '0');
            }
            catch (error) {
                console.warn('获取点赞数失败:', error);
            }
            try {
                const commentsText = await this.page.locator('.comment-count').textContent();
                stats.comments = this.parseNumber(commentsText || '0');
            }
            catch (error) {
                console.warn('获取评论数失败:', error);
            }
            try {
                const collectsText = await this.page.locator('.collect-count').textContent();
                stats.collects = this.parseNumber(collectsText || '0');
            }
            catch (error) {
                console.warn('获取收藏数失败:', error);
            }
            return stats;
        }
        catch (error) {
            console.error('获取掘金文章统计失败:', error);
            return null;
        }
    }
    parseNumber(text) {
        const cleanText = text.replace(/[^0-9.kw]/gi, '');
        const num = parseFloat(cleanText);
        if (cleanText.includes('w')) {
            return Math.floor(num * 10000);
        }
        else if (cleanText.includes('k')) {
            return Math.floor(num * 1000);
        }
        return Math.floor(num) || 0;
    }
}
exports.JuejinPublisher = JuejinPublisher;
exports.default = JuejinPublisher;
//# sourceMappingURL=juejin.js.map