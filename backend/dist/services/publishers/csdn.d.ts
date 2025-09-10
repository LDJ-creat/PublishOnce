import { BasePlatformPublisher, LoginCredentials, PublishResult, ArticleData } from './base';
export interface CSDNCredentials extends LoginCredentials {
    username: string;
    password: string;
}
export declare class CSDNPublisher extends BasePlatformPublisher {
    protected platformName: string;
    protected baseUrl: string;
    login(credentials: CSDNCredentials): Promise<boolean>;
    publishArticle(article: ArticleData): Promise<PublishResult>;
    checkLoginStatus(): Promise<boolean>;
    getPublishedArticles(limit?: number): Promise<any[]>;
}
export default CSDNPublisher;
//# sourceMappingURL=csdn.d.ts.map