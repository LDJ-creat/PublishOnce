"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNotification = processNotification;
exports.addNotificationJob = addNotificationJob;
exports.notifyPublishSuccess = notifyPublishSuccess;
exports.notifyPublishFailed = notifyPublishFailed;
exports.notifyScrapeCompleted = notifyScrapeCompleted;
exports.notifySystemAlert = notifySystemAlert;
exports.batchNotify = batchNotify;
const index_1 = require("./index");
async function sendEmailNotification(data) {
    try {
        console.log('发送邮件通知:', {
            to: data.userId,
            subject: data.title,
            content: data.message,
            type: data.type,
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            notificationId: `email_${Date.now()}`,
        };
    }
    catch (error) {
        console.error('邮件通知发送失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '邮件发送失败',
        };
    }
}
async function sendSystemNotification(data) {
    try {
        console.log('保存系统通知:', {
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            timestamp: data.timestamp,
            metadata: data.metadata,
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            success: true,
            notificationId: `system_${Date.now()}`,
        };
    }
    catch (error) {
        console.error('系统通知保存失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '系统通知保存失败',
        };
    }
}
async function sendWebSocketNotification(data) {
    try {
        console.log('发送WebSocket通知:', {
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            timestamp: data.timestamp,
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
            success: true,
            notificationId: `ws_${Date.now()}`,
        };
    }
    catch (error) {
        console.error('WebSocket通知发送失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'WebSocket通知发送失败',
        };
    }
}
async function processNotification(job) {
    const { data } = job;
    console.log(`开始处理通知任务: ${data.type}`);
    try {
        await job.progress(10);
        const results = [];
        await job.progress(30);
        const systemResult = await sendSystemNotification(data);
        results.push(systemResult);
        await job.progress(50);
        const wsResult = await sendWebSocketNotification(data);
        results.push(wsResult);
        if (data.type === 'publish_failed' || data.type === 'system_alert') {
            await job.progress(70);
            const emailResult = await sendEmailNotification(data);
            results.push(emailResult);
        }
        await job.progress(90);
        const failedResults = results.filter(r => !r.success);
        if (failedResults.length > 0) {
            console.warn('部分通知发送失败:', failedResults);
        }
        await job.progress(100);
        console.log(`通知任务处理完成: ${data.type}`);
    }
    catch (error) {
        console.error('通知任务处理失败:', error);
        throw error;
    }
}
async function addNotificationJob(notificationData, options) {
    const data = {
        ...notificationData,
        timestamp: new Date(),
    };
    const jobOptions = {
        delay: options?.delay || 0,
        priority: options?.priority || 0,
        attempts: options?.attempts || 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: 50,
        removeOnFail: 20,
    };
    return index_1.notificationQueue.add('notification', data, jobOptions);
}
async function notifyPublishSuccess(userId, articleId, platform, articleTitle) {
    await addNotificationJob({
        type: 'publish_success',
        title: '文章发布成功',
        message: `您的文章《${articleTitle}》已成功发布到${platform}`,
        userId,
        articleId,
        platform,
        metadata: {
            articleTitle,
        },
    });
}
async function notifyPublishFailed(userId, articleId, platform, articleTitle, error) {
    await addNotificationJob({
        type: 'publish_failed',
        title: '文章发布失败',
        message: `您的文章《${articleTitle}》发布到${platform}失败：${error}`,
        userId,
        articleId,
        platform,
        metadata: {
            articleTitle,
            error,
        },
    }, {
        priority: 10,
    });
}
async function notifyScrapeCompleted(userId, platform, scrapeType, results) {
    await addNotificationJob({
        type: 'scrape_completed',
        title: '数据抓取完成',
        message: `${platform}的${scrapeType}数据抓取已完成`,
        userId,
        platform,
        metadata: {
            scrapeType,
            results,
        },
    });
}
async function notifySystemAlert(title, message, metadata) {
    await addNotificationJob({
        type: 'system_alert',
        title,
        message,
        metadata,
    }, {
        priority: 20,
    });
}
async function batchNotify(notifications) {
    const jobs = [];
    for (const notification of notifications) {
        const job = await addNotificationJob(notification);
        jobs.push(job);
    }
    return jobs;
}
exports.default = {
    processNotificationJob: processNotification,
    addNotificationJob,
    notifyPublishSuccess,
    notifyPublishFailed,
    notifyScrapeCompleted,
    notifySystemAlert,
    sendBatchNotifications,
};
//# sourceMappingURL=notificationProcessor.js.map