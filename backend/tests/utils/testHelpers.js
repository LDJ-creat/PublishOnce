const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const Article = require('../../src/models/Article');
const PublishJob = require('../../src/models/PublishJob');
const ScrapingJob = require('../../src/models/ScrapingJob');
const config = require('../../src/config/database');

/**
 * Database connection helpers
 */
const connectDB = async () => {
  try {
    // Use test database
    const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/publishonce_test';
    
    await mongoose.connect(testDbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Test database connected successfully');
  } catch (error) {
    console.error('Test database connection failed:', error.message);
    process.exit(1);
  }
};

const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error closing test database:', error.message);
  }
};

const clearDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('Test database cleared');
  } catch (error) {
    console.error('Error clearing test database:', error.message);
  }
};

/**
 * User creation and authentication helpers
 */
const createTestUser = async (userData = {}) => {
  const defaultUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    platforms: {
      csdn: {
        username: 'testuser_csdn',
        profileUrl: 'https://blog.csdn.net/testuser_csdn',
        isActive: true
      },
      juejin: {
        username: 'testuser_juejin',
        profileUrl: 'https://juejin.cn/user/123456789',
        isActive: true
      },
      zhihu: {
        username: 'testuser_zhihu',
        profileUrl: 'https://www.zhihu.com/people/testuser_zhihu',
        isActive: false
      }
    },
    preferences: {
      defaultPublishPlatforms: ['csdn', 'juejin'],
      autoPublish: false,
      emailNotifications: true
    }
  };

  const mergedUserData = { ...defaultUserData, ...userData };
  
  // Hash password if provided
  if (mergedUserData.password) {
    const salt = await bcrypt.genSalt(10);
    mergedUserData.password = await bcrypt.hash(mergedUserData.password, salt);
  }

  const user = new User(mergedUserData);
  return await user.save();
};

const createAdminUser = async (userData = {}) => {
  const adminData = {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    ...userData
  };

  return await createTestUser(adminData);
};

const generateAuthToken = (user) => {
  const payload = {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    }
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'test_jwt_secret',
    { expiresIn: '1h' }
  );
};

const createAuthenticatedRequest = (user) => {
  return generateAuthToken(user);
};

/**
 * Article creation helpers
 */
const createTestArticle = async (userId, articleData = {}) => {
  const defaultArticleData = {
    title: 'Test Article',
    content: '# Test Article\n\nThis is a test article content.',
    summary: 'This is a test article summary.',
    tags: ['test', 'article'],
    category: 'Technology',
    status: 'draft',
    author: userId,
    metadata: {
      wordCount: 100,
      readingTime: 1,
      language: 'zh-CN'
    },
    seo: {
      metaTitle: 'Test Article - SEO Title',
      metaDescription: 'Test article meta description for SEO',
      keywords: ['test', 'article', 'seo']
    }
  };

  const mergedArticleData = { ...defaultArticleData, ...articleData };
  const article = new Article(mergedArticleData);
  return await article.save();
};

const createPublishedArticle = async (userId, articleData = {}) => {
  const publishedData = {
    status: 'published',
    publishedAt: new Date(),
    ...articleData
  };

  return await createTestArticle(userId, publishedData);
};

/**
 * Publish job creation helpers
 */
const createTestPublishJob = async (userId, articleId, jobData = {}) => {
  const defaultJobData = {
    userId: userId,
    articleId: articleId,
    platforms: ['csdn', 'juejin'],
    status: 'pending',
    options: {
      publishImmediately: false,
      scheduledTime: null,
      customTitles: {},
      customTags: {},
      customCategories: {}
    }
  };

  const mergedJobData = { ...defaultJobData, ...jobData };
  const publishJob = new PublishJob(mergedJobData);
  return await publishJob.save();
};

const createCompletedPublishJob = async (userId, articleId, jobData = {}) => {
  const completedData = {
    status: 'completed',
    startedAt: new Date(Date.now() - 60000), // 1 minute ago
    completedAt: new Date(),
    results: {
      csdn: {
        success: true,
        publishedUrl: 'https://blog.csdn.net/testuser/article/details/123456',
        publishedId: '123456',
        publishedAt: new Date()
      },
      juejin: {
        success: true,
        publishedUrl: 'https://juejin.cn/post/7123456789',
        publishedId: '7123456789',
        publishedAt: new Date()
      }
    },
    ...jobData
  };

  return await createTestPublishJob(userId, articleId, completedData);
};

/**
 * Scraping job creation helpers
 */
const createTestScrapingJob = async (userId, jobData = {}) => {
  const defaultJobData = {
    userId: userId,
    platforms: ['csdn'],
    status: 'pending',
    options: {
      limit: 10,
      enablePagination: true,
      rateLimitDelay: 1000
    }
  };

  const mergedJobData = { ...defaultJobData, ...jobData };
  const scrapingJob = new ScrapingJob(mergedJobData);
  return await scrapingJob.save();
};

const createCompletedScrapingJob = async (userId, jobData = {}) => {
  const completedData = {
    status: 'completed',
    startedAt: new Date(Date.now() - 120000), // 2 minutes ago
    completedAt: new Date(),
    results: {
      csdn: {
        success: true,
        articlesCount: 5,
        articles: [
          {
            title: 'Scraped Article 1',
            url: 'https://blog.csdn.net/testuser/article/details/111111',
            publishedAt: new Date(Date.now() - 86400000), // 1 day ago
            views: 100,
            likes: 10,
            comments: 5
          },
          {
            title: 'Scraped Article 2',
            url: 'https://blog.csdn.net/testuser/article/details/222222',
            publishedAt: new Date(Date.now() - 172800000), // 2 days ago
            views: 200,
            likes: 20,
            comments: 8
          }
        ]
      }
    },
    ...jobData
  };

  return await createTestScrapingJob(userId, completedData);
};

