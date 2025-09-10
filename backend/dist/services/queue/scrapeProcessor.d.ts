import { Job } from 'bull';
export type ScrapeJobType = 'article-stats' | 'comments' | 'user-profile' | 'batch-stats';
export interface ScrapeJobData {
    type: ScrapeJobType;
    platform: string;
    articleId?: string;
    articleUrl?: string;
    userId?: string;
    articleIds?: string[];
}
export interface ScrapeJobResult {
    type: ScrapeJobType;
    platform: string;
    success: boolean;
    data?: any;
    error?: string;
}
export declare function processScrapeJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult>;
export declare function addScrapeJob(jobData: ScrapeJobData, delay?: number): Promise<Job<ScrapeJobData>>;
export declare function addScheduledScrapeJobs(): Promise<void>;
declare const _default: {
    processScrapeJob: typeof processScrapeJob;
    addScrapeJob: typeof addScrapeJob;
    addScheduledScrapeJobs: typeof addScheduledScrapeJobs;
};
export default _default;
//# sourceMappingURL=scrapeProcessor.d.ts.map