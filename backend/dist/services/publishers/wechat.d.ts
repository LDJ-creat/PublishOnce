import { BasePlatformPublisher, LoginCredentials, PublishResult, ArticleData } from './base';
export interface WechatCredentials extends LoginCredentials {
    username: string;
    password: string;
}
export declare class WechatPublisher extends BasePlatformPublisher {
    protected platformName: string;
    protected baseUrl: string;
    login(credentials: WechatCredentials): Promise<boolean>;
    publishArticle(article: ArticleData): Promise<PublishResult>;
    private getToken;
    private convertMarkdownToHtml;
    checkLoginStatus(): Promise<boolean>;
}
export default WechatPublisher;
//# sourceMappingURL=wechat.d.ts.map