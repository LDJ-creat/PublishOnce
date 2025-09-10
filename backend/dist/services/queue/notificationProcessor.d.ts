import { Job } from 'bull';
export type NotificationType = 'publish_success' | 'publish_failed' | 'scrape_completed' | 'system_alert';
export interface NotificationData {
    type: NotificationType;
    title: string;
    message: string;
    userId?: string;
    articleId?: string;
    platform?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export interface NotificationResult {
    success: boolean;
    notificationId?: string;
    error?: string;
}
export declare function processNotification(job: Job<NotificationData>): Promise<void>;
export declare function addNotificationJob(notificationData: Omit<NotificationData, 'timestamp'>, options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
}): Promise<Job<NotificationData>>;
export declare function notifyPublishSuccess(userId: string, articleId: string, platform: string, articleTitle: string): Promise<void>;
export declare function notifyPublishFailed(userId: string, articleId: string, platform: string, articleTitle: string, error: string): Promise<void>;
export declare function notifyScrapeCompleted(userId: string, platform: string, scrapeType: string, results: any): Promise<void>;
export declare function notifySystemAlert(title: string, message: string, metadata?: Record<string, any>): Promise<void>;
export declare function batchNotify(notifications: Array<Omit<NotificationData, 'timestamp'>>): Promise<Job<NotificationData>[]>;
declare const _default: {
    processNotificationJob: typeof processNotification;
    addNotificationJob: typeof addNotificationJob;
    notifyPublishSuccess: typeof notifyPublishSuccess;
    notifyPublishFailed: typeof notifyPublishFailed;
    notifyScrapeCompleted: typeof notifyScrapeCompleted;
    notifySystemAlert: typeof notifySystemAlert;
    sendBatchNotifications: any;
};
export default _default;
//# sourceMappingURL=notificationProcessor.d.ts.map