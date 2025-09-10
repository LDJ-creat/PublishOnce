"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePlatformPublisher = void 0;
class BasePlatformPublisher {
    constructor(platformName, baseUrl) {
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.platformName = platformName;
        this.baseUrl = baseUrl;
    }
    async initBrowser() {
        const { chromium } = require('playwright');
        this.browser = await chromium.launch({
            headless: process.env.NODE_ENV === 'production',
            slowMo: 100,
        });
        this.page = await this.browser.newPage({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
        });
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        });
    }
    async closeBrowser() {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        this.isLoggedIn = false;
    }
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async randomWait(min = 1000, max = 3000) {
        const waitTime = Math.floor(Math.random() * (max - min + 1)) + min;
        await this.wait(waitTime);
    }
    async safeClick(selector, timeout = 10000) {
        try {
            if (!this.page)
                return false;
            await this.page.waitForSelector(selector, { timeout });
            await this.randomWait(500, 1500);
            await this.page.click(selector);
            return true;
        }
        catch (error) {
            console.error(`点击元素失败 ${selector}:`, error);
            return false;
        }
    }
    async safeType(selector, text, timeout = 10000) {
        try {
            if (!this.page)
                return false;
            await this.page.waitForSelector(selector, { timeout });
            await this.page.fill(selector, '');
            await this.randomWait(300, 800);
            await this.page.type(selector, text, { delay: 50 });
            return true;
        }
        catch (error) {
            console.error(`填写输入框失败 ${selector}:`, error);
            return false;
        }
    }
    async saveScreenshot(filename) {
        if (this.page && process.env.NODE_ENV !== 'production') {
            await this.page.screenshot({
                path: `screenshots/${this.platformName}_${filename}_${Date.now()}.png`,
                fullPage: true
            });
        }
    }
    async executePublish(credentials, article) {
        try {
            await this.initBrowser();
            const loginSuccess = await this.login(credentials);
            if (!loginSuccess) {
                return {
                    success: false,
                    error: '登录失败'
                };
            }
            const result = await this.publish(article);
            return result;
        }
        catch (error) {
            console.error(`${this.platformName} 发布失败:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '未知错误'
            };
        }
        finally {
            await this.closeBrowser();
        }
    }
}
exports.BasePlatformPublisher = BasePlatformPublisher;
exports.default = BasePlatformPublisher;
//# sourceMappingURL=base.js.map