/**
 * Mock external services
 */
const mockExternalServices = () => {
  // Mock email service
  jest.mock('../../src/services/emailService', () => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
    sendPublishNotification: jest.fn().mockResolvedValue({ success: true })
  }));

  // Mock file upload service
  jest.mock('../../src/services/uploadService', () => ({
    uploadFile: jest.fn().mockResolvedValue({
      success: true,
      url: 'https://example.com/uploads/test-file.jpg',
      filename: 'test-file.jpg'
    }),
    deleteFile: jest.fn().mockResolvedValue({ success: true })
  }));

  // Mock queue service
  jest.mock('../../src/services/queueService', () => ({
    addPublishJob: jest.fn().mockResolvedValue({ id: 'job_123', status: 'pending' }),
    addScrapingJob: jest.fn().mockResolvedValue({ id: 'scrape_job_123', status: 'pending' }),
    getJobStatus: jest.fn().mockResolvedValue({ status: 'completed' }),
    cancelJob: jest.fn().mockResolvedValue({ success: true })
  }));
};

/**
 * Test data validation helpers
 */
const validateUserResponse = (user) => {
  expect(user).toHaveProperty('_id');
  expect(user).toHaveProperty('username');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('createdAt');
  expect(user).toHaveProperty('updatedAt');
  expect(user).not.toHaveProperty('password'); // Should not expose password
};

const validateArticleResponse = (article) => {
  expect(article).toHaveProperty('_id');
  expect(article).toHaveProperty('title');
  expect(article).toHaveProperty('content');
  expect(article).toHaveProperty('author');
  expect(article).toHaveProperty('status');
  expect(article).toHaveProperty('createdAt');
  expect(article).toHaveProperty('updatedAt');
};

const validatePublishJobResponse = (job) => {
  expect(job).toHaveProperty('_id');
  expect(job).toHaveProperty('userId');
  expect(job).toHaveProperty('articleId');
  expect(job).toHaveProperty('platforms');
  expect(job).toHaveProperty('status');
  expect(job).toHaveProperty('createdAt');
  expect(job).toHaveProperty('updatedAt');
};

const validateScrapingJobResponse = (job) => {
  expect(job).toHaveProperty('_id');
  expect(job).toHaveProperty('userId');
  expect(job).toHaveProperty('platforms');
  expect(job).toHaveProperty('status');
  expect(job).toHaveProperty('createdAt');
  expect(job).toHaveProperty('updatedAt');
};

/**
 * API response validation helpers
 */
const validateSuccessResponse = (response, expectedData = null) => {
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('message');
  
  if (expectedData) {
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toMatchObject(expectedData);
  }
};

const validateErrorResponse = (response, expectedMessage = null) => {
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('message');
  
  if (expectedMessage) {
    expect(response.body.message).toContain(expectedMessage);
  }
};

const validatePaginationResponse = (response) => {
  expect(response.body.data).toHaveProperty('pagination');
  expect(response.body.data.pagination).toHaveProperty('page');
  expect(response.body.data.pagination).toHaveProperty('limit');
  expect(response.body.data.pagination).toHaveProperty('total');
  expect(response.body.data.pagination).toHaveProperty('pages');
};

/**
 * Time and date helpers
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const getDateRange = (days = 30) => {
  const end = new Date();
  const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

/**
 * Environment setup helpers
 */
const setupTestEnvironment = () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
  process.env.BCRYPT_ROUNDS = '4'; // Faster hashing for tests
  
  // Mock console methods to reduce test output noise
  if (process.env.SILENT_TESTS === 'true') {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
  }
};

const teardownTestEnvironment = () => {
  // Restore console methods
  if (process.env.SILENT_TESTS === 'true') {
    console.log.mockRestore?.();
    console.info.mockRestore?.();
    console.warn.mockRestore?.();
  }
};

/**
 * Performance testing helpers
 */
const measureExecutionTime = async (fn) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  
  return {
    result,
    executionTime: Number(end - start) / 1000000 // Convert to milliseconds
  };
};

const createLoadTestData = async (count = 100) => {
  const users = [];
  const articles = [];
  
  // Create test users
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      username: `testuser${i}`,
      email: `test${i}@example.com`
    });
    users.push(user);
    
    // Create articles for each user
    for (let j = 0; j < 5; j++) {
      const article = await createTestArticle(user._id, {
        title: `Test Article ${i}-${j}`,
        content: `# Test Article ${i}-${j}\n\nContent for article ${j} by user ${i}.`
      });
      articles.push(article);
    }
  }
  
  return { users, articles };
};

module.exports = {
  // Database helpers
  connectDB,
  closeDB,
  clearDB,
  
  // User helpers
  createTestUser,
  createAdminUser,
  generateAuthToken,
  createAuthenticatedRequest,
  
  // Article helpers
  createTestArticle,
  createPublishedArticle,
  
  // Job helpers
  createTestPublishJob,
  createCompletedPublishJob,
  createTestScrapingJob,
  createCompletedScrapingJob,
  
  // Mock helpers
  mockExternalServices,
  
  // Validation helpers
  validateUserResponse,
  validateArticleResponse,
  validatePublishJobResponse,
  validateScrapingJobResponse,
  validateSuccessResponse,
  validateErrorResponse,
  validatePaginationResponse,
  
  // Utility helpers
  sleep,
  getDateRange,
  setupTestEnvironment,
  teardownTestEnvironment,
  measureExecutionTime,
  createLoadTestData
};