"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const scrapeProcessor_1 = __importDefault(require("../queue/scrapeProcessor"));
const PlatformCredential_1 = require("../../models/PlatformCredential");
class TaskScheduler {
    constructor() {
        this.tasks = new Map();
        this.isInitialized = false;
    }
    async initialize() {
        if (this.isInitialized) {
            console.log('任务调度器已经初始化');
            return;
        }
        try {
            await this.setupDefaultTasks();
            await this.setupUserTasks();
            this.isInitialized = true;
            console.log('任务调度器初始化完成');
        }
        catch (error) {
            console.error('任务调度器初始化失败:', error);
            throw error;
        }
    }
    async setupDefaultTasks() {
        const dailyScrapeTask = node_cron_1.default.schedule('0 2 * * *', async () => {
            console.log('开始执行每日数据抓取任务');
            await this.executeFullPlatformScrape();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        this.tasks.set('daily-scrape', dailyScrapeTask);
        dailyScrapeTask.start();
        console.log('每日数据抓取任务已启动 (每天凌晨2点)');
        const hotArticlesTask = node_cron_1.default.schedule('0 */4 * * *', async () => {
            console.log('开始执行热门文章抓取任务');
            await this.executeHotArticlesScrape();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        this.tasks.set('hot-articles', hotArticlesTask);
        hotArticlesTask.start();
        console.log('热门文章抓取任务已启动 (每4小时)');
        const cleanupTask = node_cron_1.default.schedule('0 3 * * 0', async () => {
            console.log('开始执行数据清理任务');
            await this.executeDataCleanup();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        this.tasks.set('weekly-cleanup', cleanupTask);
        cleanupTask.start();
        console.log('数据清理任务已启动 (每周日凌晨3点)');
    }
    async setupUserTasks() {
        try {
            const activeCredentials = await PlatformCredential_1.PlatformCredential.find({
                isActive: true
            }).populate('userId');
            for (const credential of activeCredentials) {
                await this.setupUserPlatformTask(credential);
            }
        }
        catch (error) {
            console.error('设置用户自定义任务失败:', error);
        }
    }
    async setupUserPlatformTask(credential) {
        const taskId = `user-${credential.userId._id}-${credential.platform}`;
        const userTask = node_cron_1.default.schedule('0 */6 * * *', async () => {
            console.log(`开始执行用户 ${credential.userId.username} 的 ${credential.platform} 平台抓取任务`);
            try {
                await scrapeProcessor_1.default.addScrapeJob({
                    userId: credential.userId._id.toString(),
                    platform: credential.platform,
                    type: 'user-focused',
                    config: {
                        scrapeUserArticles: true,
                        scrapeFollowedAuthors: true,
                        scrapeTrendingTopics: true
                    }
                });
            }
            catch (error) {
                console.error(`用户 ${credential.userId.username} 的 ${credential.platform} 抓取任务失败:`, error);
            }
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        this.tasks.set(taskId, userTask);
        userTask.start();
        console.log(`用户 ${credential.userId.username} 的 ${credential.platform} 抓取任务已启动`);
    }
    async executeFullPlatformScrape() {
        const platforms = ['csdn', 'juejin', 'huawei'];
        for (const platform of platforms) {
            try {
                await scrapeProcessor_1.default.addScrapeJob({
                    userId: 'system',
                    platform,
                    type: 'batch-stats'
                });
                console.log(`${platform} 平台全量抓取任务已添加到队列`);
            }
            catch (error) {
                console.error(`${platform} 平台全量抓取任务添加失败:`, error);
            }
        }
    }
    async executeHotArticlesScrape() {
        const platforms = ['csdn', 'juejin', 'huawei'];
        for (const platform of platforms) {
            try {
                await scrapeProcessor_1.default.addScrapeJob({
                    userId: 'system',
                    platform,
                    type: 'article-stats'
                });
                console.log(`${platform} 平台热门文章抓取任务已添加到队列`);
            }
            catch (error) {
                console.error(`${platform} 平台热门文章抓取任务添加失败:`, error);
            }
        }
    }
    async executeDataCleanup() {
        try {
            console.log('数据清理任务执行完成');
        }
        catch (error) {
            console.error('数据清理任务执行失败:', error);
        }
    }
    addCustomTask(taskId, cronExpression, taskFunction) {
        if (this.tasks.has(taskId)) {
            console.warn(`任务 ${taskId} 已存在，将被覆盖`);
            this.removeTask(taskId);
        }
        const task = node_cron_1.default.schedule(cronExpression, taskFunction, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });
        this.tasks.set(taskId, task);
        task.start();
        console.log(`自定义任务 ${taskId} 已启动`);
    }
    removeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.stop();
            this.tasks.delete(taskId);
            console.log(`任务 ${taskId} 已移除`);
        }
    }
    getTasksStatus() {
        const status = {};
        for (const [taskId, task] of this.tasks) {
            status[taskId] = true;
        }
        return status;
    }
    stopAllTasks() {
        for (const [taskId, task] of this.tasks) {
            task.stop();
            console.log(`任务 ${taskId} 已停止`);
        }
    }
    startAllTasks() {
        for (const [taskId, task] of this.tasks) {
            task.start();
            console.log(`任务 ${taskId} 已启动`);
        }
    }
    async shutdown() {
        console.log('正在关闭任务调度器...');
        for (const [taskId, task] of this.tasks) {
            task.stop();
        }
        this.tasks.clear();
        this.isInitialized = false;
        console.log('任务调度器已关闭');
    }
}
exports.TaskScheduler = TaskScheduler;
const taskScheduler = new TaskScheduler();
exports.default = taskScheduler;
//# sourceMappingURL=index.js.map