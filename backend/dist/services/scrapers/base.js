"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePlatformScraper = void 0;
class BasePlatformScraper {
    constructor(platformName, baseUrl) {
        this.browser = null;
        this.page = null;
        this.rateLimitDelay = 2000;
        this.platformName = platformName;
        this.baseUrl = baseUrl;
    }
    async initBrowser() {
        const { chromium } = require('playwright');
        this.browser = await chromium.launch({
            headless: true,
            slowMo: 200,
        });
        this.page = await this.browser.newPage({
            userAgent: this.getRandomUserAgent(),
            viewport: { width: 1920, height: 1080 },
        });
        await this.page.route('**/*', (route) => {
            const resourceType = route.request().resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                route.abort();
            }
            else {
                route.continue();
            }
        });
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
    }
    async initialize() {
        await this.initBrowser();
    }
    async close() {
        await this.closeBrowser();
    }
    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async randomWait(min = 1000, max = 3000) {
        const waitTime = Math.floor(Math.random() * (max - min + 1)) + min;
        await this.wait(waitTime);
    }
    async safeGetText(selectorOrElement, timeout = 5000) {
        try {
            if (!this.page)
                return null;
            if (typeof selectorOrElement === 'string') {
                const element = await this.page.waitForSelector(selectorOrElement, { timeout });
                return await element?.textContent();
            }
            else {
                return await selectorOrElement.textContent() || '';
            }
        }
        catch (error) {
            console.warn(`获取文本失败:`, error);
            return null;
        }
    }
    async waitForLoad() {
        if (!this.page)
            return;
        try {
            await this.page.waitForLoadState('networkidle', { timeout: 10000 });
        }
        catch (error) {
            console.warn('等待页面加载超时:', error);
        }
    }
    async safeGetAttribute(selectorOrElement, attribute, timeout = 5000) {
        try {
            if (!this.page)
                return null;
            let element;
            if (typeof selectorOrElement === 'string') {
                element = await this.page.waitForSelector(selectorOrElement, { timeout });
            }
            else {
                element = selectorOrElement;
            }
            return await element?.getAttribute(attribute);
        }
        catch (error) {
            console.warn(`获取属性失败:`, error);
            return null;
        }
    }
    parseNumber(text) {
        if (!text)
            return 0;
        const cleanText = text.replace(/[^0-9.kw万千]/gi, '');
        const num = parseFloat(cleanText);
        if (isNaN(num))
            return 0;
        if (cleanText.includes('w') || cleanText.includes('万')) {
            return Math.floor(num * 10000);
        }
        if (cleanText.includes('k') || cleanText.includes('千')) {
            return Math.floor(num * 1000);
        }
        return Math.floor(num);
    }
    parseDate(dateStr) {
        try {
            if (dateStr.includes('分钟前')) {
                const minutes = parseInt(dateStr);
                return new Date(Date.now() - minutes * 60 * 1000);
            }
            if (dateStr.includes('小时前')) {
                const hours = parseInt(dateStr);
                return new Date(Date.now() - hours * 60 * 60 * 1000);
            }
            if (dateStr.includes('天前')) {
                const days = parseInt(dateStr);
                return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            }
            return new Date(dateStr);
        }
        catch (error) {
            return new Date();
        }
    }
    async handleAntiBot() {
        try {
            if (!this.page)
                return false;
            const captchaSelectors = [
                '[class*="captcha"]',
                '[class*="verify"]',
                '[id*="captcha"]',
                'img[src*="captcha"]'
            ];
            for (const selector of captchaSelectors) {
                const element = await this.page.$(selector);
                if (element) {
                    console.warn(`${this.platformName} 遇到验证码，需要人工处理`);
                    return false;
                }
            }
            return true;
        }
        catch (error) {
            return true;
        }
    }
    async applyRateLimit() {
        await this.wait(this.rateLimitDelay);
    }
    async executeScrape(scrapeFunction) {
        try {
            await this.initBrowser();
            const result = await scrapeFunction();
            return result;
        }
        catch (error) {
            console.error(`${this.platformName} 抓取失败:`, error);
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
exports.BasePlatformScraper = BasePlatformScraper;
exports.default = BasePlatformScraper;
//# sourceMappingURL=base.js.map