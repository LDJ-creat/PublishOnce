import { Browser, Page } from 'playwright';
export interface LoginCredentials {
    username: string;
    password: string;
    [key: string]: any;
}
export interface PublishResult {
    success: boolean;
    articleId?: string;
    url?: string;
    message?: string;
    error?: string;
}
export interface ArticlePublishData {
    title: string;
    content: string;
    summary?: string;
    tags: string[];
    category?: string;
    coverImage?: string;
    isDraft?: boolean;
}
export declare abstract class BasePlatformPublisher {
    protected browser: Browser | null;
    protected page: Page | null;
    protected isLoggedIn: boolean;
    protected platformName: string;
    protected baseUrl: string;
    constructor(platformName: string, baseUrl: string);
    protected initBrowser(): Promise<void>;
    protected closeBrowser(): Promise<void>;
    protected wait(ms: number): Promise<void>;
    protected randomWait(min?: number, max?: number): Promise<void>;
    protected safeClick(selector: string, timeout?: number): Promise<boolean>;
    protected safeType(selector: string, text: string, timeout?: number): Promise<boolean>;
    protected saveScreenshot(filename: string): Promise<void>;
    abstract login(credentials: LoginCredentials): Promise<boolean>;
    abstract publish(article: ArticlePublishData): Promise<PublishResult>;
    abstract updateArticle(articleId: string, article: ArticlePublishData): Promise<boolean>;
    abstract deleteArticle(articleId: string): Promise<boolean>;
    executePublish(credentials: LoginCredentials, article: ArticlePublishData): Promise<PublishResult>;
}
export default BasePlatformPublisher;
//# sourceMappingURL=base.d.ts.map