import { BasePlatformPublisher, LoginCredentials, PublishResult, ArticleData } from './base';
export interface JuejinCredentials extends LoginCredentials {
    phone?: string;
    email?: string;
    password?: string;
}
export declare class JuejinPublisher extends BasePlatformPublisher {
    protected platformName: string;
    protected baseUrl: string;
    login(credentials: JuejinCredentials): Promise<boolean>;
    publishArticle(article: ArticleData): Promise<PublishResult>;
    checkLoginStatus(): Promise<boolean>;
    getPublishedArticles(limit?: number): Promise<any[]>;
    getArticleStats(articleUrl: string): Promise<any>;
    private parseNumber;
}
export default JuejinPublisher;
//# sourceMappingURL=juejin.d.ts.map