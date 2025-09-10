import { Job } from 'bull';
import { LoginCredentials } from '../publishers/base';
export interface PublishJobData {
    articleId: string;
    userId: string;
    platforms: string[];
    credentials: {
        [platform: string]: LoginCredentials;
    };
}
export interface PublishJobResult {
    articleId: string;
    results: {
        platform: string;
        success: boolean;
        url?: string;
        error?: string;
    }[];
}
export declare function processPublishJob(job: Job<PublishJobData>): Promise<PublishJobResult>;
export declare function addPublishJob(jobData: PublishJobData): Promise<Job<PublishJobData>>;
declare const _default: {
    processPublishJob: typeof processPublishJob;
    addPublishJob: typeof addPublishJob;
};
export default _default;
//# sourceMappingURL=publishProcessor.d.ts.map