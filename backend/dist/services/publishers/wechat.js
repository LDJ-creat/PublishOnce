"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatPublisher = void 0;
const base_1 = require("./base");
class WechatPublisher extends base_1.BasePlatformPublisher {
    constructor() {
        super(...arguments);
        this.platformName = '微信公众号';
        this.baseUrl = 'https://mp.weixin.qq.com';
    }
    async login(credentials) {
        try {
            console.log('开始登录微信公众号...');
            await this.page.goto(`${this.baseUrl}/cgi-bin/loginpage`);
            await this.waitForLoad();
            await this.safeType('input[name="account"]', credentials.username);
            await this.wait(1000);
            await this.safeType('input[name="password"]', credentials.password);
            await this.wait(1000);
            await this.safeClick('a.btn_login');
            try {
                const captchaInput = await this.page.waitForSelector('input[name="imgcode"]', { timeout: 3000 });
                if (captchaInput) {
                    console.log('检测到验证码，需要手动输入');
                    await this.saveScreenshot('wechat-captcha.png');
                    await this.page.waitForNavigation({ timeout: 60000 });
                }
            }
            catch (error) {
            }
            try {
                const qrcode = await this.page.waitForSelector('.qrcode', { timeout: 5000 });
                if (qrcode) {
                    console.log('检测到二维码，需要扫码登录');
                    await this.saveScreenshot('wechat-qrcode.png');
                    await this.page.waitForNavigation({ timeout: 120000 });
                }
            }
            catch (error) {
            }
            await this.page.waitForURL('**/home**', { timeout: 30000 });
            console.log('微信公众号登录成功');
            return true;
        }
        catch (error) {
            console.error('微信公众号登录失败:', error);
            await this.saveScreenshot('wechat-login-error.png');
            return false;
        }
    }
    async publishArticle(article) {
        try {
            console.log(`开始发布文章到微信公众号: ${article.title}`);
            await this.page.goto(`${this.baseUrl}/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&createType=0&token=${await this.getToken()}&lang=zh_CN`);
            await this.waitForLoad();
            await this.safeType('#title', article.title);
            await this.wait(1000);
            if (article.author) {
                await this.safeType('#author', article.author);
                await this.wait(500);
            }
            const editorFrame = await this.page.frameLocator('#ueditor_0');
            await editorFrame.locator('body').click();
            await this.page.keyboard.press('Control+A');
            await this.page.keyboard.press('Delete');
            await this.wait(1000);
            if (article.content) {
                const htmlContent = this.convertMarkdownToHtml(article.content);
                await editorFrame.locator('body').fill(htmlContent);
            }
            await this.wait(2000);
            if (article.summary) {
                await this.safeClick('.js_summary');
                await this.wait(500);
                await this.safeType('textarea[name="summary"]', article.summary);
            }
            if (article.coverImage) {
                try {
                    await this.safeClick('.js_cover');
                    await this.wait(1000);
                    console.log('封面图片上传功能待实现');
                }
                catch (error) {
                    console.warn('封面图片上传失败:', error);
                }
            }
            if (article.tags && article.tags.length > 0) {
                try {
                    await this.safeClick('.js_tag');
                    await this.wait(500);
                    for (const tag of article.tags.slice(0, 3)) {
                        await this.safeType('input.tag_input', tag);
                        await this.page.keyboard.press('Enter');
                        await this.wait(500);
                    }
                }
                catch (error) {
                    console.warn('标签设置失败:', error);
                }
            }
            await this.safeClick('.js_save');
            await this.wait(3000);
            await this.safeClick('.js_preview');
            await this.wait(2000);
            const previewSuccess = await this.page.locator('.preview_success').isVisible();
            if (!previewSuccess) {
                throw new Error('文章预览失败');
            }
            if (article.publishImmediately) {
                await this.safeClick('.js_send');
                await this.wait(2000);
                await this.safeClick('.js_confirm');
                await this.wait(5000);
                const publishSuccess = await this.page.locator('.publish_success').isVisible();
                if (publishSuccess) {
                    console.log('文章发布成功');
                }
                else {
                    console.log('文章已提交审核');
                }
            }
            let articleUrl = '';
            try {
                const urlElement = await this.page.locator('.article_url').first();
                if (await urlElement.isVisible()) {
                    articleUrl = await urlElement.textContent() || '';
                }
            }
            catch (error) {
                console.warn('获取文章链接失败:', error);
            }
            await this.saveScreenshot('wechat-publish-success.png');
            return {
                success: true,
                platform: '微信公众号',
                url: articleUrl,
                message: article.publishImmediately ? '文章发布成功' : '文章已保存为草稿',
            };
        }
        catch (error) {
            console.error('微信公众号发布失败:', error);
            await this.saveScreenshot('wechat-publish-error.png');
            return {
                success: false,
                platform: '微信公众号',
                error: error instanceof Error ? error.message : '发布失败',
            };
        }
    }
    async getToken() {
        try {
            const url = this.page.url();
            const tokenMatch = url.match(/token=([^&]+)/);
            return tokenMatch ? tokenMatch[1] : '';
        }
        catch (error) {
            console.warn('获取token失败:', error);
            return '';
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
    async checkLoginStatus() {
        try {
            await this.page.goto(`${this.baseUrl}/cgi-bin/home`);
            await this.wait(3000);
            const isLoginPage = await this.page.locator('.login_form').isVisible();
            return !isLoginPage;
        }
        catch (error) {
            console.error('检查微信公众号登录状态失败:', error);
            return false;
        }
    }
}
exports.WechatPublisher = WechatPublisher;
exports.default = WechatPublisher;
//# sourceMappingURL=wechat.js.map