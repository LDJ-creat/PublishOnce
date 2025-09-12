const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');

/**
 * User data factory
 */
const generateUserData = (overrides = {}) => {
  const defaultData = {
    username: faker.internet.userName().toLowerCase(),
    email: faker.internet.email().toLowerCase(),
    password: 'password123',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    avatar: faker.image.avatar(),
    bio: faker.lorem.paragraph(),
    role: 'user',
    isActive: true,
    emailVerified: true,
    platforms: {
      csdn: {
        username: faker.internet.userName().toLowerCase(),
        profileUrl: `https://blog.csdn.net/${faker.internet.userName().toLowerCase()}`,
        isActive: faker.datatype.boolean(),
        credentials: {
          sessionId: faker.string.uuid(),
          lastLogin: faker.date.recent()
        }
      },
      juejin: {
        username: faker.internet.userName().toLowerCase(),
        profileUrl: `https://juejin.cn/user/${faker.string.numeric(12)}`,
        isActive: faker.datatype.boolean(),
        credentials: {
          userId: faker.string.numeric(12),
          token: faker.string.alphanumeric(32)
        }
      },
      zhihu: {
        username: faker.internet.userName().toLowerCase(),
        profileUrl: `https://www.zhihu.com/people/${faker.internet.userName().toLowerCase()}`,
        isActive: faker.datatype.boolean(),
        credentials: {
          cookies: faker.string.alphanumeric(64)
        }
      }
    },
    preferences: {
      defaultPublishPlatforms: faker.helpers.arrayElements(['csdn', 'juejin', 'zhihu'], { min: 1, max: 3 }),
      autoPublish: faker.datatype.boolean(),
      emailNotifications: faker.datatype.boolean(),
      theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
      language: faker.helpers.arrayElement(['zh-CN', 'en-US']),
      timezone: faker.location.timeZone()
    },
    statistics: {
      totalArticles: faker.number.int({ min: 0, max: 100 }),
      totalPublishes: faker.number.int({ min: 0, max: 200 }),
      totalViews: faker.number.int({ min: 0, max: 10000 }),
      totalLikes: faker.number.int({ min: 0, max: 1000 })
    }
  };

  return { ...defaultData, ...overrides };
};

const generateAdminUserData = (overrides = {}) => {
  return generateUserData({
    role: 'admin',
    username: 'admin_' + faker.internet.userName().toLowerCase(),
    email: 'admin_' + faker.internet.email().toLowerCase(),
    ...overrides
  });
};

/**
 * Article data factory
 */
const generateArticleData = (overrides = {}) => {
  const title = faker.lorem.sentence({ min: 3, max: 8 });
  const content = generateMarkdownContent();
  const wordCount = content.split(' ').length;
  const readingTime = Math.ceil(wordCount / 200); // Assume 200 words per minute

  const defaultData = {
    title: title,
    content: content,
    summary: faker.lorem.paragraph({ min: 2, max: 4 }),
    tags: faker.helpers.arrayElements([
      'JavaScript', 'Python', 'React', 'Node.js', 'Vue.js', 'TypeScript',
      'MongoDB', 'MySQL', 'Docker', 'AWS', 'Frontend', 'Backend',
      'DevOps', 'Machine Learning', 'AI', 'Web Development'
    ], { min: 2, max: 6 }),
    category: faker.helpers.arrayElement([
      'Technology', 'Programming', 'Web Development', 'Mobile Development',
      'Data Science', 'DevOps', 'Tutorial', 'Opinion', 'News'
    ]),
    status: faker.helpers.arrayElement(['draft', 'published', 'archived']),
    visibility: faker.helpers.arrayElement(['public', 'private', 'unlisted']),
    featuredImage: faker.image.url({ width: 800, height: 400 }),
    metadata: {
      wordCount: wordCount,
      readingTime: readingTime,
      language: faker.helpers.arrayElement(['zh-CN', 'en-US']),
      version: faker.number.int({ min: 1, max: 10 })
    },
    seo: {
      metaTitle: title + ' - SEO Optimized',
      metaDescription: faker.lorem.sentence({ min: 10, max: 20 }),
      keywords: faker.helpers.arrayElements([
        'programming', 'development', 'coding', 'tutorial', 'guide',
        'javascript', 'python', 'react', 'nodejs', 'web'
      ], { min: 3, max: 8 }),
      canonicalUrl: faker.internet.url()
    },
    engagement: {
      views: faker.number.int({ min: 0, max: 5000 }),
      likes: faker.number.int({ min: 0, max: 500 }),
      shares: faker.number.int({ min: 0, max: 100 }),
      comments: faker.number.int({ min: 0, max: 50 })
    },
    publishedAt: faker.datatype.boolean() ? faker.date.past() : null
  };

  return { ...defaultData, ...overrides };
};

