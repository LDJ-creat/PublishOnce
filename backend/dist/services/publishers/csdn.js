"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSDNPublisher = void 0;
const base_1 = require("./base");
class CSDNPublisher extends base_1.BasePlatformPublisher {
    constructor() {
        super(...arguments);
        this.platformName = 'CSDN';
        this.baseUrl = 'https://blog.csdn.net';
    }
    async login(credentials) {
        try {
            console.log('开始登录CSDN...');
            await this.page.goto('https://passport.csdn.net/login');
            await this.waitForLoad();
            try {
                await this.safeClick('.login-code__open--right');
                await this.wait(1000);
            }
            catch (error) {
            }
            await this.safeType('#loginname', credentials.username);
            await this.wait(1000);
            await this.safeType('#nloginpwd', credentials.password);
            await this.wait(1000);
            try {
                const captchaImg = await this.page.waitForSelector('#imgCode', { timeout: 3000 });
                if (captchaImg) {
                    console.log('检测到验证码，需要手动输入');
                    await this.saveScreenshot('csdn-captcha.png');
                    await this.page.waitForFunction(() => {
                        const input = document.querySelector('#validCode');
                        return input && input.value.length > 0;
                    }, { timeout: 60000 });
                }
            }
            catch (error) {
            }
            await this.safeClick('.logging');
            await this.page.waitForURL('**/blog.csdn.net/**', { timeout: 30000 });
            console.log('CSDN登录成功');
            return true;
        }
        catch (error) {
            console.error('CSDN登录失败:', error);
            await this.saveScreenshot('csdn-login-error.png');
            return false;
        }
    }
    async publishArticle(article) {
        try {
            console.log(`开始发布文章到CSDN: ${article.title}`);
            await this.page.goto('https://editor.csdn.net/md/');
            await this.waitForLoad();
            await this.page.waitForSelector('.editor-title-input', { timeout: 10000 });
            await this.wait(2000);
            await this.safeType('.editor-title-input', article.title);
            await this.wait(1000);
            if (article.content) {
                await this.safeClick('.editor-md-input');
                await this.wait(1000);
                await this.page.keyboard.press('Control+A');
                await this.page.keyboard.press('Delete');
                await this.wait(500);
                await this.page.keyboard.type(article.content);
                await this.wait(2000);
            }
            await this.safeClick('.btn-publish');
            await this.wait(2000);
            await this.page.waitForSelector('.article-bar', { timeout: 10000 });
            if (article.category) {
                try {
                    await this.safeClick('.select-item-category');
                    await this.wait(1000);
                    const categoryOptions = await this.page.locator('.el-select-dropdown__item').all();
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
                    const tagInput = await this.page.locator('.tag-input-new');
                    for (const tag of article.tags.slice(0, 5)) {
                        await tagInput.fill(tag);
                        await this.page.keyboard.press('Enter');
                        await this.wait(500);
                    }
                }
                catch (error) {
                    console.warn('设置标签失败:', error);
                }
            }
            if (article.summary) {
                try {
                    await this.safeType('.article-bar__content textarea', article.summary);
                    await this.wait(500);
                }
                catch (error) {
                    console.warn('设置摘要失败:', error);
                }
            }
            try {
                const articleType = article.isOriginal !== false ? '原创' : '转载';
                await this.safeClick(`[title="${articleType}"]`);
                await this.wait(500);
            }
            catch (error) {
                console.warn('设置文章类型失败:', error);
            }
            if (article.publishImmediately !== false) {
                await this.safeClick('.btn-publish-immediately');
            }
            else {
                await this.safeClick('.btn-save-draft');
            }
            await this.wait(3000);
            try {
                await this.page.waitForFunction(() => {
                    return document.querySelector('.success-tips') ||
                        window.location.href.includes('/article/details/');
                }, { timeout: 15000 });
                let articleUrl = '';
                if (this.page.url().includes('/article/details/')) {
                    articleUrl = this.page.url();
                }
                else {
                    try {
                        const linkElement = await this.page.locator('.success-tips a').first();
                        if (await linkElement.isVisible()) {
                            articleUrl = await linkElement.getAttribute('href') || '';
                        }
                    }
                    catch (error) {
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
            }
            catch (error) {
                const errorMsg = await this.page.locator('.error-tips').textContent();
                throw new Error(errorMsg || '发布超时或失败');
            }
        }
        catch (error) {
            console.error('CSDN发布失败:', error);
            await this.saveScreenshot('csdn-publish-error.png');
            return {
                success: false,
                platform: 'CSDN',
                error: error instanceof Error ? error.message : '发布失败',
            };
        }
    }
    async checkLoginStatus() {
        try {
            await this.page.goto('https://blog.csdn.net');
            await this.wait(3000);
            const userInfo = await this.page.locator('.toolbar-btn-login').isVisible();
            return !userInfo;
        }
        catch (error) {
            console.error('检查CSDN登录状态失败:', error);
            return false;
        }
    }
    async getPublishedArticles(limit = 10) {
        try {
            await this.page.goto('https://blog.csdn.net/nav/watchers');
            await this.waitForLoad();
            const articles = [];
            const articleElements = await this.page.locator('.article-item-box').all();
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
                }
                catch (error) {
                    console.warn(`解析第${i + 1}篇文章信息失败:`, error);
                }
            }
            return articles;
        }
        catch (error) {
            console.error('获取CSDN文章列表失败:', error);
            return [];
        }
    }
}
exports.CSDNPublisher = CSDNPublisher;
exports.default = CSDNPublisher;
//# sourceMappingURL=csdn.js.map