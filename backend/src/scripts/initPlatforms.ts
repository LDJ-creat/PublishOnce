import mongoose from 'mongoose';
import { Platform } from '../models/Platform';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 预设平台配置
const defaultPlatforms = [
  {
    name: 'csdn',
    displayName: 'CSDN',
    description: 'CSDN是全球知名中文IT技术交流平台，拥有超过3100万注册用户',
    icon: 'https://g.csdnimg.cn/static/logo/favicon32.ico',
    apiEndpoint: 'https://blog.csdn.net',
    authType: 'username_password',
    supportedFeatures: ['publish', 'draft', 'tags', 'categories'],
    config: {
      maxTitleLength: 100,
      maxContentLength: 100000,
      supportedFormats: ['markdown', 'html'],
      requiresCategory: true,
      maxTags: 5
    },
    isActive: true
  },
  {
    name: 'juejin',
    displayName: '掘金',
    description: '掘金是面向全球中文开发者的技术内容分享与交流平台',
    icon: 'https://lf3-cdn-tos.bytescm.com/obj/static/xitu_juejin_web/static/favicons/favicon-32x32.png',
    apiEndpoint: 'https://api.juejin.cn',
    authType: 'token',
    supportedFeatures: ['publish', 'draft', 'tags', 'categories'],
    config: {
      maxTitleLength: 80,
      maxContentLength: 200000,
      supportedFormats: ['markdown'],
      requiresCategory: true,
      maxTags: 3
    },
    isActive: true
  },
  {
    name: 'huawei',
    displayName: '华为云开发者社区',
    description: '华为云开发者社区，助力开发者成长，与千万开发者一起学习、交流、成长',
    icon: 'https://res-static.hc-cdn.cn/cloudbu-site/china/zh-cn/header/header-logo1.svg',
    apiEndpoint: 'https://developer.huaweicloud.com',
    authType: 'api_key',
    supportedFeatures: ['publish', 'draft', 'tags', 'categories'],
    config: {
      maxTitleLength: 120,
      maxContentLength: 150000,
      supportedFormats: ['markdown', 'html'],
      requiresCategory: true,
      maxTags: 8
    },
    isActive: true
  },
  {
    name: 'hexo',
    displayName: 'Hexo 博客',
    description: 'Hexo是一个快速、简洁且高效的博客框架，支持静态网站生成',
    icon: 'https://hexo.io/icon/favicon-32x32.png',
    apiEndpoint: '',
    authType: 'api_key',
    supportedFeatures: ['publish', 'draft', 'schedule', 'tags', 'categories', 'images'],
    config: {
      maxTitleLength: 200,
      maxContentLength: 500000,
      supportedFormats: ['markdown'],
      requiresCategory: false,
      maxTags: 20,
      supportsFrontMatter: true,
      supportsAssets: true
    },
    isActive: true
  },
  {
    name: 'github',
    displayName: 'GitHub Pages',
    description: 'GitHub Pages是GitHub提供的静态网站托管服务',
    icon: 'https://github.githubassets.com/favicons/favicon-32x32.png',
    apiEndpoint: 'https://api.github.com',
    authType: 'token',
    supportedFeatures: ['publish', 'draft', 'schedule', 'tags', 'categories', 'images'],
    config: {
      maxTitleLength: 200,
      maxContentLength: 1000000,
      supportedFormats: ['markdown'],
      requiresCategory: false,
      maxTags: 50,
      supportsFrontMatter: true,
      supportsAssets: true,
      requiresRepo: true
    },
    isActive: true
  },
  {
    name: 'wordpress',
    displayName: 'WordPress',
    description: 'WordPress是全球最受欢迎的内容管理系统和博客平台',
    icon: 'https://s.w.org/favicon.ico',
    apiEndpoint: '',
    authType: 'username_password',
    supportedFeatures: ['publish', 'draft', 'schedule', 'tags', 'categories', 'images'],
    config: {
      maxTitleLength: 200,
      maxContentLength: 2000000,
      supportedFormats: ['html', 'markdown'],
      requiresCategory: false,
      maxTags: 100,
      supportsCustomFields: true,
      supportsMedia: true
    },
    isActive: true
  },
  {
    name: 'medium',
    displayName: 'Medium',
    description: 'Medium是一个在线发布平台，专注于高质量的内容创作和分享',
    icon: 'https://miro.medium.com/v2/1*m-R_BkNf1Qjr1YbyOIJY2w.png',
    apiEndpoint: 'https://api.medium.com',
    authType: 'token',
    supportedFeatures: ['publish', 'draft', 'tags'],
    config: {
      maxTitleLength: 100,
      maxContentLength: 100000,
      supportedFormats: ['markdown', 'html'],
      requiresCategory: false,
      maxTags: 5,
      supportsSubtitle: true
    },
    isActive: false // 默认禁用，需要用户手动启用
  }
];

/**
 * 初始化平台数据
 */
async function initPlatforms() {
  try {
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/publishonce';
    await mongoose.connect(mongoUri);
    console.log('数据库连接成功');

    // 检查是否已经初始化过
    const existingPlatforms = await Platform.countDocuments();
    if (existingPlatforms > 0) {
      console.log(`数据库中已存在 ${existingPlatforms} 个平台配置，跳过初始化`);
      return;
    }

    // 批量插入平台配置
    const result = await Platform.insertMany(defaultPlatforms);
    console.log(`成功初始化 ${result.length} 个平台配置:`);
    
    result.forEach(platform => {
      console.log(`- ${platform.displayName} (${platform.name})`);
    });

    console.log('\n平台初始化完成！');
  } catch (error) {
    console.error('初始化平台配置失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

/**
 * 更新现有平台配置
 */
async function updatePlatforms() {
  try {
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/publishonce';
    await mongoose.connect(mongoUri);
    console.log('数据库连接成功');

    let updatedCount = 0;
    let createdCount = 0;

    for (const platformData of defaultPlatforms) {
      const existingPlatform = await Platform.findOne({ name: platformData.name });
      
      if (existingPlatform) {
        // 更新现有平台
        await Platform.findOneAndUpdate(
          { name: platformData.name },
          { 
            ...platformData,
            updatedAt: new Date()
          },
          { new: true }
        );
        updatedCount++;
        console.log(`更新平台: ${platformData.displayName}`);
      } else {
        // 创建新平台
        await Platform.create(platformData);
        createdCount++;
        console.log(`创建平台: ${platformData.displayName}`);
      }
    }

    console.log(`\n平台配置更新完成！`);
    console.log(`- 更新: ${updatedCount} 个`);
    console.log(`- 创建: ${createdCount} 个`);
  } catch (error) {
    console.error('更新平台配置失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 命令行参数处理
const command = process.argv[2];

switch (command) {
  case 'init':
    initPlatforms();
    break;
  case 'update':
    updatePlatforms();
    break;
  default:
    console.log('使用方法:');
    console.log('  npm run init-platforms init    # 初始化平台配置（仅在数据库为空时）');
    console.log('  npm run init-platforms update  # 更新平台配置（更新现有，创建缺失）');
    process.exit(1);
}