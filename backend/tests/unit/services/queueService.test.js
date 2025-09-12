const Bull = require('bull');
const queueService = require('../../../src/services/queueService');
const { 
  setupTestDatabase, 
  createTestUser, 
  createTestArticle,
  cleanupTestData 
} = require('../../utils/testHelpers');
const { 
  createUser, 
  createArticle 
} = require('../../fixtures/dataFactory');

// Mock Bull queue
jest.mock('bull');

describe('Queue Service', () => {
  let testDb;
  let testUser;
  let mockQueue;
  let mockJob;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test user
    testUser = await createTestUser();
    
    // Setup mock queue and job
    mockJob = {
      id: 'mock_job_id',
      data: {},
      opts: {},
      progress: jest.fn(),
      finished: jest.fn().mockResolvedValue({}),
      failed: jest.fn().mockResolvedValue(null),
      retry: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
      getState: jest.fn().mockResolvedValue('completed'),
      toJSON: jest.fn().mockReturnValue({
        id: 'mock_job_id',
        data: {},
        opts: {},
        progress: 100,
        returnvalue: {},
        failedReason: null,
        timestamp: Date.now(),
        processedOn: Date.now(),
        finishedOn: Date.now()
      })
    };
    
    mockQueue = {
      add: jest.fn().mockResolvedValue(mockJob),
      process: jest.fn(),
      on: jest.fn(),
      getJob: jest.fn().mockResolvedValue(mockJob),
      getJobs: jest.fn().mockResolvedValue([mockJob]),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 1,
        completed: 5,
        failed: 2,
        delayed: 0,
        paused: 0
      }),
      clean: jest.fn().mockResolvedValue([]),
      pause: jest.fn().mockResolvedValue({}),
      resume: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue({}),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([mockJob]),
      getCompleted: jest.fn().mockResolvedValue([mockJob]),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([])
    };
    
    Bull.mockImplementation(() => mockQueue);
    
    // Reset queue service
    queueService.resetQueues();
  });

  afterAll(async () => {
    await testDb.close();
  });

  describe('Queue Initialization', () => {
    it('should initialize publish queue', async () => {
      const queue = queueService.getPublishQueue();
      
      expect(Bull).toHaveBeenCalledWith('publish', expect.any(String));
      expect(queue).toBeDefined();
      expect(mockQueue.process).toHaveBeenCalled();
    });

    it('should initialize scraping queue', async () => {
      const queue = queueService.getScrapingQueue();
      
      expect(Bull).toHaveBeenCalledWith('scraping', expect.any(String));
      expect(queue).toBeDefined();
      expect(mockQueue.process).toHaveBeenCalled();
    });

    it('should initialize email queue', async () => {
      const queue = queueService.getEmailQueue();
      
      expect(Bull).toHaveBeenCalledWith('email', expect.any(String));
      expect(queue).toBeDefined();
      expect(mockQueue.process).toHaveBeenCalled();
    });

    it('should setup queue event listeners', async () => {
      queueService.getPublishQueue();
      
      expect(mockQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('stalled', expect.any(Function));
      expect(mockQueue.on).toHaveBeenCalledWith('progress', expect.any(Function));
    });
  });

  describe('Publish Queue', () => {
    it('should add publish job to queue', async () => {
      const article = await createTestArticle({ author: testUser._id });
      const jobData = {
        articleId: article._id,
        userId: testUser._id,
        platform: 'csdn',
        config: {
          title: article.title,
          content: article.content,
          tags: article.tags
        }
      };
      
      const job = await queueService.addPublishJob(jobData);
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-article',
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 10,
          removeOnFail: 5
        })
      );
      expect(job).toBe(mockJob);
    });

    it('should add publish job with custom options', async () => {
      const article = await createTestArticle({ author: testUser._id });
      const jobData = {
        articleId: article._id,
        userId: testUser._id,
        platform: 'juejin'
      };
      const options = {
        priority: 'high',
        delay: 5000,
        attempts: 5
      };
      
      await queueService.addPublishJob(jobData, options);
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-article',
        jobData,
        expect.objectContaining({
          priority: 1, // High priority
          delay: 5000,
          attempts: 5
        })
      );
    });

    it('should add batch publish jobs', async () => {
      const article = await createTestArticle({ author: testUser._id });
      const platforms = ['csdn', 'juejin', 'zhihu'];
      
      const jobs = await queueService.addBatchPublishJobs({
        articleId: article._id,
        userId: testUser._id,
        platforms
      });
      
      expect(mockQueue.add).toHaveBeenCalledTimes(3);
      expect(jobs).toHaveLength(3);
      
      platforms.forEach((platform, index) => {
        expect(mockQueue.add).toHaveBeenNthCalledWith(
          index + 1,
          'publish-article',
          expect.objectContaining({
            platform,
            articleId: article._id,
            userId: testUser._id
          }),
          expect.any(Object)
        );
      });
    });

    it('should validate publish job data', async () => {
      const invalidJobData = {
        // Missing required fields
        platform: 'csdn'
      };
      
      await expect(queueService.addPublishJob(invalidJobData))
        .rejects.toThrow('Invalid job data');
    });
  });

  describe('Scraping Queue', () => {
    it('should add scraping job to queue', async () => {
      const jobData = {
        userId: testUser._id,
        platform: 'csdn',
        config: {
          username: 'testuser',
          maxPages: 5,
          filters: {
            category: 'technology'
          }
        }
      };
      
      const job = await queueService.addScrapingJob(jobData);
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'scrape-articles',
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          },
          removeOnComplete: 5,
          removeOnFail: 3
        })
      );
      expect(job).toBe(mockJob);
    });

    it('should add scraping job with rate limiting', async () => {
      const jobData = {
        userId: testUser._id,
        platform: 'juejin',
        config: {
          rateLimit: {
            requests: 10,
            per: 60000 // 1 minute
          }
        }
      };
      
      await queueService.addScrapingJob(jobData);
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'scrape-articles',
        jobData,
        expect.objectContaining({
          jobId: expect.stringContaining('scraping-'),
          delay: expect.any(Number)
        })
      );
    });

    it('should schedule recurring scraping job', async () => {
      const jobData = {
        userId: testUser._id,
        platform: 'zhihu',
        config: {
          schedule: '0 */6 * * *' // Every 6 hours
        }
      };
      
      await queueService.addRecurringScrapingJob(jobData);
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'scrape-articles',
        jobData,
        expect.objectContaining({
          repeat: {
            cron: '0 */6 * * *'
          }
        })
      );
    });
  });

  describe('Email Queue', () => {
    it('should add email job to queue', async () => {
      const jobData = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'notification',
        data: {
          username: testUser.username,
          message: 'Your article has been published'
        }
      };
      
      const job = await queueService.addEmailJob(jobData);
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        jobData,
        expect.objectContaining({
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000
          },
          removeOnComplete: 20,
          removeOnFail: 10
        })
      );
      expect(job).toBe(mockJob);
    });

    it('should add priority email job', async () => {
      const jobData = {
        to: 'admin@example.com',
        subject: 'Critical Alert',
        template: 'alert',
        priority: 'critical'
      };
      
      await queueService.addEmailJob(jobData);
      
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        jobData,
        expect.objectContaining({
          priority: 10 // Critical priority
        })
      );
    });

    it('should validate email job data', async () => {
      const invalidJobData = {
        // Missing required fields
        subject: 'Test'
      };
      
      await expect(queueService.addEmailJob(invalidJobData))
        .rejects.toThrow('Invalid email data');
    });
  });

  describe('Job Management', () => {
    it('should get job by ID', async () => {
      const jobId = 'mock_job_id';
      
      const job = await queueService.getJob('publish', jobId);
      
      expect(mockQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(job).toBe(mockJob);
    });

    it('should get jobs by status', async () => {
      const jobs = await queueService.getJobs('publish', 'completed');
      
      expect(mockQueue.getCompleted).toHaveBeenCalled();
      expect(jobs).toEqual([mockJob]);
    });

    it('should get job counts', async () => {
      const counts = await queueService.getJobCounts('publish');
      
      expect(mockQueue.getJobCounts).toHaveBeenCalled();
      expect(counts).toEqual({
        waiting: 0,
        active: 1,
        completed: 5,
        failed: 2,
        delayed: 0,
        paused: 0
      });
    });

    it('should retry failed job', async () => {
      const jobId = 'mock_job_id';
      
      await queueService.retryJob('publish', jobId);
      
      expect(mockQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should remove job', async () => {
      const jobId = 'mock_job_id';
      
      await queueService.removeJob('publish', jobId);
      
      expect(mockQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should clean completed jobs', async () => {
      const olderThan = 24 * 60 * 60 * 1000; // 24 hours
      
      await queueService.cleanJobs('publish', 'completed', olderThan);
      
      expect(mockQueue.clean).toHaveBeenCalledWith(olderThan, 'completed');
    });
  });

  describe('Queue Control', () => {
    it('should pause queue', async () => {
      await queueService.pauseQueue('publish');
      
      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should resume queue', async () => {
      await queueService.resumeQueue('publish');
      
      expect(mockQueue.resume).toHaveBeenCalled();
    });

    it('should get queue status', async () => {
      const status = await queueService.getQueueStatus('publish');
      
      expect(status).toHaveProperty('name', 'publish');
      expect(status).toHaveProperty('counts');
      expect(status).toHaveProperty('isPaused');
      expect(status).toHaveProperty('isReady');
    });

    it('should get all queue statuses', async () => {
      const statuses = await queueService.getAllQueueStatuses();
      
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(0);
      
      const publishStatus = statuses.find(s => s.name === 'publish');
      expect(publishStatus).toBeDefined();
    });
  });

  describe('Job Processing', () => {
    it('should process publish job successfully', async () => {
      const jobData = {
        articleId: 'article_id',
        userId: testUser._id,
        platform: 'csdn'
      };
      
      // Mock successful processing
      const processFunction = mockQueue.process.mock.calls[0][1];
      const result = await processFunction(mockJob);
      
      expect(result).toBeDefined();
    });

    it('should handle job processing errors', async () => {
      const jobData = {
        articleId: 'invalid_id',
        userId: testUser._id,
        platform: 'csdn'
      };
      
      // Mock job with invalid data
      const errorJob = {
        ...mockJob,
        data: jobData
      };
      
      const processFunction = mockQueue.process.mock.calls[0][1];
      
      await expect(processFunction(errorJob))
        .rejects.toThrow();
    });

    it('should update job progress', async () => {
      const progress = 50;
      const message = 'Processing article...';
      
      await queueService.updateJobProgress(mockJob, progress, message);
      
      expect(mockJob.progress).toHaveBeenCalledWith(progress, message);
    });
  });

  describe('Event Handling', () => {
    it('should handle job completed event', async () => {
      const queue = queueService.getPublishQueue();
      const completedHandler = mockQueue.on.mock.calls.find(
        call => call[0] === 'completed'
      )[1];
      
      await completedHandler(mockJob, { success: true });
      
      // Verify that completion is logged or handled appropriately
      expect(mockJob.toJSON).toHaveBeenCalled();
    });

    it('should handle job failed event', async () => {
      const queue = queueService.getPublishQueue();
      const failedHandler = mockQueue.on.mock.calls.find(
        call => call[0] === 'failed'
      )[1];
      
      const error = new Error('Processing failed');
      await failedHandler(mockJob, error);
      
      // Verify that failure is logged or handled appropriately
      expect(mockJob.toJSON).toHaveBeenCalled();
    });

    it('should handle job stalled event', async () => {
      const queue = queueService.getPublishQueue();
      const stalledHandler = mockQueue.on.mock.calls.find(
        call => call[0] === 'stalled'
      )[1];
      
      await stalledHandler(mockJob);
      
      // Verify that stalled job is handled appropriately
      expect(mockJob.toJSON).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle queue connection errors', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(queueService.addPublishJob({
        articleId: 'test_id',
        userId: testUser._id,
        platform: 'csdn'
      })).rejects.toThrow('Connection failed');
    });

    it('should handle invalid queue names', async () => {
      await expect(queueService.getJob('invalid_queue', 'job_id'))
        .rejects.toThrow('Invalid queue name');
    });

    it('should handle job not found', async () => {
      mockQueue.getJob.mockResolvedValueOnce(null);
      
      const job = await queueService.getJob('publish', 'non_existent_id');
      expect(job).toBeNull();
    });

    it('should handle job retry failures', async () => {
      mockJob.retry.mockRejectedValueOnce(new Error('Retry failed'));
      
      await expect(queueService.retryJob('publish', 'mock_job_id'))
        .rejects.toThrow('Retry failed');
    });
  });

  describe('Performance', () => {
    it('should handle high job volume', async () => {
      const jobs = [];
      const jobCount = 100;
      
      // Add many jobs quickly
      for (let i = 0; i < jobCount; i++) {
        jobs.push(queueService.addPublishJob({
          articleId: `article_${i}`,
          userId: testUser._id,
          platform: 'csdn'
        }));
      }
      
      const results = await Promise.all(jobs);
      
      expect(results).toHaveLength(jobCount);
      expect(mockQueue.add).toHaveBeenCalledTimes(jobCount);
    });

    it('should implement proper concurrency limits', async () => {
      const queue = queueService.getPublishQueue();
      
      // Verify that process was called with concurrency limit
      expect(mockQueue.process).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number), // Concurrency limit
        expect.any(Function)
      );
    });

    it('should handle job timeouts', async () => {
      const longRunningJob = {
        ...mockJob,
        data: {
          articleId: 'test_id',
          userId: testUser._id,
          platform: 'csdn',
          timeout: 1000 // 1 second timeout
        }
      };
      
      const processFunction = mockQueue.process.mock.calls[0][1];
      
      // Mock a job that takes longer than timeout
      jest.setTimeout(2000);
      
      await expect(processFunction(longRunningJob))
        .rejects.toThrow('Job timeout');
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should collect job metrics', async () => {
      const metrics = await queueService.getQueueMetrics('publish');
      
      expect(metrics).toHaveProperty('totalJobs');
      expect(metrics).toHaveProperty('completedJobs');
      expect(metrics).toHaveProperty('failedJobs');
      expect(metrics).toHaveProperty('averageProcessingTime');
      expect(metrics).toHaveProperty('throughput');
    });

    it('should get queue health status', async () => {
      const health = await queueService.getQueueHealth('publish');
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memoryUsage');
      expect(health).toHaveProperty('activeConnections');
      expect(health).toHaveProperty('lastProcessedJob');
    });

    it('should export queue statistics', async () => {
      const stats = await queueService.exportQueueStatistics();
      
      expect(stats).toHaveProperty('exportedAt');
      expect(stats).toHaveProperty('queues');
      expect(Array.isArray(stats.queues)).toBe(true);
      
      const publishStats = stats.queues.find(q => q.name === 'publish');
      expect(publishStats).toBeDefined();
      expect(publishStats).toHaveProperty('metrics');
      expect(publishStats).toHaveProperty('health');
    });
  });

  describe('Cleanup', () => {
    it('should close all queues gracefully', async () => {
      await queueService.closeAllQueues();
      
      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockQueue.close.mockRejectedValueOnce(new Error('Cleanup failed'));
      
      // Should not throw error, just log it
      await expect(queueService.closeAllQueues()).resolves.not.toThrow();
    });
  });
});