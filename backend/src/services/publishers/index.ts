/**
 * 发布器模块统一导出
 */

// 基础发布器
export { BasePlatformPublisher } from './base';
export type { LoginCredentials, PublishResult } from './base';

// 各平台发布器
export { CSDNPublisher } from './csdn';
export type { CSDNCredentials } from './csdn';

export { JuejinPublisher } from './juejin';
export type { JuejinCredentials } from './juejin';

export { HuaweiPublisher } from './huawei';
export type { HuaweiCredentials } from './huawei';

export { WechatPublisher } from './wechat';
export type { WechatCredentials } from './wechat';

// 发布器工厂函数
export function createPublisher(platform: string): BasePlatformPublisher | null {
  switch (platform.toLowerCase()) {
    case 'csdn':
      return new CSDNPublisher('CSDN', 'https://blog.csdn.net');
    case 'juejin':
    case '掘金':
      return new JuejinPublisher('掘金', 'https://juejin.cn');
    case 'huawei':
    case '华为':
    case '华为开发者社区':
      return new HuaweiPublisher('华为开发者社区', 'https://developer.huawei.com');
    case 'wechat':
    case '微信':
    case '微信公众号':
      return new WechatPublisher('微信公众号', 'https://mp.weixin.qq.com');
    default:
      console.warn(`不支持的发布平台: ${platform}`);
      return null;
  }
}

// 获取支持的平台列表
export function getSupportedPlatforms(): string[] {
  return ['csdn', 'juejin', 'huawei', 'wechat'];
}

// 平台配置接口
export interface PlatformConfig {
  name: string;
  displayName: string;
  description: string;
  loginType: 'password' | 'qrcode' | 'both';
  supportedFeatures: string[];
}

// 平台配置
export const platformConfigs: Record<string, PlatformConfig> = {
  csdn: {
    name: 'csdn',
    displayName: 'CSDN',
    description: 'CSDN技术博客平台',
    loginType: 'password',
    supportedFeatures: ['markdown', 'tags', 'category', 'cover', 'draft'],
  },
  juejin: {
    name: 'juejin',
    displayName: '掘金',
    description: '掘金技术社区',
    loginType: 'both',
    supportedFeatures: ['markdown', 'tags', 'category', 'cover', 'draft'],
  },
  huawei: {
    name: 'huawei',
    displayName: '华为开发者社区',
    description: '华为开发者技术社区',
    loginType: 'password',
    supportedFeatures: ['markdown', 'richtext', 'tags', 'cover', 'draft'],
  },
  wechat: {
    name: 'wechat',
    displayName: '微信公众号',
    description: '微信公众号平台',
    loginType: 'both',
    supportedFeatures: ['richtext', 'tags', 'cover', 'draft', 'schedule'],
  },
};

// 平台发布器工厂函数（别名）
export function createPlatformPublisher(platform: string): BasePlatformPublisher | null {
  return createPublisher(platform);
}

export default {
  createPublisher,
  createPlatformPublisher,
  getSupportedPlatforms,
  platformConfigs,
};