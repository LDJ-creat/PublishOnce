import { BasePlatformPublisher, LoginCredentials, PublishResult, ArticleData } from './base';
export interface HuaweiCredentials extends LoginCredentials {
    username: string;
    password: string;
}
export declare class HuaweiPublisher extends BasePlatformPublisher {
    protected platformName: string;
    protected baseUrl: string;
    login(credentials: HuaweiCredentials): Promise<boolean>;
    publishArticle(article: ArticleData): Promise<PublishResult>;
    checkLoginStatus(): Promise<boolean>;
    getPublishedArticles(limit?: number): Promise<any[]>;
    private convertMarkdownToHtml;
    getArticleStats(articleUrl: string): Promise<any>;
    private parseNumber;
}
export default HuaweiPublisher;
//# sourceMappingURL=huawei.d.ts.map