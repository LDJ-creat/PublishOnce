import { BasePlatformScraper, ArticleStats, Comment, UserProfile, ScrapeResult } from './base';
export declare class JuejinScraper extends BasePlatformScraper {
    constructor();
    private extractArticleId;
    scrapeArticleStats(articleUrl: string): Promise<ScrapeResult<ArticleStats>>;
    scrapeComments(articleUrl: string, limit?: number): Promise<ScrapeResult<Comment[]>>;
    scrapeUserProfile(userUrl: string): Promise<ScrapeResult<UserProfile>>;
    protected handleAntiBot(): Promise<boolean>;
    getHotArticles(limit?: number): Promise<ScrapeResult<any[]>>;
}
export default JuejinScraper;
//# sourceMappingURL=juejin.d.ts.map