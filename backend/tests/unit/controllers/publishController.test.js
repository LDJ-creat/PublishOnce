const request = require('supertest');
const app = require('../../../src/app');
const Article = require('../../../src/models/Article');
const User = require('../../../src/models/User');
const PublishJob = require('../../../src/models/PublishJob');
const { connectDB, closeDB, clearDB, createTestUser, createAuthenticatedRequest } = require('../../utils/testHelpers');
const { generateArticleData, generatePublishJobData } = require('../../fixtures/dataFactory');
const publisherService = require('../../../src/services/publisherService');
const queueService = require('../../../src/services/queueService');

// Mock external services
jest.mock('../../../src/services/publisherService');
jest.mock('../../../src/services/queueService');

describe('Publish Controller Tests', () => {
  let testUser;
  let testArticle;
  let authToken;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();
    
    // Create test user
    testUser = await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      platforms: {
        csdn: {
          username: 'testuser_csdn',
          token: 'csdn_token_123',
          isActive: true
        },
        juejin: {
          username: 'testuser_juejin',
          token: 'juejin_token_456',
          isActive: true
        }
      }
    });

    // Create test article
    const articleData = generateArticleData({
      title: 'Test Article for Publishing',
      content: '# Test Article\n\nThis is a test article for publishing.',
      author: testUser._id,
      status: 'published',
      tags: ['test', 'publishing'],
      category: 'Technology'
    });
    testArticle = await Article.create(articleData);

    authToken = createAuthenticatedRequest(testUser);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /api/publish/article/:id', () => {
    it('should publish article to single platform successfully', async () => {
      const publishData = {
        platforms: ['csdn'],
        publishOptions: {
          csdn: {
            category: 'web',
            tags: ['javascript', 'nodejs'],
            description: 'Test article description'
          }
        }
      };

      // Mock successful publishing
      publisherService.publishToCSDN.mockResolvedValue({
        success: true,
        articleId: 'csdn_123',
        url: 'https://blog.csdn.net/testuser/article/details/csdn_123'
      });

      queueService.addPublishJob.mockResolvedValue({
        id: 'job_123',
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/publish/article/${testArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(publishData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Publishing initiated');
      expect(response.body.data.jobId).toBeDefined();
      expect(response.body.data.platforms).toEqual(['csdn']);

      // Verify queue service was called
      expect(queueService.addPublishJob).toHaveBeenCalledWith({
        articleId: testArticle._id.toString(),
        userId: testUser._id.toString(),
        platforms: ['csdn'],
        publishOptions: publishData.publishOptions
      });
    });

    it('should publish article to multiple platforms successfully', async () => {
      const publishData = {
        platforms: ['csdn', 'juejin'],
        publishOptions: {
          csdn: {
            category: 'web',
            tags: ['javascript']
          },
          juejin: {
            category: 'frontend',
            tags: ['javascript', 'vue']
          }
        }
      };

      queueService.addPublishJob.mockResolvedValue({
        id: 'job_456',
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/publish/article/${testArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(publishData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platforms).toEqual(['csdn', 'juejin']);

      expect(queueService.addPublishJob).toHaveBeenCalledWith({
        articleId: testArticle._id.toString(),
        userId: testUser._id.toString(),
        platforms: ['csdn', 'juejin'],
        publishOptions: publishData.publishOptions
      });
    });

    it('should return 404 for non-existent article', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const publishData = {
        platforms: ['csdn']
      };

      const response = await request(app)
        .post(`/api/publish/article/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(publishData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Article not found');
    });

    it('should return 403 for unauthorized user', async () => {
      const otherUser = await createTestUser({
        username: 'otheruser',
        email: 'other@example.com'
      });
      const otherAuthToken = createAuthenticatedRequest(otherUser);

      const publishData = {
        platforms: ['csdn']
      };

      const response = await request(app)
        .post(`/api/publish/article/${testArticle._id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send(publishData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should validate required platforms field', async () => {
      const publishData = {}; // Missing platforms

      const response = await request(app)
        .post(`/api/publish/article/${testArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(publishData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('platforms');
    });

    it('should validate platform availability for user', async () => {
      const publishData = {
        platforms: ['zhihu'], // User doesn't have zhihu configured
        publishOptions: {
          zhihu: {
            column: 'test-column'
          }
        }
      };

      const response = await request(app)
        .post(`/api/publish/article/${testArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(publishData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Platform not configured');
    });

    it('should handle queue service errors', async () => {
      const publishData = {
        platforms: ['csdn']
      };

      queueService.addPublishJob.mockRejectedValue(new Error('Queue service unavailable'));

      const response = await request(app)
        .post(`/api/publish/article/${testArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(publishData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to initiate publishing');
    });

    it('should require authentication', async () => {
      const publishData = {
        platforms: ['csdn']
      };

      const response = await request(app)
        .post(`/api/publish/article/${testArticle._id}`)
        .send(publishData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/publish/jobs', () => {
    beforeEach(async () => {
      // Create test publish jobs
      await PublishJob.create([
        generatePublishJobData({
          articleId: testArticle._id,
          userId: testUser._id,
          platforms: ['csdn'],
          status: 'completed',
          results: {
            csdn: {
              success: true,
              articleId: 'csdn_123',
              url: 'https://blog.csdn.net/test/123'
            }
          }
        }),
        generatePublishJobData({
          articleId: testArticle._id,
          userId: testUser._id,
          platforms: ['juejin'],
          status: 'failed',
          results: {
            juejin: {
              success: false,
              error: 'Authentication failed'
            }
          }
        })
      ]);
    });

    it('should get user publish jobs successfully', async () => {
      const response = await request(app)
        .get('/api/publish/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();

      const jobs = response.body.data.jobs;
      expect(jobs[0].userId.toString()).toBe(testUser._id.toString());
      expect(jobs[0].articleId).toBeDefined();
      expect(jobs[0].platforms).toBeDefined();
      expect(jobs[0].status).toBeDefined();
    });

    it('should filter jobs by status', async () => {
      const response = await request(app)
        .get('/api/publish/jobs?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(1);
      expect(response.body.data.jobs[0].status).toBe('completed');
    });

    it('should filter jobs by platform', async () => {
      const response = await request(app)
        .get('/api/publish/jobs?platform=csdn')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(1);
      expect(response.body.data.jobs[0].platforms).toContain('csdn');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/publish/jobs?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/publish/jobs')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/publish/jobs/:id', () => {
    let testJob;

    beforeEach(async () => {
      testJob = await PublishJob.create(generatePublishJobData({
        articleId: testArticle._id,
        userId: testUser._id,
        platforms: ['csdn', 'juejin'],
        status: 'completed',
        results: {
          csdn: {
            success: true,
            articleId: 'csdn_123',
            url: 'https://blog.csdn.net/test/123'
          },
          juejin: {
            success: false,
            error: 'Rate limit exceeded'
          }
        }
      }));
    });

    it('should get job details successfully', async () => {
      const response = await request(app)
        .get(`/api/publish/jobs/${testJob._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.job._id).toBe(testJob._id.toString());
      expect(response.body.data.job.platforms).toEqual(['csdn', 'juejin']);
      expect(response.body.data.job.results).toBeDefined();
      expect(response.body.data.job.results.csdn.success).toBe(true);
      expect(response.body.data.job.results.juejin.success).toBe(false);
    });

    it('should return 404 for non-existent job', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/publish/jobs/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Job not found');
    });

    it('should return 403 for unauthorized user', async () => {
      const otherUser = await createTestUser({
        username: 'otheruser',
        email: 'other@example.com'
      });
      const otherAuthToken = createAuthenticatedRequest(otherUser);

      const response = await request(app)
        .get(`/api/publish/jobs/${testJob._id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/publish/jobs/${testJob._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('POST /api/publish/jobs/:id/retry', () => {
    let failedJob;

    beforeEach(async () => {
      failedJob = await PublishJob.create(generatePublishJobData({
        articleId: testArticle._id,
        userId: testUser._id,
        platforms: ['csdn'],
        status: 'failed',
        results: {
          csdn: {
            success: false,
            error: 'Network timeout'
          }
        }
      }));
    });

    it('should retry failed job successfully', async () => {
      queueService.addPublishJob.mockResolvedValue({
        id: 'retry_job_123',
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/publish/jobs/${failedJob._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Retry initiated');
      expect(response.body.data.newJobId).toBeDefined();

      expect(queueService.addPublishJob).toHaveBeenCalledWith({
        articleId: testArticle._id.toString(),
        userId: testUser._id.toString(),
        platforms: ['csdn'],
        publishOptions: failedJob.publishOptions
      });
    });

    it('should not retry completed job', async () => {
      const completedJob = await PublishJob.create(generatePublishJobData({
        articleId: testArticle._id,
        userId: testUser._id,
        platforms: ['csdn'],
        status: 'completed'
      }));

      const response = await request(app)
        .post(`/api/publish/jobs/${completedJob._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot retry');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/publish/jobs/${failedJob._id}/retry`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/publish/platforms', () => {
    it('should get available platforms', async () => {
      const response = await request(app)
        .get('/api/publish/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platforms).toBeDefined();
      expect(Array.isArray(response.body.data.platforms)).toBe(true);
      
      const platforms = response.body.data.platforms;
      expect(platforms.some(p => p.name === 'csdn')).toBe(true);
      expect(platforms.some(p => p.name === 'juejin')).toBe(true);
    });

    it('should include platform configuration requirements', async () => {
      const response = await request(app)
        .get('/api/publish/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const platforms = response.body.data.platforms;
      const csdnPlatform = platforms.find(p => p.name === 'csdn');
      
      expect(csdnPlatform).toBeDefined();
      expect(csdnPlatform.requiredFields).toBeDefined();
      expect(csdnPlatform.optionalFields).toBeDefined();
      expect(csdnPlatform.description).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/publish/platforms')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('DELETE /api/publish/jobs/:id', () => {
    let testJob;

    beforeEach(async () => {
      testJob = await PublishJob.create(generatePublishJobData({
        articleId: testArticle._id,
        userId: testUser._id,
        platforms: ['csdn'],
        status: 'completed'
      }));
    });

    it('should delete job successfully', async () => {
      const response = await request(app)
        .delete(`/api/publish/jobs/${testJob._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Job deleted');

      // Verify job is deleted
      const deletedJob = await PublishJob.findById(testJob._id);
      expect(deletedJob).toBeNull();
    });

    it('should return 404 for non-existent job', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/publish/jobs/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Job not found');
    });

    it('should return 403 for unauthorized user', async () => {
      const otherUser = await createTestUser({
        username: 'otheruser',
        email: 'other@example.com'
      });
      const otherAuthToken = createAuthenticatedRequest(otherUser);

      const response = await request(app)
        .delete(`/api/publish/jobs/${testJob._id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/publish/jobs/${testJob._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });
});