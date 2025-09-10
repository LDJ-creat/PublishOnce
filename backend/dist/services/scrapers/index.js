"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperManager = exports.scrapePlatformConfigs = exports.HuaweiScraper = exports.JuejinScraper = exports.CSDNScraper = exports.BasePlatformScraper = void 0;
exports.createScraper = createScraper;
exports.getSupportedScrapePlatforms = getSupportedScrapePlatforms;
exports.getPlatformConfig = getPlatformConfig;
exports.isPlatformFeatureSupported = isPlatformFeatureSupported;
const csdn_1 = require("./csdn");
const juejin_1 = require("./juejin");
const huawei_1 = require("./huawei");
var base_1 = require("./base");
Object.defineProperty(exports, "BasePlatformScraper", { enumerable: true, get: function () { return base_1.BasePlatformScraper; } });
var csdn_2 = require("./csdn");
Object.defineProperty(exports, "CSDNScraper", { enumerable: true, get: function () { return csdn_2.CSDNScraper; } });
var juejin_2 = require("./juejin");
Object.defineProperty(exports, "JuejinScraper", { enumerable: true, get: function () { return juejin_2.JuejinScraper; } });
var huawei_2 = require("./huawei");
Object.defineProperty(exports, "HuaweiScraper", { enumerable: true, get: function () { return huawei_2.HuaweiScraper; } });
function createScraper(platform) {
    switch (platform) {
        case 'csdn':
            return new csdn_1.CSDNScraper();
        case 'juejin':
            return new juejin_1.JuejinScraper();
        case 'huawei':
            return new huawei_1.HuaweiScraper();
        default:
            throw new Error(`不支持的抓取平台: ${platform}`);
    }
}
function getSupportedScrapePlatforms() {
    return ['csdn', 'juejin', 'huawei'];
}
exports.scrapePlatformConfigs = {
    csdn: {
        name: 'csdn',
        displayName: 'CSDN',
        baseUrl: 'https://www.csdn.net',
        rateLimit: 2000,
        maxRetries: 3,
        timeout: 30000,
        features: {
            articleStats: true,
            comments: true,
            userProfile: true,
            hotArticles: true,
        },
    },
    juejin: {
        name: 'juejin',
        displayName: '掘金',
        baseUrl: 'https://juejin.cn',
        rateLimit: 1500,
        maxRetries: 3,
        timeout: 30000,
        features: {
            articleStats: true,
            comments: true,
            userProfile: true,
            hotArticles: true,
        },
    },
    huawei: {
        name: 'huawei',
        displayName: '华为开发者社区',
        baseUrl: 'https://developer.huawei.com',
        rateLimit: 3000,
        maxRetries: 3,
        timeout: 30000,
        features: {
            articleStats: true,
            comments: true,
            userProfile: true,
            hotArticles: true,
        },
    },
};
function getPlatformConfig(platform) {
    return exports.scrapePlatformConfigs[platform];
}
function isPlatformFeatureSupported(platform, feature) {
    return exports.scrapePlatformConfigs[platform].features[feature];
}
class ScraperManager {
    constructor() {
        this.scrapers = new Map();
    }
    getScraper(platform) {
        if (!this.scrapers.has(platform)) {
            this.scrapers.set(platform, createScraper(platform));
        }
        return this.scrapers.get(platform);
    }
    async initializeAll() {
        const platforms = getSupportedScrapePlatforms();
        const initPromises = platforms.map(async (platform) => {
            try {
                const scraper = this.getScraper(platform);
                await scraper.initialize();
                console.log(`${platform} 抓取器初始化成功`);
            }
            catch (error) {
                console.error(`${platform} 抓取器初始化失败:`, error);
            }
        });
        await Promise.allSettled(initPromises);
    }
    async closeAll() {
        const closePromises = Array.from(this.scrapers.values()).map(async (scraper) => {
            try {
                await scraper.close();
            }
            catch (error) {
                console.error('关闭抓取器失败:', error);
            }
        });
        await Promise.allSettled(closePromises);
        this.scrapers.clear();
    }
    async batchScrapeArticleStats(tasks) {
        const results = [];
        for (const task of tasks) {
            try {
                const scraper = this.getScraper(task.platform);
                const result = await scraper.scrapeArticleStats(task.url);
                results.push({
                    platform: task.platform,
                    url: task.url,
                    result,
                });
                const config = getPlatformConfig(task.platform);
                await new Promise(resolve => setTimeout(resolve, config.rateLimit));
            }
            catch (error) {
                console.error(`批量抓取 ${task.platform} 文章统计失败:`, error);
                results.push({
                    platform: task.platform,
                    url: task.url,
                    result: {
                        success: false,
                        error: error instanceof Error ? error.message : '抓取失败',
                    },
                });
            }
        }
        return results;
    }
    async batchScrapeUserProfiles(tasks) {
        const results = [];
        for (const task of tasks) {
            try {
                const scraper = this.getScraper(task.platform);
                const result = await scraper.scrapeUserProfile(task.url);
                results.push({
                    platform: task.platform,
                    url: task.url,
                    result,
                });
                const config = getPlatformConfig(task.platform);
                await new Promise(resolve => setTimeout(resolve, config.rateLimit));
            }
            catch (error) {
                console.error(`批量抓取 ${task.platform} 用户资料失败:`, error);
                results.push({
                    platform: task.platform,
                    url: task.url,
                    result: {
                        success: false,
                        error: error instanceof Error ? error.message : '抓取失败',
                    },
                });
            }
        }
        return results;
    }
}
exports.ScraperManager = ScraperManager;
exports.default = new ScraperManager();
//# sourceMappingURL=index.js.map