const generateMarkdownContent = () => {
  const sections = [
    `# ${faker.lorem.sentence()}`,
    '',
    faker.lorem.paragraph({ min: 3, max: 5 }),
    '',
    `## ${faker.lorem.sentence({ min: 2, max: 4 })}`,
    '',
    faker.lorem.paragraph({ min: 4, max: 6 }),
    '',
    '```javascript',
    'function example() {',
    '  console.log("Hello, World!");',
    '  return true;',
    '}',
    '```',
    '',
    faker.lorem.paragraph({ min: 2, max: 4 }),
    '',
    `### ${faker.lorem.sentence({ min: 2, max: 3 })}`,
    '',
    `- ${faker.lorem.sentence()}`,
    `- ${faker.lorem.sentence()}`,
    `- ${faker.lorem.sentence()}`,
    '',
    faker.lorem.paragraph({ min: 3, max: 5 }),
    '',
    `> ${faker.lorem.sentence({ min: 5, max: 10 })}`,
    '',
    faker.lorem.paragraph({ min: 2, max: 4 })
  ];

  return sections.join('\n');
};

/**
 * Publish job data factory
 */
const generatePublishJobData = (overrides = {}) => {
  const platforms = faker.helpers.arrayElements(['csdn', 'juejin', 'zhihu'], { min: 1, max: 3 });
  const status = faker.helpers.arrayElement(['pending', 'running', 'completed', 'failed', 'cancelled']);
  
  const defaultData = {
    platforms: platforms,
    status: status,
    priority: faker.helpers.arrayElement(['low', 'normal', 'high']),
    options: {
      publishImmediately: faker.datatype.boolean(),
      scheduledTime: faker.datatype.boolean() ? faker.date.future() : null,
      customTitles: generateCustomTitles(platforms),
      customTags: generateCustomTags(platforms),
      customCategories: generateCustomCategories(platforms),
      enableComments: faker.datatype.boolean(),
      enableSharing: faker.datatype.boolean()
    },
    results: status === 'completed' ? generatePublishResults(platforms) : {},
    error: status === 'failed' ? faker.lorem.sentence() : null,
    startedAt: ['running', 'completed', 'failed'].includes(status) ? faker.date.recent() : null,
    completedAt: ['completed', 'failed', 'cancelled'].includes(status) ? faker.date.recent() : null,
    retryCount: faker.number.int({ min: 0, max: 3 }),
    maxRetries: 3
  };

  return { ...defaultData, ...overrides };
};

const generateCustomTitles = (platforms) => {
  const titles = {};
  platforms.forEach(platform => {
    if (faker.datatype.boolean()) {
      titles[platform] = faker.lorem.sentence({ min: 3, max: 8 });
    }
  });
  return titles;
};

const generateCustomTags = (platforms) => {
  const tags = {};
  platforms.forEach(platform => {
    if (faker.datatype.boolean()) {
      tags[platform] = faker.helpers.arrayElements([
        'JavaScript', 'Python', 'React', 'Vue.js', 'Node.js', 'TypeScript'
      ], { min: 2, max: 5 });
    }
  });
  return tags;
};

