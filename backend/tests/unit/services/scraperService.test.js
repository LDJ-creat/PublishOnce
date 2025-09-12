const scraperService = require('../../../src/services/scraperService');
const Article = require('../../../src/models/Article');
const User = require('../../../src/models/User');
const ScrapingJob = require('../../../src/models/ScrapingJob');
const { connectDB, closeDB, clearDB, createTestUser } = require('../../utils/testHelpers');
const { generateArticleData } = require('../../fixtures/dataFactory');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// Mock external dependencies
jest.mock('axios');
jest.mock('cheerio');
jest.mock('puppeteer');

describe('Scraper Service Tests', () => {
  let testUser;
  let mockBrowser;
  let mockPage;

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
          isActive: true
        }
      }
    });

    // Setup Puppeteer mocks
    mockPage = {
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      evaluate: jest.fn(),
      content: jest.fn(),
      close: jest.fn(),
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      screenshot: jest.fn(),
      pdf: jest.fn(),
      cookies: jest.fn(),
      setCookie: jest.fn()
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn()
    };

    puppeteer.launch.mockResolvedValue(mockBrowser);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('CSDN Scraper', () => {
    describe('scrapeCSDAArticles', () => {
      it('should scrape CSDN articles successfully', async () => {
        const mockArticleListHtml = `
          <div class="article-item-box">
            <h4><a href="/testuser_csdn/article/details/123456">Test Article 1</a></h4>
            <div class="info-box">
              <span class="date">2024-01-15 10:30:00</span>
              <span class="read-num">阅读数：1000</span>
              <span class="praise-num">点赞数：50</span>
            </div>
          </div>
          <div class="article-item-box">
            <h4><a href="/testuser_csdn/article/details/789012">Test Article 2</a></h4>
            <div class="info-box">
              <span class="date">2024-01-14 15:45:00</span>
              <span class="read-num">阅读数：500</span>
              <span class="praise-num">点赞数：25</span>
            </div>
          </div>
        `;

        const mockArticleDetailHtml = `
          <div class="article-header">
            <h1 class="title-article">Test Article 1</h1>
            <div class="article-info">
              <span class="time">2024-01-15 10:30:00</span>
            </div>
          </div>
          <div id="content_views" class="markdown_views">
            <h1>Test Article Content</h1>
            <p>This is the article content.</p>
          </div>
          <div class="tags-box">
            <a class="tag-link">javascript</a>
            <a class="tag-link">nodejs</a>
          </div>
        `;

        // Mock page navigation and content extraction
        mockPage.goto.mockResolvedValue();
        mockPage.waitForSelector.mockResolvedValue();
        mockPage.content
          .mockResolvedValueOnce(mockArticleListHtml)
          .mockResolvedValueOnce(mockArticleDetailHtml)
          .mockResolvedValueOnce(mockArticleDetailHtml);

        // Mock cheerio parsing
        const mockListCheerio = {
          find: jest.fn().mockReturnThis(),
          each: jest.fn((callback) => {
            callback.call({ attribs: { href: '/testuser_csdn/article/details/123456' } }, 0, {
              children: [{ data: 'Test Article 1' }]
            });
            callback.call({ attribs: { href: '/testuser_csdn/article/details/789012' } }, 1, {
              children: [{ data: 'Test Article 2' }]
            });
          }),
          text: jest.fn().mockReturnValue('2024-01-15 10:30:00'),
          attr: jest.fn().mockReturnValue('/testuser_csdn/article/details/123456')
        };

        const mockDetailCheerio = {
          find: jest.fn().mockReturnThis(),
          text: jest.fn()
            .mockReturnValueOnce('Test Article 1')
            .mockReturnValueOnce('2024-01-15 10:30:00'),
          html: jest.fn().mockReturnValue('<h1>Test Article Content</h1><p>This is the article content.</p>'),
          map: jest.fn().mockReturnValue({ get: () => ['javascript', 'nodejs'] })
        };

        cheerio.load
          .mockReturnValueOnce(mockListCheerio)
          .mockReturnValueOnce(mockDetailCheerio)
          .mockReturnValueOnce(mockDetailCheerio);

        const result = await scraperService.scrapeCSDAArticles(
          testUser.platforms.csdn.profileUrl,
          { limit: 2 }
        );

        expect(result.success).toBe(true);
        expect(result.articles).toHaveLength(2);
        expect(result.articles[0]).toMatchObject({
          title: 'Test Article 1',
          platform: 'csdn',
          platformArticleId: '123456',
          url: expect.stringContaining('123456'),
          tags: ['javascript', 'nodejs']
        });

        // Verify browser interactions
        expect(puppeteer.launch).toHaveBeenCalled();
        expect(mockPage.goto).toHaveBeenCalledWith(
          testUser.platforms.csdn.profileUrl,
          expect.any(Object)
        );
        expect(mockBrowser.close).toHaveBeenCalled();
      });

      it('should handle CSDN scraping errors', async () => {
        mockPage.goto.mockRejectedValue(new Error('Network timeout'));

        const result = await scraperService.scrapeCSDAArticles(
          testUser.platforms.csdn.profileUrl,
          { limit: 5 }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network timeout');
        expect(mockBrowser.close).toHaveBeenCalled();
      });

      it('should handle pagination for CSDN articles', async () => {
        const mockPaginatedHtml = `
          <div class="article-item-box">
            <h4><a href="/testuser_csdn/article/details/111">Article 1</a></h4>
          </div>
          <div class="ui-pager">
            <a href="?page=2" class="ui-pager-next">下一页</a>
          </div>
        `;

        mockPage.content.mockResolvedValue(mockPaginatedHtml);
        mockPage.evaluate.mockResolvedValue(true); // Has next page

        const mockCheerio = {
          find: jest.fn().mockReturnThis(),
          each: jest.fn((callback) => {
            callback.call({ attribs: { href: '/testuser_csdn/article/details/111' } }, 0, {
              children: [{ data: 'Article 1' }]
            });
          }),
          length: 1
        };

        cheerio.load.mockReturnValue(mockCheerio);

        const result = await scraperService.scrapeCSDAArticles(
          testUser.platforms.csdn.profileUrl,
          { limit: 10, enablePagination: true }
        );

        expect(result.success).toBe(true);
        expect(mockPage.goto).toHaveBeenCalledTimes(2); // Original page + next page
      });

      it('should respect rate limiting for CSDN', async () => {
        const startTime = Date.now();
        
        mockPage.content.mockResolvedValue('<div></div>');
        cheerio.load.mockReturnValue({
          find: jest.fn().mockReturnThis(),
          each: jest.fn()
        });

        await scraperService.scrapeCSDAArticles(
          testUser.platforms.csdn.profileUrl,
          { limit: 1, rateLimitDelay: 100 }
        );

        const endTime = Date.now();
        expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('Juejin Scraper', () => {
    describe('scrapeJuejinArticles', () => {
      it('should scrape Juejin articles successfully', async () => {
        const mockApiResponse = {
          data: {
            err_no: 0,
            data: [
              {
                article_id: 'juejin_123',
                article_info: {
                  title: 'Juejin Test Article 1',
                  brief_content: 'Article summary',
                  cover_image: 'https://example.com/cover1.jpg',
                  ctime: '1705123456',
                  mtime: '1705123456',
                  view_count: 1500,
                  digg_count: 80,
                  comment_count: 20
                },
                tags: [
                  { tag_name: 'JavaScript' },
                  { tag_name: 'Vue.js' }
                ],
                category: {
                  category_name: 'Frontend'
                }
              },
              {
                article_id: 'juejin_456',
                article_info: {
                  title: 'Juejin Test Article 2',
                  brief_content: 'Another article summary',
                  ctime: '1705023456',
                  view_count: 800,
                  digg_count: 40
                },
                tags: [
                  { tag_name: 'React' }
                ]
              }
            ]
          }
        };

        axios.get.mockResolvedValue(mockApiResponse);

        const result = await scraperService.scrapeJuejinArticles(
          testUser.platforms.juejin.profileUrl,
          { limit: 2 }
        );

        expect(result.success).toBe(true);
        expect(result.articles).toHaveLength(2);
        expect(result.articles[0]).toMatchObject({
          title: 'Juejin Test Article 1',
          platform: 'juejin',
          platformArticleId: 'juejin_123',
          url: 'https://juejin.cn/post/juejin_123',
          tags: ['JavaScript', 'Vue.js'],
          category: 'Frontend',
          views: 1500,
          likes: 80,
          comments: 20
        });

        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('juejin.cn/api'),
          expect.objectContaining({
            params: expect.objectContaining({
              user_id: expect.any(String),
              cursor: '0',
              sort_type: 2
            })
          })
        );
      });

      it('should handle Juejin API errors', async () => {
        axios.get.mockRejectedValue({
          response: {
            status: 429,
            data: {
              err_no: 429,
              err_msg: 'Rate limit exceeded'
            }
          }
        });

        const result = await scraperService.scrapeJuejinArticles(
          testUser.platforms.juejin.profileUrl,
          { limit: 5 }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
      });

      it('should extract user ID from Juejin profile URL', async () => {
        const profileUrl = 'https://juejin.cn/user/1234567890123456';
        
        axios.get.mockResolvedValue({
          data: {
            err_no: 0,
            data: []
          }
        });

        await scraperService.scrapeJuejinArticles(profileUrl, { limit: 1 });

        expect(axios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: expect.objectContaining({
              user_id: '1234567890123456'
            })
          })
        );
      });

      it('should handle pagination for Juejin articles', async () => {
        const firstPageResponse = {
          data: {
            err_no: 0,
            data: [{
              article_id: 'juejin_1',
              article_info: { title: 'Article 1', ctime: '1705123456' }
            }],
            cursor: 'next_cursor_123',
            has_more: true
          }
        };

        const secondPageResponse = {
          data: {
            err_no: 0,
            data: [{
              article_id: 'juejin_2',
              article_info: { title: 'Article 2', ctime: '1705023456' }
            }],
            has_more: false
          }
        };

        axios.get
          .mockResolvedValueOnce(firstPageResponse)
          .mockResolvedValueOnce(secondPageResponse);

        const result = await scraperService.scrapeJuejinArticles(
          testUser.platforms.juejin.profileUrl,
          { limit: 10, enablePagination: true }
        );

        expect(result.success).toBe(true);
        expect(result.articles).toHaveLength(2);
        expect(axios.get).toHaveBeenCalledTimes(2);
        
        // Verify second call uses cursor
        const secondCall = axios.get.mock.calls[1];
        expect(secondCall[1].params.cursor).toBe('next_cursor_123');
      });
    });
  });

  describe('Zhihu Scraper', () => {
    describe('scrapeZhihuArticles', () => {
      it('should scrape Zhihu articles successfully', async () => {
        const mockZhihuHtml = `
          <div class="List-item">
            <div class="ContentItem">
              <h2 class="ContentItem-title">
                <a href="/p/123456789">Zhihu Test Article 1</a>
              </h2>
              <div class="ContentItem-meta">
                <span>2024年1月15日</span>
              </div>
              <div class="RichContent">
                <div class="RichContent-inner">
                  <span class="RichText">This is the article excerpt...</span>
                </div>
              </div>
              <div class="ContentItem-actions">
                <button class="VoteButton">1500 赞同</button>
                <button class="Button">200 评论</button>
              </div>
            </div>
          </div>
        `;

        mockPage.content.mockResolvedValue(mockZhihuHtml);
        mockPage.evaluate.mockResolvedValue([
          {
            title: 'Zhihu Test Article 1',
            url: '/p/123456789',
            excerpt: 'This is the article excerpt...',
            publishDate: '2024年1月15日',
            voteCount: 1500,
            commentCount: 200
          }
        ]);

        const result = await scraperService.scrapeZhihuArticles(
          testUser.platforms.zhihu.profileUrl,
          { limit: 1 }
        );

        expect(result.success).toBe(true);
        expect(result.articles).toHaveLength(1);
        expect(result.articles[0]).toMatchObject({
          title: 'Zhihu Test Article 1',
          platform: 'zhihu',
          platformArticleId: '123456789',
          url: 'https://zhuanlan.zhihu.com/p/123456789',
          likes: 1500,
          comments: 200
        });

        expect(mockPage.goto).toHaveBeenCalledWith(
          testUser.platforms.zhihu.profileUrl,
          expect.any(Object)
        );
      });

      it('should handle Zhihu anti-bot measures', async () => {
        mockPage.goto.mockResolvedValue();
        mockPage.content.mockResolvedValue('<div class="SignFlow">请登录</div>');

        const result = await scraperService.scrapeZhihuArticles(
          testUser.platforms.zhihu.profileUrl,
          { limit: 5 }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Authentication required');
      });

      it('should use proper headers for Zhihu scraping', async () => {
        mockPage.content.mockResolvedValue('<div></div>');
        mockPage.evaluate.mockResolvedValue([]);

        await scraperService.scrapeZhihuArticles(
          testUser.platforms.zhihu.profileUrl,
          { limit: 1 }
        );

        expect(mockPage.setUserAgent).toHaveBeenCalledWith(
          expect.stringContaining('Mozilla/5.0')
        );
        expect(mockPage.setViewport).toHaveBeenCalledWith({
          width: 1920,
          height: 1080
        });
      });
    });
  });

  describe('Generic Scraper Methods', () => {
    describe('scrapeMultiplePlatforms', () => {
      it('should scrape from multiple platforms successfully', async () => {
        const platforms = ['csdn', 'juejin'];
        const options = {
          limit: 2,
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          }
        };

        // Mock CSDN response
        mockPage.content.mockResolvedValue('<div></div>');
        cheerio.load.mockReturnValue({
          find: jest.fn().mockReturnThis(),
          each: jest.fn((callback) => {
            callback.call({ attribs: { href: '/test/123' } }, 0, {
              children: [{ data: 'CSDN Article' }]
            });
          })
        });

        // Mock Juejin response
        axios.get.mockResolvedValue({
          data: {
            err_no: 0,
            data: [{
              article_id: 'juejin_123',
              article_info: {
                title: 'Juejin Article',
                ctime: '1705123456'
              }
            }]
          }
        });

        const results = await scraperService.scrapeMultiplePlatforms(
          testUser,
          platforms,
          options
        );

        expect(results).toHaveLength(2);
        expect(results[0].platform).toBe('csdn');
        expect(results[0].success).toBe(true);
        expect(results[1].platform).toBe('juejin');
        expect(results[1].success).toBe(true);
      });

      it('should handle mixed success and failure results', async () => {
        const platforms = ['csdn', 'juejin'];
        
        // Mock CSDN success
        mockPage.content.mockResolvedValue('<div></div>');
        cheerio.load.mockReturnValue({
          find: jest.fn().mockReturnThis(),
          each: jest.fn()
        });

        // Mock Juejin failure
        axios.get.mockRejectedValue(new Error('API Error'));

        const results = await scraperService.scrapeMultiplePlatforms(
          testUser,
          platforms,
          { limit: 1 }
        );

        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        expect(results[1].error).toContain('API Error');
      });
    });

    describe('validateScrapingOptions', () => {
      it('should validate scraping options', () => {
        const validOptions = {
          limit: 10,
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          },
          enablePagination: true,
          rateLimitDelay: 1000
        };

        const result = scraperService.validateScrapingOptions(validOptions);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect invalid options', () => {
        const invalidOptions = {
          limit: -1, // Invalid limit
          dateRange: {
            start: '2024-01-31',
            end: '2024-01-01' // End before start
          },
          rateLimitDelay: 'invalid' // Invalid type
        };

        const result = scraperService.validateScrapingOptions(invalidOptions);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('deduplicateArticles', () => {
      it('should remove duplicate articles', () => {
        const articles = [
          {
            title: 'Same Article',
            platform: 'csdn',
            platformArticleId: '123',
            url: 'https://blog.csdn.net/test/123'
          },
          {
            title: 'Same Article',
            platform: 'juejin',
            platformArticleId: '456',
            url: 'https://juejin.cn/post/456'
          },
          {
            title: 'Different Article',
            platform: 'csdn',
            platformArticleId: '789',
            url: 'https://blog.csdn.net/test/789'
          }
        ];

        const deduplicated = scraperService.deduplicateArticles(articles);
        
        expect(deduplicated).toHaveLength(2);
        expect(deduplicated.find(a => a.title === 'Same Article')).toBeDefined();
        expect(deduplicated.find(a => a.title === 'Different Article')).toBeDefined();
      });
    });

    describe('normalizeArticleData', () => {
      it('should normalize article data from different platforms', () => {
        const csdnArticle = {
          title: 'CSDN Article',
          content: '<h1>Title</h1><p>Content</p>',
          publishTime: '2024-01-15 10:30:00',
          readNum: '1000',
          praiseNum: '50'
        };

        const normalized = scraperService.normalizeArticleData(csdnArticle, 'csdn');

        expect(normalized).toMatchObject({
          title: 'CSDN Article',
          content: expect.any(String),
          publishedAt: expect.any(Date),
          views: 1000,
          likes: 50,
          platform: 'csdn'
        });
      });

      it('should handle missing data gracefully', () => {
        const incompleteArticle = {
          title: 'Incomplete Article'
          // Missing other fields
        };

        const normalized = scraperService.normalizeArticleData(incompleteArticle, 'juejin');

        expect(normalized.title).toBe('Incomplete Article');
        expect(normalized.views).toBe(0);
        expect(normalized.likes).toBe(0);
        expect(normalized.platform).toBe('juejin');
      });
    });
  });

  describe('Scraping Job Management', () => {
    describe('createScrapingJob', () => {
      it('should create scraping job successfully', async () => {
        const jobData = {
          userId: testUser._id,
          platforms: ['csdn', 'juejin'],
          options: {
            limit: 10,
            dateRange: {
              start: '2024-01-01',
              end: '2024-01-31'
            }
          }
        };

        const job = await scraperService.createScrapingJob(jobData);

        expect(job).toBeDefined();
        expect(job.userId.toString()).toBe(testUser._id.toString());
        expect(job.platforms).toEqual(['csdn', 'juejin']);
        expect(job.status).toBe('pending');
        expect(job.options).toEqual(jobData.options);
      });
    });

    describe('updateScrapingJobStatus', () => {
      it('should update job status and results', async () => {
        const job = await ScrapingJob.create({
          userId: testUser._id,
          platforms: ['csdn'],
          status: 'running',
          options: { limit: 5 }
        });

        const results = {
          csdn: {
            success: true,
            articlesCount: 3,
            articles: []
          }
        };

        const updatedJob = await scraperService.updateScrapingJobStatus(
          job._id,
          'completed',
          results
        );

        expect(updatedJob.status).toBe('completed');
        expect(updatedJob.results).toEqual(results);
        expect(updatedJob.completedAt).toBeDefined();
      });
    });
  });
});