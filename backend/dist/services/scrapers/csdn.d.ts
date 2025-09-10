import { BasePlatformScraper, ArticleStats, Comment, UserProfile, ScrapeResult } from './base';
export declare class CSDNScraper extends BasePlatformScraper {
    constructor();
    private extractArticleId;
    scrapeArticleStats(articleUrl: string): Promise<ScrapeResult<ArticleStats>>;
    scrapeComments(articleUrl: string, limit?: number): Promise<ScrapeResult<Comment[]>>;
    scrapeUserProfile(userUrl: string): Promise<ScrapeResult<UserProfile>>;
    protected handleAntiBot(): Promise<boolean>;
}
export default CSDNScraper;
//# sourceMappingURL=csdn.d.ts.map