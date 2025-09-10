import { BasePlatformScraper } from './base';
export { BasePlatformScraper } from './base';
export { CSDNScraper } from './csdn';
export { JuejinScraper } from './juejin';
export { HuaweiScraper } from './huawei';
export type { ArticleStats, Comment, UserProfile, ScrapeResult, } from './base';
export type SupportedScrapePlatform = 'csdn' | 'juejin' | 'huawei';
export declare function createScraper(platform: SupportedScrapePlatform): BasePlatformScraper;
export declare function getSupportedScrapePlatforms(): SupportedScrapePlatform[];
export interface ScrapePlatformConfig {
    name: string;
    displayName: string;
    baseUrl: string;
    rateLimit: number;
    maxRetries: number;
    timeout: number;
    features: {
        articleStats: boolean;
        comments: boolean;
        userProfile: boolean;
        hotArticles: boolean;
    };
}
export declare const scrapePlatformConfigs: Record<SupportedScrapePlatform, ScrapePlatformConfig>;
export declare function getPlatformConfig(platform: SupportedScrapePlatform): ScrapePlatformConfig;
export declare function isPlatformFeatureSupported(platform: SupportedScrapePlatform, feature: keyof ScrapePlatformConfig['features']): boolean;
export declare class ScraperManager {
    private scrapers;
    getScraper(platform: SupportedScrapePlatform): BasePlatformScraper;
    initializeAll(): Promise<void>;
    closeAll(): Promise<void>;
    batchScrapeArticleStats(tasks: Array<{
        platform: SupportedScrapePlatform;
        url: string;
    }>): Promise<Array<{
        platform: SupportedScrapePlatform;
        url: string;
        result: any;
    }>>;
    batchScrapeUserProfiles(tasks: Array<{
        platform: SupportedScrapePlatform;
        url: string;
    }>): Promise<Array<{
        platform: SupportedScrapePlatform;
        url: string;
        result: any;
    }>>;
}
declare const _default: ScraperManager;
export default _default;
//# sourceMappingURL=index.d.ts.map