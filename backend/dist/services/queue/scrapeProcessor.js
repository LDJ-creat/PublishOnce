"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScrapeJob = processScrapeJob;
exports.addScrapeJob = addScrapeJob;
exports.addScheduledScrapeJobs = addScheduledScrapeJobs;
const index_1 = require("./index");
const Article_1 = require("../../models/Article");
const Stats_1 = require("../../models/Stats");
const csdn_1 = require("../scrapers/csdn");
const juejin_1 = require("../scrapers/juejin");
const huawei_1 = require("../scrapers/huawei");
function getPlatformScraper(platformName) {
    switch (platformName.toLowerCase()) {
        case 'csdn':
            return new csdn_1.CSDNScraper();
        case 'juejin':
            return new juejin_1.JuejinScraper();
        case 'huawei':
            return new huawei_1.HuaweiScraper();
        default:
            return null;
    }
}
async function saveArticleStats(stats) {
    try {
        await Article_1.Article.findOneAndUpdate({ _id: stats.articleId }, {
            $set: {
                [`platforms.$.views`]: stats.views,
                [`platforms.$.likes`]: stats.likes,
                [`platforms.$.comments`]: stats.comments,
                [`platforms.$.shares`]: stats.shares,
                [`platforms.$.lastStatsUpdate`]: stats.collectedAt,
            }
        }, { arrayFilters: [{ 'platforms.platform': stats.platform }] });
        await Stats_1.Stats.create({
            articleId: stats.articleId,
            platform: stats.platform,
            type: 'article',
            data: {
                views: stats.views,
                likes: stats.likes,
                comments: stats.comments,
                shares: stats.shares || 0,
                url: stats.url,
            },
            collectedAt: stats.collectedAt,
        });
        console.log(`保存统计数据成功: ${stats.platform} - ${stats.articleId}`);
    }
    catch (error) {
        console.error('保存统计数据失败:', error);
        throw error;
    }
}
async function processArticleStatsJob(job) {
    const { platform, articleUrl, articleId } = job.data;
    if (!articleUrl || !articleId) {
        throw new Error('缺少必要参数: articleUrl 或 articleId');
    }
    const scraper = getPlatformScraper(platform);
    if (!scraper) {
        throw new Error(`不支持的抓取平台: ${platform}`);
    }
    try {
        console.log(`开始抓取文章统计: ${platform} - ${articleUrl}`);
        const result = await scraper.scrapeArticleStats(articleUrl);
        if (result.success && result.data) {
            result.data.articleId = articleId;
            await saveArticleStats(result.data);
        }
        return {
            type: 'article-stats',
            platform,
            success: result.success,
            data: result.data,
            error: result.error,
        };
    }
    catch (error) {
        console.error(`抓取文章统计失败: ${platform} - ${articleUrl}`, error);
        return {
            type: 'article-stats',
            platform,
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
}
async function processCommentsJob(job) {
    const { platform, articleUrl, articleId } = job.data;
    if (!articleUrl || !articleId) {
        throw new Error('缺少必要参数: articleUrl 或 articleId');
    }
    const scraper = getPlatformScraper(platform);
    if (!scraper) {
        throw new Error(`不支持的抓取平台: ${platform}`);
    }
    try {
        console.log(`开始抓取评论: ${platform} - ${articleUrl}`);
        const result = await scraper.scrapeComments(articleUrl, 50);
        if (result.success && result.data) {
            await Stats_1.Stats.create({
                articleId,
                platform,
                type: 'comments',
                data: {
                    comments: result.data,
                    count: result.data.length,
                },
                collectedAt: new Date(),
            });
        }
        return {
            type: 'comments',
            platform,
            success: result.success,
            data: result.data,
            error: result.error,
        };
    }
    catch (error) {
        console.error(`抓取评论失败: ${platform} - ${articleUrl}`, error);
        return {
            type: 'comments',
            platform,
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
}
async function processBatchStatsJob(job) {
    const { platform, articleIds } = job.data;
    if (!articleIds || articleIds.length === 0) {
        throw new Error('缺少文章ID列表');
    }
    const scraper = getPlatformScraper(platform);
    if (!scraper) {
        throw new Error(`不支持的抓取平台: ${platform}`);
    }
    const results = [];
    const errors = [];
    try {
        console.log(`开始批量抓取统计: ${platform} - ${articleIds.length}篇文章`);
        for (let i = 0; i < articleIds.length; i++) {
            const articleId = articleIds[i];
            try {
                const article = await Article_1.Article.findById(articleId);
                if (!article) {
                    errors.push(`文章不存在: ${articleId}`);
                    continue;
                }
                const platformInfo = article.platforms.find((p) => p.platform === platform);
                if (!platformInfo || !platformInfo.url) {
                    errors.push(`文章未在${platform}平台发布: ${articleId}`);
                    continue;
                }
                const result = await scraper.scrapeArticleStats(platformInfo.url);
                if (result.success && result.data) {
                    result.data.articleId = articleId;
                    await saveArticleStats(result.data);
                    results.push(result.data);
                }
                else {
                    errors.push(`抓取失败 ${articleId}: ${result.error}`);
                }
                const progress = Math.floor(((i + 1) / articleIds.length) * 100);
                await job.progress(progress);
                if (i < articleIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            catch (error) {
                errors.push(`处理文章${articleId}时出错: ${error}`);
            }
        }
        return {
            type: 'batch-stats',
            platform,
            success: results.length > 0,
            data: {
                success: results.length,
                failed: errors.length,
                results,
                errors,
            },
        };
    }
    catch (error) {
        console.error(`批量抓取统计失败: ${platform}`, error);
        return {
            type: 'batch-stats',
            platform,
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        };
    }
}
async function processScrapeJob(job) {
    const { type } = job.data;
    console.log(`开始处理抓取任务: ${job.id}, 类型: ${type}`);
    try {
        switch (type) {
            case 'article-stats':
                return await processArticleStatsJob(job);
            case 'comments':
                return await processCommentsJob(job);
            case 'batch-stats':
                return await processBatchStatsJob(job);
            default:
                throw new Error(`不支持的抓取任务类型: ${type}`);
        }
    }
    catch (error) {
        console.error(`抓取任务失败: ${job.id}`, error);
        throw error;
    }
}
async function addScrapeJob(jobData, delay = 0) {
    return index_1.scrapeQueue.add(`scrape-${jobData.type}`, jobData, {
        priority: jobData.type === 'batch-stats' ? 2 : 3,
        delay,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 10000,
        },
    });
}
async function addScheduledScrapeJobs() {
    try {
        const articles = await Article_1.Article.find({
            status: 'published',
            'platforms.status': 'published',
        }).select('_id platforms');
        console.log(`找到 ${articles.length} 篇已发布文章，准备添加抓取任务`);
        for (const article of articles) {
            for (const platform of article.platforms) {
                if (platform.status === 'published' && platform.url) {
                    const delay = Math.floor(Math.random() * 300000);
                    await addScrapeJob({
                        type: 'article-stats',
                        platform: platform.platform,
                        articleId: article._id.toString(),
                        articleUrl: platform.url,
                    }, delay);
                }
            }
        }
        console.log('定时抓取任务添加完成');
    }
    catch (error) {
        console.error('添加定时抓取任务失败:', error);
    }
}
exports.default = {
    processScrapeJob,
    addScrapeJob,
    addScheduledScrapeJobs,
};
//# sourceMappingURL=scrapeProcessor.js.map