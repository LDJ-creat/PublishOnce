const mongoose = require('mongoose');
const ScrapingJob = require('../../../src/models/ScrapingJob');
const User = require('../../../src/models/User');
const { connectDB, closeDB, clearDB, createTestUser } = require('../../utils/testHelpers');
const { generateScrapingJobData } = require('../../fixtures/dataFactory');

describe('ScrapingJob Model Tests', () => {
  let testUser;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();
    
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
        }
      }
    });
  });

  describe('Model Creation', () => {
    it('should create a scraping job with valid data', async () => {
      const jobData = generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn', 'juejin'],
        options: {
          limit: 10,
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          },
          enablePagination: true,
          rateLimitDelay: 1000
        }
      });

      const scrapingJob = new ScrapingJob(jobData);
      const savedJob = await scrapingJob.save();

      expect(savedJob._id).toBeDefined();
      expect(savedJob.userId.toString()).toBe(testUser._id.toString());
      expect(savedJob.platforms).toEqual(['csdn', 'juejin']);
      expect(savedJob.status).toBe('pending');
      expect(savedJob.options.limit).toBe(10);
      expect(savedJob.options.enablePagination).toBe(true);
      expect(savedJob.createdAt).toBeDefined();
      expect(savedJob.updatedAt).toBeDefined();
    });

    it('should create job with minimal required fields', async () => {
      const jobData = {
        userId: testUser._id,
        platforms: ['csdn']
      };

      const scrapingJob = new ScrapingJob(jobData);
      const savedJob = await scrapingJob.save();

      expect(savedJob._id).toBeDefined();
      expect(savedJob.userId.toString()).toBe(testUser._id.toString());
      expect(savedJob.platforms).toEqual(['csdn']);
      expect(savedJob.status).toBe('pending'); // Default status
      expect(savedJob.options).toEqual({}); // Default empty options
      expect(savedJob.results).toEqual({}); // Default empty results
    });

    it('should set default values correctly', async () => {
      const jobData = {
        userId: testUser._id,
        platforms: ['juejin']
      };

      const scrapingJob = new ScrapingJob(jobData);
      const savedJob = await scrapingJob.save();

      expect(savedJob.status).toBe('pending');
      expect(savedJob.options).toEqual({});
      expect(savedJob.results).toEqual({});
      expect(savedJob.createdAt).toBeDefined();
      expect(savedJob.updatedAt).toBeDefined();
      expect(savedJob.startedAt).toBeUndefined();
      expect(savedJob.completedAt).toBeUndefined();
    });
  });

  describe('Model Validation', () => {
    it('should require userId field', async () => {
      const jobData = {
        platforms: ['csdn']
        // Missing userId
      };

      const scrapingJob = new ScrapingJob(jobData);
      
      await expect(scrapingJob.save()).rejects.toThrow(/userId.*required/);
    });

    it('should require platforms field', async () => {
      const jobData = {
        userId: testUser._id
        // Missing platforms
      };

      const scrapingJob = new ScrapingJob(jobData);
      
      await expect(scrapingJob.save()).rejects.toThrow(/platforms.*required/);
    });

    it('should validate platforms array is not empty', async () => {
      const jobData = {
        userId: testUser._id,
        platforms: [] // Empty array
      };

      const scrapingJob = new ScrapingJob(jobData);
      
      await expect(scrapingJob.save()).rejects.toThrow(/platforms.*at least one/);
    });

    it('should validate supported platform names', async () => {
      const jobData = {
        userId: testUser._id,
        platforms: ['csdn', 'unsupported-platform']
      };

      const scrapingJob = new ScrapingJob(jobData);
      
      await expect(scrapingJob.save()).rejects.toThrow(/unsupported-platform.*not supported/);
    });

    it('should validate status enum values', async () => {
      const jobData = {
        userId: testUser._id,
        platforms: ['csdn'],
        status: 'invalid-status'
      };

      const scrapingJob = new ScrapingJob(jobData);
      
      await expect(scrapingJob.save()).rejects.toThrow(/invalid-status.*not a valid enum/);
    });

    it('should validate valid status values', async () => {
      const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
      
      for (const status of validStatuses) {
        const jobData = {
          userId: testUser._id,
          platforms: ['csdn'],
          status: status
        };

        const scrapingJob = new ScrapingJob(jobData);
        const savedJob = await scrapingJob.save();
        
        expect(savedJob.status).toBe(status);
        
        // Clean up for next iteration
        await ScrapingJob.findByIdAndDelete(savedJob._id);
      }
    });

    it('should validate userId is valid ObjectId', async () => {
      const jobData = {
        userId: 'invalid-object-id',
        platforms: ['csdn']
      };

      const scrapingJob = new ScrapingJob(jobData);
      
      await expect(scrapingJob.save()).rejects.toThrow(/Cast to ObjectId failed/);
    });

    it('should validate options object structure', async () => {
      const jobData = {
        userId: testUser._id,
        platforms: ['csdn'],
        options: {
          limit: 'invalid-number', // Should be number
          enablePagination: 'invalid-boolean', // Should be boolean
          rateLimitDelay: 'invalid-number' // Should be number
        }
      };

      const scrapingJob = new ScrapingJob(jobData);
      
      await expect(scrapingJob.save()).rejects.toThrow();
    });

    it('should validate date range in options', async () => {
      const jobData = {
        userId: testUser._id,
        platforms: ['csdn'],
        options: {
          dateRange: {
            start: 'invalid-date',
            end: 'invalid-date'
          }
        }
      };

      const scrapingJob = new ScrapingJob(jobData);
      
      await expect(scrapingJob.save()).rejects.toThrow();
    });
  });

  describe('Model Methods', () => {
    let scrapingJob;

    beforeEach(async () => {
      const jobData = generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn', 'juejin'],
        status: 'pending'
      });
      
      scrapingJob = await ScrapingJob.create(jobData);
    });

    describe('markAsStarted()', () => {
      it('should mark job as started', async () => {
        const updatedJob = await scrapingJob.markAsStarted();
        
        expect(updatedJob.status).toBe('running');
        expect(updatedJob.startedAt).toBeDefined();
        expect(updatedJob.startedAt).toBeInstanceOf(Date);
        expect(updatedJob.updatedAt).toBeDefined();
      });

      it('should not change already started job', async () => {
        // First start
        await scrapingJob.markAsStarted();
        const firstStartTime = scrapingJob.startedAt;
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Try to start again
        const updatedJob = await scrapingJob.markAsStarted();
        
        expect(updatedJob.startedAt.getTime()).toBe(firstStartTime.getTime());
      });
    });

    describe('markAsCompleted()', () => {
      it('should mark job as completed with results', async () => {
        const results = {
          csdn: {
            success: true,
            articlesCount: 5,
            articles: []
          },
          juejin: {
            success: true,
            articlesCount: 3,
            articles: []
          }
        };

        const updatedJob = await scrapingJob.markAsCompleted(results);
        
        expect(updatedJob.status).toBe('completed');
        expect(updatedJob.completedAt).toBeDefined();
        expect(updatedJob.completedAt).toBeInstanceOf(Date);
        expect(updatedJob.results).toEqual(results);
        expect(updatedJob.updatedAt).toBeDefined();
      });

      it('should mark job as completed without results', async () => {
        const updatedJob = await scrapingJob.markAsCompleted();
        
        expect(updatedJob.status).toBe('completed');
        expect(updatedJob.completedAt).toBeDefined();
        expect(updatedJob.results).toEqual({});
      });
    });

    describe('markAsFailed()', () => {
      it('should mark job as failed with error', async () => {
        const error = 'Network timeout occurred';
        
        const updatedJob = await scrapingJob.markAsFailed(error);
        
        expect(updatedJob.status).toBe('failed');
        expect(updatedJob.completedAt).toBeDefined();
        expect(updatedJob.completedAt).toBeInstanceOf(Date);
        expect(updatedJob.error).toBe(error);
        expect(updatedJob.updatedAt).toBeDefined();
      });

      it('should mark job as failed without error message', async () => {
        const updatedJob = await scrapingJob.markAsFailed();
        
        expect(updatedJob.status).toBe('failed');
        expect(updatedJob.completedAt).toBeDefined();
        expect(updatedJob.error).toBeUndefined();
      });
    });

    describe('markAsCancelled()', () => {
      it('should mark job as cancelled', async () => {
        const updatedJob = await scrapingJob.markAsCancelled();
        
        expect(updatedJob.status).toBe('cancelled');
        expect(updatedJob.completedAt).toBeDefined();
        expect(updatedJob.completedAt).toBeInstanceOf(Date);
        expect(updatedJob.updatedAt).toBeDefined();
      });
    });

    describe('updateProgress()', () => {
      it('should update job progress', async () => {
        const progress = {
          csdn: {
            processed: 5,
            total: 10,
            status: 'running'
          },
          juejin: {
            processed: 0,
            total: 8,
            status: 'pending'
          }
        };

        const updatedJob = await scrapingJob.updateProgress(progress);
        
        expect(updatedJob.progress).toEqual(progress);
        expect(updatedJob.updatedAt).toBeDefined();
      });
    });

    describe('addPlatformResult()', () => {
      it('should add result for specific platform', async () => {
        const platformResult = {
          success: true,
          articlesCount: 7,
          articles: [
            { title: 'Test Article 1', url: 'https://example.com/1' },
            { title: 'Test Article 2', url: 'https://example.com/2' }
          ]
        };

        const updatedJob = await scrapingJob.addPlatformResult('csdn', platformResult);
        
        expect(updatedJob.results.csdn).toEqual(platformResult);
        expect(updatedJob.updatedAt).toBeDefined();
      });

      it('should add error result for platform', async () => {
        const platformResult = {
          success: false,
          error: 'Authentication failed',
          details: 'Invalid credentials'
        };

        const updatedJob = await scrapingJob.addPlatformResult('juejin', platformResult);
        
        expect(updatedJob.results.juejin).toEqual(platformResult);
        expect(updatedJob.results.juejin.success).toBe(false);
      });
    });

    describe('getDuration()', () => {
      it('should calculate duration for completed job', async () => {
        const startTime = new Date();
        scrapingJob.startedAt = startTime;
        scrapingJob.completedAt = new Date(startTime.getTime() + 5000); // 5 seconds later
        
        const duration = scrapingJob.getDuration();
        
        expect(duration).toBe(5000);
      });

      it('should return null for job without start time', () => {
        const duration = scrapingJob.getDuration();
        
        expect(duration).toBeNull();
      });

      it('should calculate current duration for running job', async () => {
        const startTime = new Date(Date.now() - 3000); // 3 seconds ago
        scrapingJob.startedAt = startTime;
        
        const duration = scrapingJob.getDuration();
        
        expect(duration).toBeGreaterThanOrEqual(2900); // Allow some tolerance
        expect(duration).toBeLessThanOrEqual(3100);
      });
    });

    describe('getSuccessfulPlatforms()', () => {
      it('should return platforms with successful results', async () => {
        scrapingJob.results = {
          csdn: {
            success: true,
            articlesCount: 5
          },
          juejin: {
            success: false,
            error: 'Rate limit exceeded'
          },
          zhihu: {
            success: true,
            articlesCount: 3
          }
        };
        
        const successfulPlatforms = scrapingJob.getSuccessfulPlatforms();
        
        expect(successfulPlatforms).toEqual(['csdn', 'zhihu']);
      });

      it('should return empty array when no results', () => {
        const successfulPlatforms = scrapingJob.getSuccessfulPlatforms();
        
        expect(successfulPlatforms).toEqual([]);
      });
    });

    describe('getFailedPlatforms()', () => {
      it('should return platforms with failed results', async () => {
        scrapingJob.results = {
          csdn: {
            success: true,
            articlesCount: 5
          },
          juejin: {
            success: false,
            error: 'Rate limit exceeded'
          },
          zhihu: {
            success: false,
            error: 'Authentication failed'
          }
        };
        
        const failedPlatforms = scrapingJob.getFailedPlatforms();
        
        expect(failedPlatforms).toEqual(['juejin', 'zhihu']);
      });

      it('should return empty array when all successful', async () => {
        scrapingJob.results = {
          csdn: {
            success: true,
            articlesCount: 5
          },
          juejin: {
            success: true,
            articlesCount: 3
          }
        };
        
        const failedPlatforms = scrapingJob.getFailedPlatforms();
        
        expect(failedPlatforms).toEqual([]);
      });
    });

    describe('getTotalArticlesCount()', () => {
      it('should calculate total articles from all platforms', async () => {
        scrapingJob.results = {
          csdn: {
            success: true,
            articlesCount: 5
          },
          juejin: {
            success: true,
            articlesCount: 3
          },
          zhihu: {
            success: false,
            error: 'Failed'
          }
        };
        
        const totalCount = scrapingJob.getTotalArticlesCount();
        
        expect(totalCount).toBe(8); // 5 + 3, failed platform not counted
      });

      it('should return 0 when no successful results', () => {
        const totalCount = scrapingJob.getTotalArticlesCount();
        
        expect(totalCount).toBe(0);
      });
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test jobs
      await ScrapingJob.create([
        generateScrapingJobData({
          userId: testUser._id,
          platforms: ['csdn'],
          status: 'completed',
          completedAt: new Date()
        }),
        generateScrapingJobData({
          userId: testUser._id,
          platforms: ['juejin'],
          status: 'failed',
          completedAt: new Date()
        }),
        generateScrapingJobData({
          userId: testUser._id,
          platforms: ['csdn', 'juejin'],
          status: 'running'
        })
      ]);
    });

    describe('findByUserId()', () => {
      it('should find jobs by user ID', async () => {
        const jobs = await ScrapingJob.findByUserId(testUser._id);
        
        expect(jobs).toHaveLength(3);
        expect(jobs.every(job => job.userId.toString() === testUser._id.toString())).toBe(true);
      });

      it('should return empty array for non-existent user', async () => {
        const nonExistentUserId = new mongoose.Types.ObjectId();
        const jobs = await ScrapingJob.findByUserId(nonExistentUserId);
        
        expect(jobs).toHaveLength(0);
      });
    });

    describe('findByStatus()', () => {
      it('should find jobs by status', async () => {
        const completedJobs = await ScrapingJob.findByStatus('completed');
        const runningJobs = await ScrapingJob.findByStatus('running');
        
        expect(completedJobs).toHaveLength(1);
        expect(completedJobs[0].status).toBe('completed');
        
        expect(runningJobs).toHaveLength(1);
        expect(runningJobs[0].status).toBe('running');
      });
    });

    describe('findByPlatform()', () => {
      it('should find jobs by platform', async () => {
        const csdnJobs = await ScrapingJob.findByPlatform('csdn');
        const juejinJobs = await ScrapingJob.findByPlatform('juejin');
        
        expect(csdnJobs).toHaveLength(2); // Two jobs include csdn
        expect(csdnJobs.every(job => job.platforms.includes('csdn'))).toBe(true);
        
        expect(juejinJobs).toHaveLength(2); // Two jobs include juejin
        expect(juejinJobs.every(job => job.platforms.includes('juejin'))).toBe(true);
      });
    });

    describe('getJobStats()', () => {
      it('should return job statistics', async () => {
        const stats = await ScrapingJob.getJobStats(testUser._id);
        
        expect(stats.total).toBe(3);
        expect(stats.completed).toBe(1);
        expect(stats.failed).toBe(1);
        expect(stats.running).toBe(1);
        expect(stats.pending).toBe(0);
        expect(stats.cancelled).toBe(0);
      });

      it('should return zero stats for user with no jobs', async () => {
        const otherUser = await createTestUser({
          username: 'otheruser',
          email: 'other@example.com'
        });
        
        const stats = await ScrapingJob.getJobStats(otherUser._id);
        
        expect(stats.total).toBe(0);
        expect(stats.completed).toBe(0);
        expect(stats.failed).toBe(0);
        expect(stats.running).toBe(0);
        expect(stats.pending).toBe(0);
        expect(stats.cancelled).toBe(0);
      });
    });
  });

  describe('Model Hooks', () => {
    it('should update updatedAt on save', async () => {
      const jobData = generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn']
      });
      
      const scrapingJob = await ScrapingJob.create(jobData);
      const originalUpdatedAt = scrapingJob.updatedAt;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Update the job
      scrapingJob.status = 'running';
      await scrapingJob.save();
      
      expect(scrapingJob.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should validate before save', async () => {
      const scrapingJob = new ScrapingJob({
        userId: testUser._id,
        platforms: ['csdn']
      });
      
      // Save successfully first
      await scrapingJob.save();
      
      // Try to set invalid status
      scrapingJob.status = 'invalid-status';
      
      await expect(scrapingJob.save()).rejects.toThrow();
    });
  });

  describe('Model Indexes', () => {
    it('should have proper indexes for efficient queries', async () => {
      const indexes = await ScrapingJob.collection.getIndexes();
      
      // Check for userId index
      expect(indexes).toHaveProperty('userId_1');
      
      // Check for status index
      expect(indexes).toHaveProperty('status_1');
      
      // Check for createdAt index
      expect(indexes).toHaveProperty('createdAt_-1');
      
      // Check for compound index on userId and status
      expect(indexes).toHaveProperty('userId_1_status_1');
    });
  });

  describe('Model Population', () => {
    let scrapingJob;

    beforeEach(async () => {
      const jobData = generateScrapingJobData({
        userId: testUser._id,
        platforms: ['csdn']
      });
      
      scrapingJob = await ScrapingJob.create(jobData);
    });

    it('should populate user information', async () => {
      const populatedJob = await ScrapingJob.findById(scrapingJob._id).populate('userId');
      
      expect(populatedJob.userId).toBeDefined();
      expect(populatedJob.userId.username).toBe(testUser.username);
      expect(populatedJob.userId.email).toBe(testUser.email);
    });

    it('should populate user with selected fields only', async () => {
      const populatedJob = await ScrapingJob.findById(scrapingJob._id)
        .populate('userId', 'username email');
      
      expect(populatedJob.userId.username).toBe(testUser.username);
      expect(populatedJob.userId.email).toBe(testUser.email);
      expect(populatedJob.userId.password).toBeUndefined();
    });
  });
});