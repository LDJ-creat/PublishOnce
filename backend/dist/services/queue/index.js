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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQueue = exports.scrapeQueue = exports.publishQueue = exports.redis = void 0;
const bull_1 = __importDefault(require("bull"));
const ioredis_1 = __importDefault(require("ioredis"));
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
};
exports.redis = new ioredis_1.default(redisConfig);
const queueConfig = {
    redis: redisConfig,
    defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
};
exports.publishQueue = new bull_1.default('publish', queueConfig);
exports.scrapeQueue = new bull_1.default('scrape', queueConfig);
exports.notificationQueue = new bull_1.default('notification', queueConfig);
function setupQueueEvents(queue, queueName) {
    queue.on('completed', (job, result) => {
        console.log(`${queueName} 任务完成:`, job.id, result);
    });
    queue.on('failed', (job, err) => {
        console.error(`${queueName} 任务失败:`, job.id, err.message);
    });
    queue.on('stalled', (job) => {
        console.warn(`${queueName} 任务停滞:`, job.id);
    });
    queue.on('progress', (job, progress) => {
        console.log(`${queueName} 任务进度:`, job.id, `${progress}%`);
    });
}
setupQueueEvents(exports.publishQueue, 'PUBLISH');
setupQueueEvents(exports.scrapeQueue, 'SCRAPE');
setupQueueEvents(exports.notificationQueue, 'NOTIFICATION');
async function initializeProcessors() {
    try {
        const publishProcessor = await Promise.resolve().then(() => __importStar(require('./publishProcessor')));
        exports.publishQueue.process('publish-article', 1, publishProcessor.processPublishJob);
        const scrapeProcessor = await Promise.resolve().then(() => __importStar(require('./scrapeProcessor')));
        exports.scrapeQueue.process('scrape-article-stats', 2, scrapeProcessor.processScrapeJob);
        exports.scrapeQueue.process('scrape-comments', 1, scrapeProcessor.processScrapeJob);
        exports.scrapeQueue.process('scrape-batch-stats', 1, scrapeProcessor.processScrapeJob);
        const notificationProcessor = await Promise.resolve().then(() => __importStar(require('./notificationProcessor')));
        exports.notificationQueue.process('notification', 3, notificationProcessor.processNotificationJob);
        console.log('队列处理器初始化完成');
    }
    catch (error) {
        console.error('队列处理器初始化失败:', error);
    }
}
initializeProcessors();
process.on('SIGTERM', async () => {
    console.log('正在关闭队列...');
    await exports.publishQueue.close();
    await exports.scrapeQueue.close();
    await exports.notificationQueue.close();
    await exports.redis.disconnect();
    process.exit(0);
});
exports.default = {
    publishQueue: exports.publishQueue,
    scrapeQueue: exports.scrapeQueue,
    notificationQueue: exports.notificationQueue,
    redis: exports.redis,
};
//# sourceMappingURL=index.js.map