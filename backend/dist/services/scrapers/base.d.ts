import { Browser, Page, Locator } from 'playwright';
export interface ArticleStats {
    articleId: string;
    platform: string;
    url: string;
    views: number;
    likes: number;
    comments: number;
    shares?: number;
    collectedAt: Date;
    title?: string;
    publishDate?: Date;
}
export interface Comment {
    id: string;
    content: string;
    author: string;
    authorAvatar?: string;
    publishTime: Date;
    likes: number;
    replies?: Comment[];
    platform: string;
}
export interface UserProfile {
    userId?: string;
    username: string;
    displayName: string;
    avatar?: string;
    bio?: string;
    followers: number;
    following: number;
    articles: number;
    totalViews: number;
    totalLikes: number;
    level?: string;
    joinDate?: string;
    platform: string;
    url?: string;
}
export interface ScrapeResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    retryAfter?: number;
}
export declare abstract class BasePlatformScraper {
    protected browser: Browser | null;
    protected page: Page | null;
    protected platformName: string;
    protected baseUrl: string;
    protected rateLimitDelay: number;
    constructor(platformName: string, baseUrl: string);
    protected initBrowser(): Promise<void>;
    protected closeBrowser(): Promise<void>;
    initialize(): Promise<void>;
    close(): Promise<void>;
    protected getRandomUserAgent(): string;
    protected wait(ms: number): Promise<void>;
    protected randomWait(min?: number, max?: number): Promise<void>;
    protected safeGetText(selectorOrElement: string | Locator, timeout?: number): Promise<string | null>;
    protected waitForLoad(): Promise<void>;
    protected safeGetAttribute(selectorOrElement: string | Locator, attribute: string, timeout?: number): Promise<string | null>;
    protected parseNumber(text: string): number;
    protected parseDate(dateStr: string): Date;
    protected handleAntiBot(): Promise<boolean>;
    protected applyRateLimit(): Promise<void>;
    abstract scrapeArticleStats(articleUrl: string): Promise<ScrapeResult<ArticleStats>>;
    abstract scrapeComments(articleUrl: string, limit?: number): Promise<ScrapeResult<Comment[]>>;
    abstract scrapeUserProfile(userId: string): Promise<ScrapeResult<UserProfile>>;
    executeScrape<T>(scrapeFunction: () => Promise<ScrapeResult<T>>): Promise<ScrapeResult<T>>;
}
export default BasePlatformScraper;
//# sourceMappingURL=base.d.ts.map