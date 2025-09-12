const request = require('supertest');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const ScrapingJob = require('../../../src/models/ScrapingJob');
const Article = require('../../../src/models/Article');
const { connectDB, closeDB, clearDB, createTestUser, createAuthenticatedRequest } = require('../../utils/testHelpers');
const { generateScrapingJobData } = require('../../fixtures/dataFactory');
const scraperService = require('../../../src/services/scraperService');
const queueService = require('../../../src/services/queueService');

// Mock external services
jest.mock('../../../src/services/scraperService');
jest.mock('../../../src/services/queueService');

describe('Scraper Controller Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();
    
    // Create test user with platform configurations
    testUser = await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
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
      }
    });

    authToken = createAuthenticatedRequest(testUser);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /api/scraper/scrape', () => {
    it('should initiate scraping for single platform successfully', async () => {
      const scrapeData = {
        platforms: ['csdn'],
        options: {
          limit: 10,
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          },
          enablePagination: true
        }
      };

      // Mock successful job creation
      queueService.addScrapingJob.mockResolvedValue({
        id: 'scrape_job_123',
        status: 'pending'
      });

      const response = await request(app)
        .post('/api/scraper/scrape')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scrapeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Scraping initiated');
      expect(response.body.data.jobId).toBe('scrape_job_123');
      expect(response.body.data.platforms).toEqual(['csdn']);

      // Verify queue service was called
      expect(queueService.addScrapingJob).toHaveBeenCalledWith({
        userId: testUser._id.toString(),
        platforms: ['csdn'],
        options: scrapeData.options
      });
    });

    it('should initiate scraping for multiple platforms successfully', async () => {
      const scrapeData = {
        platforms: ['csdn', 'juejin'],
        options: {
          limit: 20,
          rateLimitDelay: 2000
        }
      };

      queueService.addScrapingJob.mockResolvedValue({
        id: 'scrape_job_456',
        status: 'pending'
      });

      const response = await request(app)
        .post('/api/scraper/scrape')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scrapeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platforms).toEqual(['csdn', 'juejin']);

      expect(queueService.addScrapingJob).toHaveBeenCalledWith({
        userId: testUser._id.toString(),
        platforms: ['csdn', 'juejin'],
        options: scrapeData.options
      });
    });

    it('should validate required platforms field', async () => {
      const scrapeData = {
        options: {
          limit: 10
        }
        // Missing platforms
      };

      const response = await request(app)
        .post('/api/scraper/scrape')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scrapeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('platforms');
    });

    it('should validate platform availability for user', async () => {
      const scrapeData = {
        platforms: ['zhihu'], // User has zhihu but it's not active
        options: {
          limit: 5
        }
      };

      const response = await request(app)
        .post('/api/scraper/scrape')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scrapeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Platform not active');
    });

    it('should validate unsupported platforms', async () => {
      const scrapeData = {
        platforms: ['unsupported-platform'],
        options: {
          limit: 5
        }
      };

      const response = await request(app)
        .post('/api/scraper/scrape')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scrapeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unsupported platform');
    });

    it('should validate scraping options', async () => {
      const scrapeData = {
        platforms: ['csdn'],
        options: {
          limit: -1, // Invalid limit
          dateRange: {
            start: '2024-01-31',
            end: '2024-01-01' // End before start
          }
        }
      };

      const response = await request(app)
        .post('/api/scraper/scrape')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scrapeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid options');
    });

    it('should handle queue service errors', async () => {
      const scrapeData = {
        platforms: ['csdn'],
        options: {
          limit: 10
        }
      };

      queueService.addScrapingJob.mockRejectedValue(new Error('Queue service unavailable'));

      const response = await request(app)
        .post('/api/scraper/scrape')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scrapeData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to initiate scraping');
    });

    it('should require authentication', async () => {
      const scrapeData = {
        platforms: ['csdn'],
        options: { limit: 10 }
      };

      const response = await request(app)
        .post('/api/scraper/scrape')
        .send(scrapeData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/scraper/jobs', () => {
    beforeEach(async () => {
      // Create test scraping jobs
      await ScrapingJob.create([
        generateScrapingJobData({
          userId: testUser._id,
          platforms: ['csdn'],
          status: 'completed',
          results: {
            csdn: {
              success: true,
              articlesCount: 5,
              articles: []
            }
          },
          completedAt: new Date()
        }),
        generateScrapingJobData({
          userId: testUser._id,
          platforms: ['juejin'],
          status: 'failed',
          results: {
            juejin: {
              success: false,
              error: 'Rate limit exceeded'
            }
          },
          completedAt: new Date()
        }),
        generateScrapingJobData({
          userId: testUser._id,
          platforms: ['csdn', 'juejin'],
          status: 'running'
        })
      ]);
    });

    it('should get user scraping jobs successfully', async () => {
      const response = await request(app)
        .get('/api/scraper/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();

      const jobs = response.body.data.jobs;
      expect(jobs[0].userId.toString()).toBe(testUser._id.toString());
      expect(jobs[0].platforms).toBeDefined();
      expect(jobs[0].status).toBeDefined();
    });

    it('should filter jobs by status', async () => {
      const response = await request(app)
        .get('/api/scraper/jobs?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(1);
      expect(response.body.data.jobs[0].status).toBe('completed');
    });

    it('should filter jobs by platform', async () => {
      const response = await request(app)
        .get('/api/scraper/jobs?platform=csdn')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(2); // Two jobs include csdn
      expect(response.body.data.jobs.every(job => 
        job.platforms.includes('csdn')
      )).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/scraper/jobs?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(3);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/scraper/jobs')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/scraper/jobs/:id', () => {
    let testJob;

    beforeEach(async () => {
      testJob = await ScrapingJob.create(generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn', 'juejin'],
        status: 'completed',
        options: {
          limit: 10,
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          }
        },
        results: {
          csdn: {
            success: true,
            articlesCount: 8,
            articles: []
          },
          juejin: {
            success: true,
            articlesCount: 5,
            articles: []
          }
        },
        completedAt: new Date()
      }));
    });

    it('should get job details successfully', async () => {
      const response = await request(app)
        .get(`/api/scraper/jobs/${testJob._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.job._id).toBe(testJob._id.toString());
      expect(response.body.data.job.platforms).toEqual(['csdn', 'juejin']);
      expect(response.body.data.job.status).toBe('completed');
      expect(response.body.data.job.results).toBeDefined();
      expect(response.body.data.job.results.csdn.success).toBe(true);
      expect(response.body.data.job.results.juejin.success).toBe(true);
    });

    it('should return 404 for non-existent job', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/scraper/jobs/${nonExistentId}`)
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
        .get(`/api/scraper/jobs/${testJob._id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/scraper/jobs/${testJob._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('POST /api/scraper/jobs/:id/retry', () => {
    let failedJob;

    beforeEach(async () => {
      failedJob = await ScrapingJob.create(generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn'],
        status: 'failed',
        results: {
          csdn: {
            success: false,
            error: 'Network timeout'
          }
        },
        completedAt: new Date()
      }));
    });

    it('should retry failed job successfully', async () => {
      queueService.addScrapingJob.mockResolvedValue({
        id: 'retry_job_123',
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/scraper/jobs/${failedJob._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Retry initiated');
      expect(response.body.data.newJobId).toBe('retry_job_123');

      expect(queueService.addScrapingJob).toHaveBeenCalledWith({
        userId: testUser._id.toString(),
        platforms: ['csdn'],
        options: failedJob.options
      });
    });

    it('should not retry completed job', async () => {
      const completedJob = await ScrapingJob.create(generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn'],
        status: 'completed'
      }));

      const response = await request(app)
        .post(`/api/scraper/jobs/${completedJob._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot retry');
    });

    it('should not retry running job', async () => {
      const runningJob = await ScrapingJob.create(generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn'],
        status: 'running'
      }));

      const response = await request(app)
        .post(`/api/scraper/jobs/${runningJob._id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot retry');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/scraper/jobs/${failedJob._id}/retry`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('DELETE /api/scraper/jobs/:id', () => {
    let testJob;

    beforeEach(async () => {
      testJob = await ScrapingJob.create(generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn'],
        status: 'completed'
      }));
    });

    it('should delete job successfully', async () => {
      const response = await request(app)
        .delete(`/api/scraper/jobs/${testJob._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Job deleted');

      // Verify job is deleted
      const deletedJob = await ScrapingJob.findById(testJob._id);
      expect(deletedJob).toBeNull();
    });

    it('should not delete running job', async () => {
      const runningJob = await ScrapingJob.create(generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn'],
        status: 'running'
      }));

      const response = await request(app)
        .delete(`/api/scraper/jobs/${runningJob._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot delete running job');
    });

    it('should return 404 for non-existent job', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/scraper/jobs/${nonExistentId}`)
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
        .delete(`/api/scraper/jobs/${testJob._id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/scraper/jobs/${testJob._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('GET /api/scraper/platforms', () => {
    it('should get available scraping platforms', async () => {
      const response = await request(app)
        .get('/api/scraper/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platforms).toBeDefined();
      expect(Array.isArray(response.body.data.platforms)).toBe(true);
      
      const platforms = response.body.data.platforms;
      expect(platforms.some(p => p.name === 'csdn')).toBe(true);
      expect(platforms.some(p => p.name === 'juejin')).toBe(true);
      expect(platforms.some(p => p.name === 'zhihu')).toBe(true);
    });

    it('should include platform configuration requirements', async () => {
      const response = await request(app)
        .get('/api/scraper/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const platforms = response.body.data.platforms;
      const csdnPlatform = platforms.find(p => p.name === 'csdn');
      
      expect(csdnPlatform).toBeDefined();
      expect(csdnPlatform.requiredFields).toBeDefined();
      expect(csdnPlatform.optionalFields).toBeDefined();
      expect(csdnPlatform.description).toBeDefined();
      expect(csdnPlatform.supportedFeatures).toBeDefined();
    });

    it('should show user platform status', async () => {
      const response = await request(app)
        .get('/api/scraper/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const platforms = response.body.data.platforms;
      const csdnPlatform = platforms.find(p => p.name === 'csdn');
      const zhihuPlatform = platforms.find(p => p.name === 'zhihu');
      
      expect(csdnPlatform.userStatus.configured).toBe(true);
      expect(csdnPlatform.userStatus.active).toBe(true);
      expect(zhihuPlatform.userStatus.configured).toBe(true);
      expect(zhihuPlatform.userStatus.active).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/scraper/platforms')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });

  describe('POST /api/scraper/test-platform', () => {
    it('should test platform connection successfully', async () => {
      const testData = {
        platform: 'csdn',
        options: {
          limit: 1
        }
      };

      // Mock successful test
      scraperService.testPlatformConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful',
        sampleData: {
          articlesFound: 1,
          responseTime: 1200
        }
      });

      const response = await request(app)
        .post('/api/scraper/test-platform')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Connection successful');
      expect(response.body.data.sampleData).toBeDefined();

      expect(scraperService.testPlatformConnection).toHaveBeenCalledWith(
        'csdn',
        testUser,
        testData.options
      );
    });

    it('should handle platform connection failures', async () => {
      const testData = {
        platform: 'csdn',
        options: { limit: 1 }
      };

      // Mock connection failure
      scraperService.testPlatformConnection.mockResolvedValue({
        success: false,
        error: 'Authentication failed',
        details: 'Invalid credentials or expired session'
      });

      const response = await request(app)
        .post('/api/scraper/test-platform')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication failed');
      expect(response.body.details).toBeDefined();
    });

    it('should validate platform parameter', async () => {
      const testData = {
        // Missing platform
        options: { limit: 1 }
      };

      const response = await request(app)
        .post('/api/scraper/test-platform')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('platform');
    });

    it('should validate unsupported platform', async () => {
      const testData = {
        platform: 'unsupported-platform',
        options: { limit: 1 }
      };

      const response = await request(app)
        .post('/api/scraper/test-platform')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unsupported platform');
    });

    it('should require authentication', async () => {
      const testData = {
        platform: 'csdn',
        options: { limit: 1 }
      };

      const response = await request(app)
        .post('/api/scraper/test-platform')
        .send(testData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });
  });
});