const generateCustomCategories = (platforms) => {
  const categories = {};
  platforms.forEach(platform => {
    if (faker.datatype.boolean()) {
      categories[platform] = faker.helpers.arrayElement([
        'Technology', 'Programming', 'Web Development', 'Tutorial'
      ]);
    }
  });
  return categories;
};

const generatePublishResults = (platforms) => {
  const results = {};
  platforms.forEach(platform => {
    results[platform] = {
      success: faker.datatype.boolean({ probability: 0.8 }), // 80% success rate
      publishedUrl: faker.datatype.boolean() ? generatePlatformUrl(platform) : null,
      publishedId: faker.datatype.boolean() ? faker.string.alphanumeric(10) : null,
      publishedAt: faker.date.recent(),
      error: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : null,
      metadata: {
        responseTime: faker.number.int({ min: 500, max: 5000 }),
        retryCount: faker.number.int({ min: 0, max: 2 })
      }
    };
  });
  return results;
};

const generatePlatformUrl = (platform) => {
  switch (platform) {
    case 'csdn':
      return `https://blog.csdn.net/${faker.internet.userName()}/article/details/${faker.string.numeric(8)}`;
    case 'juejin':
      return `https://juejin.cn/post/${faker.string.numeric(19)}`;
    case 'zhihu':
      return `https://zhuanlan.zhihu.com/p/${faker.string.numeric(9)}`;
    default:
      return faker.internet.url();
  }
};

/**
 * Scraping job data factory
 */
const generateScrapingJobData = (overrides = {}) => {
  const platforms = faker.helpers.arrayElements(['csdn', 'juejin', 'zhihu'], { min: 1, max: 3 });
  const status = faker.helpers.arrayElement(['pending', 'running', 'completed', 'failed', 'cancelled']);
  
  const defaultData = {
    platforms: platforms,
    status: status,
    options: {
      limit: faker.number.int({ min: 5, max: 50 }),
      dateRange: {
        start: faker.date.past({ years: 1 }).toISOString().split('T')[0],
        end: faker.date.recent().toISOString().split('T')[0]
      },
      enablePagination: faker.datatype.boolean(),
      rateLimitDelay: faker.number.int({ min: 1000, max: 5000 }),
      includeMetadata: faker.datatype.boolean(),
      filterKeywords: faker.datatype.boolean() ? faker.helpers.arrayElements([
        'JavaScript', 'Python', 'React', 'Vue.js'
      ], { min: 1, max: 3 }) : []
    },
    results: status === 'completed' ? generateScrapingResults(platforms) : {},
    progress: generateScrapingProgress(platforms, status),
    error: status === 'failed' ? faker.lorem.sentence() : null,
    startedAt: ['running', 'completed', 'failed'].includes(status) ? faker.date.recent() : null,
    completedAt: ['completed', 'failed', 'cancelled'].includes(status) ? faker.date.recent() : null
  };

  return { ...defaultData, ...overrides };
};

const generateScrapingResults = (platforms) => {
  const results = {};
  platforms.forEach(platform => {
    const success = faker.datatype.boolean({ probability: 0.85 }); // 85% success rate
    results[platform] = {
      success: success,
      articlesCount: success ? faker.number.int({ min: 1, max: 20 }) : 0,
      articles: success ? generateScrapedArticles(faker.number.int({ min: 1, max: 10 })) : [],
      error: !success ? faker.lorem.sentence() : null,
      metadata: {
        totalPages: faker.number.int({ min: 1, max: 5 }),
        processedPages: faker.number.int({ min: 1, max: 5 }),
        responseTime: faker.number.int({ min: 1000, max: 10000 }),
        rateLimitHits: faker.number.int({ min: 0, max: 3 })
      }
    };
  });
  return results;
};

