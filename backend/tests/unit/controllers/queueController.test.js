const request = require('supertest');
const app = require('../../../src/app');
const queueService = require('../../../src/services/queueService');
const { 
  setupTestDatabase, 
  createTestUser, 
  authenticateUser,
  createTestArticle,
  cleanupTestData 
} = require('../../utils/testHelpers');
const { 
  createUser, 
  createArticle 
} = require('../../fixtures/dataFactory');

// Mock queue service
jest.mock('../../../src/services/queueService');

describe('Queue Controller', () => {
  let testDb;
  let testUser;
  let adminUser;
  let authToken;
  let adminToken;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test users
    testUser = await createTestUser();
    adminUser = await createTestUser({ role: 'admin' });
    
    // Get auth tokens
    authToken = await authenticateUser(testUser);
    adminToken = await authenticateUser(adminUser);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await testDb.close();
  });

  describe('POST /api/queue/publish', () => {
    it('should add publish job to queue', async () => {
      const article = await createTestArticle({ author: testUser._id });
      const jobData = {
        articleId: article._id,
        platform: 'csdn',
        config: {
          title: article.title,
          content: article.content,
          tags: article.tags
        }
      };
      
      const mockJob = {
        id: 'job_123',
        data: jobData,
        opts: {},
        toJSON: () => ({ id: 'job_123', data: jobData })
      };
      
      queueService.addPublishJob.mockResolvedValue(mockJob);
      
      const response = await request(app)
        .post('/api/queue/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.job).toHaveProperty('id', 'job_123');
      expect(queueService.addPublishJob).toHaveBeenCalledWith(
        expect.objectContaining({
          ...jobData,
          userId: testUser._id
        })
      );
    });

    it('should add batch publish jobs', async () => {
      const article = await createTestArticle({ author: testUser._id });
      const jobData = {
        articleId: article._id,
        platforms: ['csdn', 'juejin', 'zhihu']
      };
      
      const mockJobs = [
        { id: 'job_1', data: { platform: 'csdn' } },
        { id: 'job_2', data: { platform: 'juejin' } },
        { id: 'job_3', data: { platform: 'zhihu' } }
      ];
      
      queueService.addBatchPublishJobs.mockResolvedValue(mockJobs);
      
      const response = await request(app)
        .post('/api/queue/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(3);
      expect(queueService.addBatchPublishJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          ...jobData,
          userId: testUser._id
        })
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        platform: 'csdn'
        // Missing articleId
      };
      
      const response = await request(app)
        .post('/api/queue/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('articleId is required');
    });

    it('should require authentication', async () => {
      const jobData = {
        articleId: 'article_id',
        platform: 'csdn'
      };
      
      await request(app)
        .post('/api/queue/publish')
        .send(jobData)
        .expect(401);
    });

    it('should handle queue service errors', async () => {
      const article = await createTestArticle({ author: testUser._id });
      const jobData = {
        articleId: article._id,
        platform: 'csdn'
      };
      
      queueService.addPublishJob.mockRejectedValue(new Error('Queue error'));
      
      const response = await request(app)
        .post('/api/queue/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Queue error');
    });
  });

  describe('POST /api/queue/scraping', () => {
    it('should add scraping job to queue', async () => {
      const jobData = {
        platform: 'csdn',
        config: {
          username: 'testuser',
          maxPages: 5
        }
      };
      
      const mockJob = {
        id: 'scraping_job_123',
        data: jobData,
        toJSON: () => ({ id: 'scraping_job_123', data: jobData })
      };
      
      queueService.addScrapingJob.mockResolvedValue(mockJob);
      
      const response = await request(app)
        .post('/api/queue/scraping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.job).toHaveProperty('id', 'scraping_job_123');
      expect(queueService.addScrapingJob).toHaveBeenCalledWith(
        expect.objectContaining({
          ...jobData,
          userId: testUser._id
        })
      );
    });

    it('should add recurring scraping job', async () => {
      const jobData = {
        platform: 'juejin',
        config: {
          schedule: '0 */6 * * *',
          username: 'testuser'
        }
      };
      
      const mockJob = {
        id: 'recurring_job_123',
        data: jobData,
        opts: { repeat: { cron: '0 */6 * * *' } }
      };
      
      queueService.addRecurringScrapingJob.mockResolvedValue(mockJob);
      
      const response = await request(app)
        .post('/api/queue/scraping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(queueService.addRecurringScrapingJob).toHaveBeenCalledWith(
        expect.objectContaining({
          ...jobData,
          userId: testUser._id
        })
      );
    });

    it('should validate platform support', async () => {
      const jobData = {
        platform: 'unsupported_platform',
        config: {
          username: 'testuser'
        }
      };
      
      const response = await request(app)
        .post('/api/queue/scraping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unsupported platform');
    });
  });

  describe('GET /api/queue/:queueName/jobs', () => {
    it('should get jobs from queue', async () => {
      const mockJobs = [
        {
          id: 'job_1',
          data: { articleId: 'article_1', platform: 'csdn' },
          progress: 100,
          returnvalue: { success: true },
          processedOn: Date.now(),
          finishedOn: Date.now()
        },
        {
          id: 'job_2',
          data: { articleId: 'article_2', platform: 'juejin' },
          progress: 50,
          processedOn: Date.now()
        }
      ];
      
      queueService.getJobs.mockResolvedValue(mockJobs);
      
      const response = await request(app)
        .get('/api/queue/publish/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'completed', limit: 10 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(2);
      expect(queueService.getJobs).toHaveBeenCalledWith(
        'publish',
        'completed',
        expect.objectContaining({ limit: 10 })
      );
    });

    it('should filter jobs by user', async () => {
      const mockJobs = [
        {
          id: 'job_1',
          data: { userId: testUser._id, platform: 'csdn' }
        }
      ];
      
      queueService.getJobs.mockResolvedValue(mockJobs);
      
      const response = await request(app)
        .get('/api/queue/publish/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(1);
      expect(response.body.data.jobs[0].data.userId).toBe(testUser._id.toString());
    });

    it('should allow admin to see all jobs', async () => {
      const mockJobs = [
        { id: 'job_1', data: { userId: 'user_1' } },
        { id: 'job_2', data: { userId: 'user_2' } }
      ];
      
      queueService.getJobs.mockResolvedValue(mockJobs);
      
      const response = await request(app)
        .get('/api/queue/publish/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(2);
    });

    it('should validate queue name', async () => {
      const response = await request(app)
        .get('/api/queue/invalid_queue/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid queue name');
    });
  });

  describe('GET /api/queue/:queueName/jobs/:jobId', () => {
    it('should get specific job details', async () => {
      const mockJob = {
        id: 'job_123',
        data: { 
          userId: testUser._id,
          articleId: 'article_1',
          platform: 'csdn'
        },
        progress: 75,
        processedOn: Date.now(),
        opts: { attempts: 3 },
        toJSON: function() { return this; }
      };
      
      queueService.getJob.mockResolvedValue(mockJob);
      
      const response = await request(app)
        .get('/api/queue/publish/jobs/job_123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.job).toHaveProperty('id', 'job_123');
      expect(queueService.getJob).toHaveBeenCalledWith('publish', 'job_123');
    });

    it('should not allow user to access other users jobs', async () => {
      const mockJob = {
        id: 'job_123',
        data: { 
          userId: 'other_user_id',
          platform: 'csdn'
        }
      };
      
      queueService.getJob.mockResolvedValue(mockJob);
      
      const response = await request(app)
        .get('/api/queue/publish/jobs/job_123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    it('should return 404 for non-existent job', async () => {
      queueService.getJob.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/queue/publish/jobs/non_existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Job not found');
    });
  });

  describe('POST /api/queue/:queueName/jobs/:jobId/retry', () => {
    it('should retry failed job', async () => {
      const mockJob = {
        id: 'job_123',
        data: { 
          userId: testUser._id,
          platform: 'csdn'
        },
        getState: () => 'failed'
      };
      
      queueService.getJob.mockResolvedValue(mockJob);
      queueService.retryJob.mockResolvedValue(mockJob);
      
      const response = await request(app)
        .post('/api/queue/publish/jobs/job_123/retry')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Job retried successfully');
      expect(queueService.retryJob).toHaveBeenCalledWith('publish', 'job_123');
    });

    it('should not retry non-failed jobs', async () => {
      const mockJob = {
        id: 'job_123',
        data: { 
          userId: testUser._id,
          platform: 'csdn'
        },
        getState: () => 'completed'
      };
      
      queueService.getJob.mockResolvedValue(mockJob);
      
      const response = await request(app)
        .post('/api/queue/publish/jobs/job_123/retry')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Job is not in failed state');
    });

    it('should require job ownership', async () => {
      const mockJob = {
        id: 'job_123',
        data: { 
          userId: 'other_user_id',
          platform: 'csdn'
        },
        getState: () => 'failed'
      };
      
      queueService.getJob.mockResolvedValue(mockJob);
      
      const response = await request(app)
        .post('/api/queue/publish/jobs/job_123/retry')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('DELETE /api/queue/:queueName/jobs/:jobId', () => {
    it('should remove job from queue', async () => {
      const mockJob = {
        id: 'job_123',
        data: { 
          userId: testUser._id,
          platform: 'csdn'
        }
      };
      
      queueService.getJob.mockResolvedValue(mockJob);
      queueService.removeJob.mockResolvedValue(true);
      
      const response = await request(app)
        .delete('/api/queue/publish/jobs/job_123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Job removed successfully');
      expect(queueService.removeJob).toHaveBeenCalledWith('publish', 'job_123');
    });

    it('should require job ownership for removal', async () => {
      const mockJob = {
        id: 'job_123',
        data: { 
          userId: 'other_user_id',
          platform: 'csdn'
        }
      };
      
      queueService.getJob.mockResolvedValue(mockJob);
      
      const response = await request(app)
        .delete('/api/queue/publish/jobs/job_123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    it('should allow admin to remove any job', async () => {
      const mockJob = {
        id: 'job_123',
        data: { 
          userId: 'other_user_id',
          platform: 'csdn'
        }
      };
      
      queueService.getJob.mockResolvedValue(mockJob);
      queueService.removeJob.mockResolvedValue(true);
      
      const response = await request(app)
        .delete('/api/queue/publish/jobs/job_123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(queueService.removeJob).toHaveBeenCalledWith('publish', 'job_123');
    });
  });

  describe('GET /api/queue/:queueName/status', () => {
    it('should get queue status', async () => {
      const mockStatus = {
        name: 'publish',
        counts: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          delayed: 1,
          paused: 0
        },
        isPaused: false,
        isReady: true
      };
      
      queueService.getQueueStatus.mockResolvedValue(mockStatus);
      
      const response = await request(app)
        .get('/api/queue/publish/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toEqual(mockStatus);
      expect(queueService.getQueueStatus).toHaveBeenCalledWith('publish');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/queue/publish/status')
        .expect(401);
    });
  });

  describe('GET /api/queue/status', () => {
    it('should get all queue statuses for admin', async () => {
      const mockStatuses = [
        {
          name: 'publish',
          counts: { waiting: 5, active: 2, completed: 100, failed: 3 },
          isPaused: false
        },
        {
          name: 'scraping',
          counts: { waiting: 2, active: 1, completed: 50, failed: 1 },
          isPaused: false
        },
        {
          name: 'email',
          counts: { waiting: 0, active: 0, completed: 200, failed: 5 },
          isPaused: false
        }
      ];
      
      queueService.getAllQueueStatuses.mockResolvedValue(mockStatuses);
      
      const response = await request(app)
        .get('/api/queue/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.statuses).toHaveLength(3);
      expect(queueService.getAllQueueStatuses).toHaveBeenCalled();
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/queue/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });
  });

  describe('POST /api/queue/:queueName/pause', () => {
    it('should pause queue (admin only)', async () => {
      queueService.pauseQueue.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/queue/publish/pause')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Queue paused successfully');
      expect(queueService.pauseQueue).toHaveBeenCalledWith('publish');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/queue/publish/pause')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });
  });

  describe('POST /api/queue/:queueName/resume', () => {
    it('should resume queue (admin only)', async () => {
      queueService.resumeQueue.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/queue/publish/resume')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Queue resumed successfully');
      expect(queueService.resumeQueue).toHaveBeenCalledWith('publish');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/queue/publish/resume')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });
  });

  describe('POST /api/queue/:queueName/clean', () => {
    it('should clean completed jobs (admin only)', async () => {
      queueService.cleanJobs.mockResolvedValue([]);
      
      const response = await request(app)
        .post('/api/queue/publish/clean')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          status: 'completed',
          olderThan: 24 * 60 * 60 * 1000 // 24 hours
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Jobs cleaned successfully');
      expect(queueService.cleanJobs).toHaveBeenCalledWith(
        'publish',
        'completed',
        24 * 60 * 60 * 1000
      );
    });

    it('should validate clean parameters', async () => {
      const response = await request(app)
        .post('/api/queue/publish/clean')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          status: 'invalid_status'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .post('/api/queue/publish/clean')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });
  });

  describe('GET /api/queue/metrics', () => {
    it('should get queue metrics (admin only)', async () => {
      const mockMetrics = {
        publish: {
          totalJobs: 150,
          completedJobs: 140,
          failedJobs: 5,
          averageProcessingTime: 2500,
          throughput: 50
        },
        scraping: {
          totalJobs: 75,
          completedJobs: 70,
          failedJobs: 2,
          averageProcessingTime: 15000,
          throughput: 10
        }
      };
      
      queueService.getQueueMetrics.mockImplementation((queueName) => 
        Promise.resolve(mockMetrics[queueName])
      );
      
      const response = await request(app)
        .get('/api/queue/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toHaveProperty('publish');
      expect(response.body.data.metrics).toHaveProperty('scraping');
    });

    it('should require admin role', async () => {
      const response = await request(app)
        .get('/api/queue/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });
  });

  describe('Error Handling', () => {
    it('should handle queue service errors gracefully', async () => {
      queueService.getQueueStatus.mockRejectedValue(new Error('Service unavailable'));
      
      const response = await request(app)
        .get('/api/queue/publish/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Service unavailable');
    });

    it('should handle invalid queue names', async () => {
      const response = await request(app)
        .get('/api/queue/invalid_queue/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid queue name');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/api/queue/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json')
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to queue operations', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .get('/api/queue/publish/status')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});