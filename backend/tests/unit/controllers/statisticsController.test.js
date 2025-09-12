const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Article = require('../../../src/models/Article');
const PublishTask = require('../../../src/models/PublishTask');
const ScrapingJob = require('../../../src/models/ScrapingJob');
const { 
  setupTestDatabase, 
  createTestUser, 
  generateAuthToken,
  createTestArticle,
  createTestPublishTask,
  createTestScrapingJob,
  cleanupTestData 
} = require('../../utils/testHelpers');
const { 
  createUser, 
  createArticle, 
  createPublishTask,
  createScrapingJob 
} = require('../../fixtures/dataFactory');

describe('Statistics Controller', () => {
  let testDb;
  let testUser;
  let adminUser;
  let authToken;
  let adminToken;
  let testArticles;
  let testPublishTasks;
  let testScrapingJobs;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test users
    testUser = await createTestUser();
    adminUser = await createTestUser({ 
      username: 'admin', 
      email: 'admin@test.com',
      role: 'admin' 
    });
    
    authToken = generateAuthToken(testUser._id);
    adminToken = generateAuthToken(adminUser._id);
    
    // Create test data for statistics
    testArticles = [];
    testPublishTasks = [];
    testScrapingJobs = [];
    
    // Create articles with different statuses and dates
    for (let i = 0; i < 10; i++) {
      const article = await createTestArticle({
        author: testUser._id,
        title: `Test Article ${i + 1}`,
        status: i % 3 === 0 ? 'published' : 'draft',
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Different dates
      });
      testArticles.push(article);
    }
    
    // Create publish tasks with different statuses
    for (let i = 0; i < 15; i++) {
      const task = await createTestPublishTask({
        user: testUser._id,
        article: testArticles[i % testArticles.length]._id,
        platform: ['csdn', 'juejin', 'zhihu'][i % 3],
        status: ['pending', 'processing', 'completed', 'failed'][i % 4],
        createdAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000)
      });
      testPublishTasks.push(task);
    }
    
    // Create scraping jobs with different statuses
    for (let i = 0; i < 12; i++) {
      const job = await createTestScrapingJob({
        user: testUser._id,
        platform: ['csdn', 'juejin', 'zhihu'][i % 3],
        status: ['pending', 'running', 'completed', 'failed'][i % 4],
        createdAt: new Date(Date.now() - i * 6 * 60 * 60 * 1000)
      });
      testScrapingJobs.push(job);
    }
  });

  afterAll(async () => {
    await testDb.close();
  });

  describe('GET /api/statistics/overview', () => {
    it('should get user statistics overview', async () => {
      const response = await request(app)
        .get('/api/statistics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('articles');
      expect(response.body.data).toHaveProperty('publishTasks');
      expect(response.body.data).toHaveProperty('scrapingJobs');
      expect(response.body.data).toHaveProperty('platforms');
      
      // Verify article statistics
      expect(response.body.data.articles).toHaveProperty('total');
      expect(response.body.data.articles).toHaveProperty('published');
      expect(response.body.data.articles).toHaveProperty('draft');
      expect(response.body.data.articles.total).toBeGreaterThan(0);
      
      // Verify publish task statistics
      expect(response.body.data.publishTasks).toHaveProperty('total');
      expect(response.body.data.publishTasks).toHaveProperty('completed');
      expect(response.body.data.publishTasks).toHaveProperty('failed');
      expect(response.body.data.publishTasks).toHaveProperty('pending');
    });

    it('should get admin statistics overview with all users data', async () => {
      const response = await request(app)
        .get('/api/statistics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('totalArticles');
      expect(response.body.data).toHaveProperty('totalPublishTasks');
      expect(response.body.data).toHaveProperty('totalScrapingJobs');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/statistics/overview')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Authentication required');
    });
  });

  describe('GET /api/statistics/articles', () => {
    it('should get article statistics with time range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();
      
      const response = await request(app)
        .get('/api/statistics/articles')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('timeline');
      expect(response.body.data).toHaveProperty('categories');
      expect(response.body.data).toHaveProperty('tags');
      expect(response.body.data).toHaveProperty('summary');
      
      // Verify timeline data
      expect(Array.isArray(response.body.data.timeline)).toBe(true);
      if (response.body.data.timeline.length > 0) {
        expect(response.body.data.timeline[0]).toHaveProperty('date');
        expect(response.body.data.timeline[0]).toHaveProperty('count');
      }
    });

    it('should get article statistics by category', async () => {
      const response = await request(app)
        .get('/api/statistics/articles')
        .query({ groupBy: 'category' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });

    it('should get article statistics by status', async () => {
      const response = await request(app)
        .get('/api/statistics/articles')
        .query({ groupBy: 'status' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('statusDistribution');
      expect(Array.isArray(response.body.data.statusDistribution)).toBe(true);
    });

    it('should validate date range parameters', async () => {
      const response = await request(app)
        .get('/api/statistics/articles')
        .query({
          startDate: 'invalid-date',
          endDate: new Date().toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/statistics/publish-tasks', () => {
    it('should get publish task statistics', async () => {
      const response = await request(app)
        .get('/api/statistics/publish-tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('platforms');
      expect(response.body.data).toHaveProperty('statusDistribution');
      expect(response.body.data).toHaveProperty('timeline');
      expect(response.body.data).toHaveProperty('successRate');
      
      // Verify platform statistics
      expect(Array.isArray(response.body.data.platforms)).toBe(true);
      if (response.body.data.platforms.length > 0) {
        expect(response.body.data.platforms[0]).toHaveProperty('platform');
        expect(response.body.data.platforms[0]).toHaveProperty('total');
        expect(response.body.data.platforms[0]).toHaveProperty('completed');
        expect(response.body.data.platforms[0]).toHaveProperty('failed');
      }
    });

    it('should get publish task statistics by platform', async () => {
      const response = await request(app)
        .get('/api/statistics/publish-tasks')
        .query({ platform: 'csdn' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('platform', 'csdn');
    });

    it('should get publish task statistics with time range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();
      
      const response = await request(app)
        .get('/api/statistics/publish-tasks')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('timeline');
    });
  });

  describe('GET /api/statistics/scraping-jobs', () => {
    it('should get scraping job statistics', async () => {
      const response = await request(app)
        .get('/api/statistics/scraping-jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('platforms');
      expect(response.body.data).toHaveProperty('statusDistribution');
      expect(response.body.data).toHaveProperty('timeline');
      expect(response.body.data).toHaveProperty('dataVolume');
      
      // Verify data volume statistics
      expect(response.body.data.dataVolume).toHaveProperty('totalArticles');
      expect(response.body.data.dataVolume).toHaveProperty('totalAuthors');
      expect(response.body.data.dataVolume).toHaveProperty('averagePerJob');
    });

    it('should get scraping job statistics by platform', async () => {
      const response = await request(app)
        .get('/api/statistics/scraping-jobs')
        .query({ platform: 'juejin' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('platform', 'juejin');
    });
  });

  describe('GET /api/statistics/performance', () => {
    it('should get performance statistics', async () => {
      const response = await request(app)
        .get('/api/statistics/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('publishPerformance');
      expect(response.body.data).toHaveProperty('scrapingPerformance');
      expect(response.body.data).toHaveProperty('systemMetrics');
      
      // Verify publish performance metrics
      expect(response.body.data.publishPerformance).toHaveProperty('averageTime');
      expect(response.body.data.publishPerformance).toHaveProperty('successRate');
      expect(response.body.data.publishPerformance).toHaveProperty('throughput');
      
      // Verify scraping performance metrics
      expect(response.body.data.scrapingPerformance).toHaveProperty('averageTime');
      expect(response.body.data.scrapingPerformance).toHaveProperty('successRate');
      expect(response.body.data.scrapingPerformance).toHaveProperty('dataRate');
    });

    it('should require admin role for system metrics', async () => {
      const response = await request(app)
        .get('/api/statistics/performance')
        .query({ includeSystem: 'true' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should allow admin to access system metrics', async () => {
      const response = await request(app)
        .get('/api/statistics/performance')
        .query({ includeSystem: 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('systemMetrics');
      expect(response.body.data.systemMetrics).toHaveProperty('memory');
      expect(response.body.data.systemMetrics).toHaveProperty('cpu');
      expect(response.body.data.systemMetrics).toHaveProperty('database');
    });
  });

  describe('GET /api/statistics/trends', () => {
    it('should get trend analysis', async () => {
      const response = await request(app)
        .get('/api/statistics/trends')
        .query({ period: '7d' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('articles');
      expect(response.body.data).toHaveProperty('publishTasks');
      expect(response.body.data).toHaveProperty('scrapingJobs');
      expect(response.body.data).toHaveProperty('growth');
      
      // Verify growth metrics
      expect(response.body.data.growth).toHaveProperty('articlesGrowth');
      expect(response.body.data.growth).toHaveProperty('publishGrowth');
      expect(response.body.data.growth).toHaveProperty('scrapingGrowth');
    });

    it('should support different time periods', async () => {
      const periods = ['1d', '7d', '30d', '90d'];
      
      for (const period of periods) {
        const response = await request(app)
          .get('/api/statistics/trends')
          .query({ period })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('period', period);
      }
    });

    it('should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/statistics/trends')
        .query({ period: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/statistics/export', () => {
    it('should export statistics data as JSON', async () => {
      const response = await request(app)
        .get('/api/statistics/export')
        .query({ format: 'json' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('exportedAt');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('articles');
      expect(response.body.data).toHaveProperty('publishTasks');
      expect(response.body.data).toHaveProperty('scrapingJobs');
    });

    it('should export statistics data as CSV', async () => {
      const response = await request(app)
        .get('/api/statistics/export')
        .query({ format: 'csv', type: 'articles' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.headers['content-disposition']).toMatch(/attachment/);
      expect(typeof response.text).toBe('string');
      expect(response.text).toContain('title,status,createdAt'); // CSV headers
    });

    it('should validate export format', async () => {
      const response = await request(app)
        .get('/api/statistics/export')
        .query({ format: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate export type for CSV format', async () => {
      const response = await request(app)
        .get('/api/statistics/export')
        .query({ format: 'csv' }) // Missing type parameter
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(Article, 'aggregate').mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/statistics/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      
      // Restore mock
      Article.aggregate.mockRestore();
    });

    it('should handle invalid ObjectId parameters', async () => {
      const response = await request(app)
        .get('/api/statistics/articles')
        .query({ userId: 'invalid-id' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle missing required parameters', async () => {
      const response = await request(app)
        .get('/api/statistics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Data Validation', () => {
    it('should validate date range order', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Earlier than start
      
      const response = await request(app)
        .get('/api/statistics/articles')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('End date must be after start date');
    });

    it('should validate maximum date range', async () => {
      const startDate = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000); // More than 1 year
      const endDate = new Date();
      
      const response = await request(app)
        .get('/api/statistics/articles')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Date range cannot exceed 365 days');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/statistics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body).toHaveProperty('success', true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should implement proper caching for frequently accessed data', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/statistics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request (should be faster due to caching)
      const startTime = Date.now();
      const response2 = await request(app)
        .get('/api/statistics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(response1.body).toEqual(response2.body);
      expect(responseTime).toBeLessThan(1000); // Cached response should be fast
    });
  });
});