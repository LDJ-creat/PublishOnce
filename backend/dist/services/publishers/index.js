"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformConfigs = exports.WechatPublisher = exports.HuaweiPublisher = exports.JuejinPublisher = exports.CSDNPublisher = exports.BasePlatformPublisher = void 0;
exports.createPublisher = createPublisher;
exports.getSupportedPlatforms = getSupportedPlatforms;
var base_1 = require("./base");
Object.defineProperty(exports, "BasePlatformPublisher", { enumerable: true, get: function () { return base_1.BasePlatformPublisher; } });
var csdn_1 = require("./csdn");
Object.defineProperty(exports, "CSDNPublisher", { enumerable: true, get: function () { return csdn_1.CSDNPublisher; } });
var juejin_1 = require("./juejin");
Object.defineProperty(exports, "JuejinPublisher", { enumerable: true, get: function () { return juejin_1.JuejinPublisher; } });
var huawei_1 = require("./huawei");
Object.defineProperty(exports, "HuaweiPublisher", { enumerable: true, get: function () { return huawei_1.HuaweiPublisher; } });
var wechat_1 = require("./wechat");
Object.defineProperty(exports, "WechatPublisher", { enumerable: true, get: function () { return wechat_1.WechatPublisher; } });
function createPublisher(platform) {
    switch (platform.toLowerCase()) {
        case 'csdn':
            return new CSDNPublisher();
        case 'juejin':
        case '掘金':
            return new JuejinPublisher();
        case 'huawei':
        case '华为':
        case '华为开发者社区':
            return new HuaweiPublisher();
        case 'wechat':
        case '微信':
        case '微信公众号':
            return new WechatPublisher();
        default:
            console.warn(`不支持的发布平台: ${platform}`);
            return null;
    }
}
function getSupportedPlatforms() {
    return ['csdn', 'juejin', 'huawei', 'wechat'];
}
exports.platformConfigs = {
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
exports.default = {
    createPublisher,
    getSupportedPlatforms,
    platformConfigs: exports.platformConfigs,
};
//# sourceMappingURL=index.js.map