const generateScrapedArticles = (count) => {
  const articles = [];
  for (let i = 0; i < count; i++) {
    articles.push({
      title: faker.lorem.sentence({ min: 3, max: 10 }),
      url: faker.internet.url(),
      publishedAt: faker.date.past({ years: 1 }),
      summary: faker.lorem.paragraph(),
      tags: faker.helpers.arrayElements([
        'JavaScript', 'Python', 'React', 'Vue.js', 'Node.js'
      ], { min: 1, max: 4 }),
      views: faker.number.int({ min: 10, max: 5000 }),
      likes: faker.number.int({ min: 0, max: 500 }),
      comments: faker.number.int({ min: 0, max: 100 }),
      category: faker.helpers.arrayElement([
        'Technology', 'Programming', 'Tutorial', 'Opinion'
      ])
    });
  }
  return articles;
};

const generateScrapingProgress = (platforms, status) => {
  if (status === 'pending') return {};
  
  const progress = {};
  platforms.forEach(platform => {
    const total = faker.number.int({ min: 5, max: 20 });
    let processed = 0;
    
    if (status === 'running') {
      processed = faker.number.int({ min: 1, max: total - 1 });
    } else if (status === 'completed') {
      processed = total;
    } else if (status === 'failed') {
      processed = faker.number.int({ min: 0, max: total });
    }
    
    progress[platform] = {
      processed: processed,
      total: total,
      status: status === 'running' ? 'running' : (status === 'completed' ? 'completed' : 'failed'),
      currentPage: Math.ceil(processed / 5), // Assume 5 items per page
      totalPages: Math.ceil(total / 5)
    };
  });
  return progress;
};

/**
 * Statistics data factory
 */
const generateStatisticsData = (overrides = {}) => {
  const defaultData = {
    totalArticles: faker.number.int({ min: 10, max: 1000 }),
    totalPublishes: faker.number.int({ min: 20, max: 2000 }),
    totalViews: faker.number.int({ min: 100, max: 100000 }),
    totalLikes: faker.number.int({ min: 10, max: 10000 }),
    totalComments: faker.number.int({ min: 5, max: 5000 }),
    totalShares: faker.number.int({ min: 2, max: 2000 }),
    platformStats: {
      csdn: {
        articles: faker.number.int({ min: 5, max: 500 }),
        views: faker.number.int({ min: 50, max: 50000 }),
        likes: faker.number.int({ min: 5, max: 5000 }),
        followers: faker.number.int({ min: 10, max: 10000 })
      },
      juejin: {
        articles: faker.number.int({ min: 3, max: 300 }),
        views: faker.number.int({ min: 30, max: 30000 }),
        likes: faker.number.int({ min: 3, max: 3000 }),
        followers: faker.number.int({ min: 5, max: 5000 })
      },
      zhihu: {
        articles: faker.number.int({ min: 2, max: 200 }),
        views: faker.number.int({ min: 20, max: 20000 }),
        likes: faker.number.int({ min: 2, max: 2000 }),
        followers: faker.number.int({ min: 3, max: 3000 })
      }
    },
    timeSeriesData: generateTimeSeriesData(),
    topArticles: generateTopArticlesData(),
    engagementRates: {
      averageLikeRate: faker.number.float({ min: 0.01, max: 0.1, precision: 0.001 }),
      averageCommentRate: faker.number.float({ min: 0.005, max: 0.05, precision: 0.001 }),
      averageShareRate: faker.number.float({ min: 0.001, max: 0.02, precision: 0.001 })
    }
  };

  return { ...defaultData, ...overrides };
};

const generateTimeSeriesData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    data.push({
      date: date.toISOString().split('T')[0],
      views: faker.number.int({ min: 10, max: 1000 }),
      likes: faker.number.int({ min: 1, max: 100 }),
      comments: faker.number.int({ min: 0, max: 50 }),
      shares: faker.number.int({ min: 0, max: 20 }),
      newArticles: faker.number.int({ min: 0, max: 5 })
    });
  }
  
  return data;
};

