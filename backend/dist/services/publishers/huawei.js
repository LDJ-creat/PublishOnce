"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuaweiPublisher = void 0;
const base_1 = require("./base");
class HuaweiPublisher extends base_1.BasePlatformPublisher {
    constructor() {
        super(...arguments);
        this.platformName = '华为开发者社区';
        this.baseUrl = 'https://developer.huawei.com';
    }
    async login(credentials) {
        try {
            console.log('开始登录华为开发者社区...');
            await this.page.goto('https://id1.cloud.huawei.com/CAS/portal/login.html');
            await this.waitForLoad();
            await this.safeType('#userName', credentials.username);
            await this.wait(1000);
            await this.safeType('#password', credentials.password);
            await this.wait(1000);
            try {
                const captchaImg = await this.page.waitForSelector('#verifyCode_img', { timeout: 3000 });
                if (captchaImg) {
                    console.log('检测到验证码，需要手动输入');
                    await this.saveScreenshot('huawei-captcha.png');
                    await this.page.waitForFunction(() => {
                        const input = document.querySelector('#verifyCode');
                        return input && input.value.length > 0;
                    }, { timeout: 60000 });
                }
            }
            catch (error) {
            }
            await this.safeClick('#btn_submit');
            try {
                const smsVerify = await this.page.waitForSelector('.sms-verify', { timeout: 5000 });
                if (smsVerify) {
                    console.log('需要短信验证，请手动完成');
                    await this.saveScreenshot('huawei-sms-verify.png');
                    await this.page.waitForNavigation({ timeout: 120000 });
                }
            }
            catch (error) {
            }
            await this.page.waitForURL('**/developer.huawei.com/**', { timeout: 30000 });
            console.log('华为开发者社区登录成功');
            return true;
        }
        catch (error) {
            console.error('华为开发者社区登录失败:', error);
            await this.saveScreenshot('huawei-login-error.png');
            return false;
        }
    }
    async publishArticle(article) {
        try {
            console.log(`开始发布文章到华为开发者社区: ${article.title}`);
            await this.page.goto('https://developer.huawei.com/consumer/cn/forum/home');
            await this.waitForLoad();
            await this.safeClick('.post-btn');
            await this.wait(2000);
            await this.page.waitForSelector('.editor-container', { timeout: 15000 });
            await this.wait(3000);
            try {
                await this.safeClick('.board-select');
                await this.wait(1000);
                const boardOptions = await this.page.locator('.board-option').all();
                if (boardOptions.length > 0) {
                    await boardOptions[0].click();
                    await this.wait(500);
                }
            }
            catch (error) {
                console.warn('选择板块失败:', error);
            }
            await this.safeType('.title-input input', article.title);
            await this.wait(1000);
            if (article.tags && article.tags.length > 0) {
                try {
                    for (const tag of article.tags.slice(0, 3)) {
                        await this.safeType('.tag-input input', tag);
                        await this.page.keyboard.press('Enter');
                        await this.wait(500);
                    }
                }
                catch (error) {
                    console.warn('设置标签失败:', error);
                }
            }
            if (article.content) {
                try {
                    await this.safeClick('.markdown-mode');
                    await this.wait(1000);
                    await this.safeClick('.markdown-editor');
                    await this.wait(500);
                    await this.page.keyboard.press('Control+A');
                    await this.page.keyboard.press('Delete');
                    await this.wait(500);
                    await this.page.keyboard.type(article.content);
                    await this.wait(2000);
                }
                catch (error) {
                    console.log('使用富文本编辑器');
                    const editorFrame = await this.page.frameLocator('.editor-frame');
                    await editorFrame.locator('body').click();
                    await this.page.keyboard.press('Control+A');
                    await this.page.keyboard.press('Delete');
                    await this.wait(500);
                    const htmlContent = this.convertMarkdownToHtml(article.content);
                    await editorFrame.locator('body').fill(htmlContent);
                    await this.wait(2000);
                }
            }
            if (article.coverImage) {
                try {
                    await this.safeClick('.cover-upload');
                    await this.wait(1000);
                    console.log('封面图片上传功能待实现');
                }
                catch (error) {
                    console.warn('封面图片上传失败:', error);
                }
            }
            if (article.summary) {
                try {
                    await this.safeType('.summary-input textarea', article.summary);
                    await this.wait(500);
                }
                catch (error) {
                    console.warn('设置摘要失败:', error);
                }
            }
            try {
                if (article.isOriginal !== false) {
                    await this.safeClick('.original-checkbox');
                    await this.wait(500);
                }
                await this.safeClick('.public-visible');
                await this.wait(500);
            }
            catch (error) {
                console.warn('设置发布选项失败:', error);
            }
            if (article.publishImmediately !== false) {
                await this.safeClick('.publish-btn');
            }
            else {
                await this.safeClick('.save-draft-btn');
            }
            await this.wait(5000);
            try {
                await this.page.waitForFunction(() => {
                    return document.querySelector('.success-message') ||
                        window.location.href.includes('/topic/');
                }, { timeout: 20000 });
                let articleUrl = '';
                if (this.page.url().includes('/topic/')) {
                    articleUrl = this.page.url();
                }
                else {
                    try {
                        const linkElement = await this.page.locator('.article-link').first();
                        if (await linkElement.isVisible()) {
                            articleUrl = await linkElement.getAttribute('href') || '';
                            if (articleUrl && !articleUrl.startsWith('http')) {
                                articleUrl = `https://developer.huawei.com${articleUrl}`;
                            }
                        }
                    }
                    catch (error) {
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
            }
            catch (error) {
                const errorMsg = await this.page.locator('.error-tip').textContent();
                throw new Error(errorMsg || '发布超时或失败');
            }
        }
        catch (error) {
            console.error('华为开发者社区发布失败:', error);
            await this.saveScreenshot('huawei-publish-error.png');
            return {
                success: false,
                platform: '华为开发者社区',
                error: error instanceof Error ? error.message : '发布失败',
            };
        }
    }
    async checkLoginStatus() {
        try {
            await this.page.goto('https://developer.huawei.com/consumer/cn/forum/home');
            await this.wait(3000);
            const userInfo = await this.page.locator('.user-info').isVisible();
            return userInfo;
        }
        catch (error) {
            console.error('检查华为开发者社区登录状态失败:', error);
            return false;
        }
    }
    async getPublishedArticles(limit = 10) {
        try {
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
                }
                catch (error) {
                    console.warn(`解析第${i + 1}篇文章信息失败:`, error);
                }
            }
            return articles;
        }
        catch (error) {
            console.error('获取华为开发者社区文章列表失败:', error);
            return [];
        }
    }
    convertMarkdownToHtml(markdown) {
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
    async getArticleStats(articleUrl) {
        try {
            await this.page.goto(articleUrl);
            await this.waitForLoad();
            const stats = {
                views: 0,
                likes: 0,
                comments: 0,
                shares: 0,
            };
            try {
                const viewsText = await this.page.locator('.view-count').textContent();
                stats.views = this.parseNumber(viewsText || '0');
            }
            catch (error) {
                console.warn('获取浏览数失败:', error);
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
            return stats;
        }
        catch (error) {
            console.error('获取华为开发者社区文章统计失败:', error);
            return null;
        }
    }
    parseNumber(text) {
        const num = parseInt(text.replace(/[^0-9]/g, ''));
        return isNaN(num) ? 0 : num;
    }
}
exports.HuaweiPublisher = HuaweiPublisher;
exports.default = HuaweiPublisher;
//# sourceMappingURL=huawei.js.map