export { BasePlatformPublisher } from './base';
export type { LoginCredentials, PublishResult, ArticleData } from './base';
export { CSDNPublisher } from './csdn';
export type { CSDNCredentials } from './csdn';
export { JuejinPublisher } from './juejin';
export type { JuejinCredentials } from './juejin';
export { HuaweiPublisher } from './huawei';
export type { HuaweiCredentials } from './huawei';
export { WechatPublisher } from './wechat';
export type { WechatCredentials } from './wechat';
export declare function createPublisher(platform: string): BasePlatformPublisher | null;
export declare function getSupportedPlatforms(): string[];
export interface PlatformConfig {
    name: string;
    displayName: string;
    description: string;
    loginType: 'password' | 'qrcode' | 'both';
    supportedFeatures: string[];
}
export declare const platformConfigs: Record<string, PlatformConfig>;
declare const _default: {
    createPublisher: typeof createPublisher;
    getSupportedPlatforms: typeof getSupportedPlatforms;
    platformConfigs: Record<string, PlatformConfig>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map