const generateTopArticlesData = () => {
  const articles = [];
  
  for (let i = 0; i < 10; i++) {
    articles.push({
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      views: faker.number.int({ min: 100, max: 10000 }),
      likes: faker.number.int({ min: 10, max: 1000 }),
      comments: faker.number.int({ min: 1, max: 100 }),
      publishedAt: faker.date.past({ years: 1 }),
      platforms: faker.helpers.arrayElements(['csdn', 'juejin', 'zhihu'], { min: 1, max: 3 })
    });
  }
  
  return articles.sort((a, b) => b.views - a.views);
};

/**
 * Batch data generation helpers
 */
const generateBatchUsers = (count = 10, overrides = {}) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(generateUserData({
      username: `testuser${i}`,
      email: `test${i}@example.com`,
      ...overrides
    }));
  }
  return users;
};

const generateBatchArticles = (count = 20, authorId = null, overrides = {}) => {
  const articles = [];
  for (let i = 0; i < count; i++) {
    articles.push(generateArticleData({
      author: authorId || new mongoose.Types.ObjectId(),
      title: `Test Article ${i + 1}`,
      ...overrides
    }));
  }
  return articles;
};

const generateBatchPublishJobs = (count = 15, userId = null, articleId = null, overrides = {}) => {
  const jobs = [];
  for (let i = 0; i < count; i++) {
    jobs.push(generatePublishJobData({
      userId: userId || new mongoose.Types.ObjectId(),
      articleId: articleId || new mongoose.Types.ObjectId(),
      ...overrides
    }));
  }
  return jobs;
};

const generateBatchScrapingJobs = (count = 10, userId = null, overrides = {}) => {
  const jobs = [];
  for (let i = 0; i < count; i++) {
    jobs.push(generateScrapingJobData({
      userId: userId || new mongoose.Types.ObjectId(),
      ...overrides
    }));
  }
  return jobs;
};

/**
 * Realistic test scenarios
 */
const generateRealisticUserScenario = () => {
  const user = generateUserData({
    platforms: {
      csdn: {
        username: 'tech_blogger_2024',
        profileUrl: 'https://blog.csdn.net/tech_blogger_2024',
        isActive: true
      },
      juejin: {
        username: 'tech_blogger_2024',
        profileUrl: 'https://juejin.cn/user/1234567890123456',
        isActive: true
      },
      zhihu: {
        username: 'tech-blogger-2024',
        profileUrl: 'https://www.zhihu.com/people/tech-blogger-2024',
        isActive: false // Not configured yet
      }
    },
    preferences: {
      defaultPublishPlatforms: ['csdn', 'juejin'],
      autoPublish: false,
      emailNotifications: true
    }
  });

  const articles = [];
  for (let i = 0; i < 5; i++) {
    articles.push(generateArticleData({
      author: user._id,
      status: i < 3 ? 'published' : 'draft',
      publishedAt: i < 3 ? faker.date.past({ days: 30 }) : null
    }));
  }

  return { user, articles };
};

module.exports = {
  // User factories
  generateUserData,
  generateAdminUserData,
  
  // Article factories
  generateArticleData,
  generateMarkdownContent,
  
  // Job factories
  generatePublishJobData,
  generateScrapingJobData,
  
  // Statistics factories
  generateStatisticsData,
  generateTimeSeriesData,
  generateTopArticlesData,
  
  // Batch generators
  generateBatchUsers,
  generateBatchArticles,
  generateBatchPublishJobs,
  generateBatchScrapingJobs,
  
  // Scenario generators
  generateRealisticUserScenario,
  
  // Helper functions
  generateCustomTitles,
  generateCustomTags,
  generateCustomCategories,
  generatePublishResults,
  generateScrapingResults,
  generateScrapedArticles,
  generatePlatformUrl
};