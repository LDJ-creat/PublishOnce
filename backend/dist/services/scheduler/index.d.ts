declare class TaskScheduler {
    private tasks;
    private isInitialized;
    initialize(): Promise<void>;
    private setupDefaultTasks;
    private setupUserTasks;
    private setupUserPlatformTask;
    private executeFullPlatformScrape;
    private executeHotArticlesScrape;
    private executeDataCleanup;
    addCustomTask(taskId: string, cronExpression: string, taskFunction: () => Promise<void>): void;
    removeTask(taskId: string): void;
    getTasksStatus(): {
        [key: string]: boolean;
    };
    stopAllTasks(): void;
    startAllTasks(): void;
    shutdown(): Promise<void>;
}
declare const taskScheduler: TaskScheduler;
export default taskScheduler;
export { TaskScheduler };
//# sourceMappingURL=index.d.ts.map