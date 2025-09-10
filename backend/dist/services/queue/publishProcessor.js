"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPublishJob = processPublishJob;
exports.addPublishJob = addPublishJob;
const index_1 = require("./index");
const Article_1 = require("../../models/Article");
const csdn_1 = require("../publishers/csdn");
const juejin_1 = require("../publishers/juejin");
const huawei_1 = require("../publishers/huawei");
function getPlatformPublisher(platformName) {
    switch (platformName.toLowerCase()) {
        case 'csdn':
            return new csdn_1.CSDNPublisher();
        case 'juejin':
            return new juejin_1.JuejinPublisher();
        case 'huawei':
            return new huawei_1.HuaweiPublisher();
        default:
            return null;
    }
}
function convertArticleToPublishData(article) {
    return {
        title: article.title,
        content: article.content,
        summary: article.summary,
        tags: article.tags || [],
        category: article.category,
        coverImage: article.coverImage,
        isDraft: false,
    };
}
async function processPublishJob(job) {
    const { articleId, userId, platforms, credentials } = job.data;
    console.log(`开始处理发布任务: ${job.id}, 文章ID: ${articleId}`);
    try {
        const article = await Article_1.Article.findOne({ _id: articleId, author: userId });
        if (!article) {
            throw new Error('文章不存在或无权访问');
        }
        const publishData = convertArticleToPublishData(article);
        const results = [];
        await job.progress(10);
        for (let i = 0; i < platforms.length; i++) {
            const platformName = platforms[i];
            const platformCredentials = credentials[platformName];
            if (!platformCredentials) {
                results.push({
                    platform: platformName,
                    success: false,
                    error: '缺少平台登录凭据'
                });
                continue;
            }
            try {
                console.log(`开始发布到 ${platformName}`);
                const publisher = getPlatformPublisher(platformName);
                if (!publisher) {
                    results.push({
                        platform: platformName,
                        success: false,
                        error: '不支持的发布平台'
                    });
                    continue;
                }
                const publishResult = await publisher.executePublish(platformCredentials, publishData);
                results.push({
                    platform: platformName,
                    success: publishResult.success,
                    url: publishResult.url,
                    error: publishResult.error
                });
                if (publishResult.success) {
                    const platformIndex = article.platforms.findIndex((p) => p.platform === platformName);
                    if (platformIndex >= 0) {
                        article.platforms[platformIndex].status = 'published';
                        article.platforms[platformIndex].url = publishResult.url;
                        article.platforms[platformIndex].articleId = publishResult.articleId;
                    }
                    else {
                        article.platforms.push({
                            platform: platformName,
                            status: 'published',
                            url: publishResult.url,
                            articleId: publishResult.articleId,
                            publishedAt: new Date()
                        });
                    }
                    try {
                        const { notifyPublishSuccess } = await Promise.resolve().then(() => __importStar(require('./notificationProcessor')));
                        await notifyPublishSuccess(userId, articleId, platformName, article.title);
                    }
                    catch (notifyError) {
                        console.error('发送成功通知失败:', notifyError);
                    }
                }
                else {
                    const platformIndex = article.platforms.findIndex((p) => p.platform === platformName);
                    if (platformIndex >= 0) {
                        article.platforms[platformIndex].status = 'failed';
                        article.platforms[platformIndex].error = publishResult.error;
                    }
                    try {
                        const { notifyPublishFailed } = await Promise.resolve().then(() => __importStar(require('./notificationProcessor')));
                        await notifyPublishFailed(userId, articleId, platformName, article.title, publishResult.error || '未知错误');
                    }
                    catch (notifyError) {
                        console.error('发送失败通知失败:', notifyError);
                    }
                }
                console.log(`${platformName} 发布结果:`, publishResult.success ? '成功' : '失败');
            }
            catch (error) {
                console.error(`${platformName} 发布异常:`, error);
                results.push({
                    platform: platformName,
                    success: false,
                    error: error instanceof Error ? error.message : '未知错误'
                });
            }
            const progress = Math.floor(((i + 1) / platforms.length) * 80) + 10;
            await job.progress(progress);
            if (i < platforms.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        await article.save();
        const hasSuccess = results.some(r => r.success);
        const allSuccess = results.every(r => r.success);
        if (allSuccess) {
            article.status = 'published';
        }
        else if (hasSuccess) {
            article.status = 'partial_published';
        }
        await article.save();
        await job.progress(100);
        console.log(`发布任务完成: ${job.id}`);
        return {
            articleId,
            results
        };
    }
    catch (error) {
        console.error(`发布任务失败: ${job.id}`, error);
        throw error;
    }
}
async function addPublishJob(jobData) {
    return index_1.publishQueue.add('publish-article', jobData, {
        priority: 1,
        delay: 0,
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    });
}
exports.default = {
    processPublishJob,
    addPublishJob,
};
//# sourceMappingURL=publishProcessor.js.map