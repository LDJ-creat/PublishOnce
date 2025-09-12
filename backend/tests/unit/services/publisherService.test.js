const publisherService = require('../../../src/services/publisherService');
const Article = require('../../../src/models/Article');
const User = require('../../../src/models/User');
const PublishJob = require('../../../src/models/PublishJob');
const { connectDB, closeDB, clearDB, createTestUser } = require('../../utils/testHelpers');
const { generateArticleData } = require('../../fixtures/dataFactory');
const axios = require('axios');
const cheerio = require('cheerio');

// Mock external dependencies
jest.mock('axios');
jest.mock('cheerio');

describe('Publisher Service Tests', () => {
  let testUser;
  let testArticle;

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
          token: 'csdn_token_123',
          cookies: 'session=abc123; auth=xyz789',
          isActive: true
        },
        juejin: {
          username: 'testuser_juejin',
          token: 'juejin_token_456',
          cookies: 'session=def456; token=uvw012',
          isActive: true
        },
        zhihu: {
          username: 'testuser_zhihu',
          token: 'zhihu_token_789',
          cookies: 'session=ghi789; csrf=rst345',
          isActive: false
        }
      }
    });

    // Create test article
    const articleData = generateArticleData({
      title: 'Test Article for Publishing',
      content: '# Test Article\n\nThis is a **test article** for publishing to multiple platforms.\n\n## Features\n\n- Feature 1\n- Feature 2\n\n```javascript\nconsole.log("Hello World");\n```',
      author: testUser._id,
      status: 'published',
      tags: ['test', 'publishing', 'javascript'],
      category: 'Technology'
    });
    testArticle = await Article.create(articleData);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('CSDN Publisher', () => {
    describe('publishToCSDN', () => {
      it('should publish article to CSDN successfully', async () => {
        const publishOptions = {
          category: 'web',
          tags: ['javascript', 'nodejs'],
          description: 'Test article description',
          type: 'original'
        };

        // Mock successful CSDN API responses
        axios.post.mockResolvedValueOnce({
          status: 200,
          data: {
            code: 200,
            message: 'success',
            data: {
              id: 'csdn_123456',
              url: 'https://blog.csdn.net/testuser_csdn/article/details/123456'
            }
          }
        });

        const result = await publisherService.publishToCSDN(
          testArticle,
          testUser,
          publishOptions
        );

        expect(result.success).toBe(true);
        expect(result.articleId).toBe('csdn_123456');
        expect(result.url).toBe('https://blog.csdn.net/testuser_csdn/article/details/123456');
        expect(result.platform).toBe('csdn');

        // Verify API call
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('csdn.net'),
          expect.objectContaining({
            title: testArticle.title,
            content: expect.any(String),
            tags: publishOptions.tags.join(','),
            categories: publishOptions.category
          }),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Cookie': testUser.platforms.csdn.cookies,
              'Authorization': expect.stringContaining(testUser.platforms.csdn.token)
            })
          })
        );
      });

      it('should handle CSDN authentication errors', async () => {
        const publishOptions = {
          category: 'web',
          tags: ['javascript']
        };

        // Mock authentication error
        axios.post.mockRejectedValueOnce({
          response: {
            status: 401,
            data: {
              code: 401,
              message: 'Authentication failed'
            }
          }
        });

        const result = await publisherService.publishToCSDN(
          testArticle,
          testUser,
          publishOptions
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Authentication failed');
        expect(result.platform).toBe('csdn');
      });

      it('should handle CSDN rate limiting', async () => {
        const publishOptions = {
          category: 'web',
          tags: ['javascript']
        };

        // Mock rate limiting error
        axios.post.mockRejectedValueOnce({
          response: {
            status: 429,
            data: {
              code: 429,
              message: 'Rate limit exceeded'
            }
          }
        });

        const result = await publisherService.publishToCSDN(
          testArticle,
          testUser,
          publishOptions
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
        expect(result.retryAfter).toBeDefined();
      });

      it('should validate required CSDN configuration', async () => {
        const userWithoutCSDN = await createTestUser({
          username: 'nocsdnuser',
          email: 'nocsdn@example.com'
        });

        const publishOptions = {
          category: 'web',
          tags: ['javascript']
        };

        const result = await publisherService.publishToCSDN(
          testArticle,
          userWithoutCSDN,
          publishOptions
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('CSDN configuration not found');
      });

      it('should convert markdown to CSDN format', async () => {
        const publishOptions = {
          category: 'web',
          tags: ['javascript']
        };

        axios.post.mockResolvedValueOnce({
          status: 200,
          data: {
            code: 200,
            message: 'success',
            data: {
              id: 'csdn_123456',
              url: 'https://blog.csdn.net/testuser_csdn/article/details/123456'
            }
          }
        });

        await publisherService.publishToCSDN(
          testArticle,
          testUser,
          publishOptions
        );

        const callArgs = axios.post.mock.calls[0];
        const requestData = callArgs[1];

        // Verify markdown conversion
        expect(requestData.content).toContain('# Test Article');
        expect(requestData.content).toContain('**test article**');
        expect(requestData.content).toContain('```javascript');
        expect(requestData.markdowncontent).toBe(testArticle.content);
      });
    });
  });

  describe('Juejin Publisher', () => {
    describe('publishToJuejin', () => {
      it('should publish article to Juejin successfully', async () => {
        const publishOptions = {
          category: 'frontend',
          tags: ['javascript', 'vue'],
          cover_image: 'https://example.com/cover.jpg'
        };

        // Mock successful Juejin API responses
        axios.post.mockResolvedValueOnce({
          status: 200,
          data: {
            err_no: 0,
            err_msg: 'success',
            data: {
              article_id: 'juejin_789012',
              article_info: {
                article_id: 'juejin_789012',
                title: testArticle.title
              }
            }
          }
        });

        const result = await publisherService.publishToJuejin(
          testArticle,
          testUser,
          publishOptions
        );

        expect(result.success).toBe(true);
        expect(result.articleId).toBe('juejin_789012');
        expect(result.url).toBe('https://juejin.cn/post/juejin_789012');
        expect(result.platform).toBe('juejin');

        // Verify API call
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('juejin.cn'),
          expect.objectContaining({
            title: testArticle.title,
            content: expect.any(String),
            tag_ids: expect.any(Array),
            category_id: expect.any(String)
          }),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Cookie': testUser.platforms.juejin.cookies,
              'Authorization': expect.stringContaining(testUser.platforms.juejin.token)
            })
          })
        );
      });

      it('should handle Juejin content validation errors', async () => {
        const publishOptions = {
          category: 'frontend',
          tags: ['javascript']
        };

        // Mock content validation error
        axios.post.mockRejectedValueOnce({
          response: {
            status: 400,
            data: {
              err_no: 400,
              err_msg: 'Content contains sensitive words'
            }
          }
        });

        const result = await publisherService.publishToJuejin(
          testArticle,
          testUser,
          publishOptions
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Content contains sensitive words');
      });

      it('should convert tags to Juejin tag IDs', async () => {
        const publishOptions = {
          category: 'frontend',
          tags: ['javascript', 'vue', 'react']
        };

        // Mock tag resolution API
        axios.get.mockResolvedValueOnce({
          status: 200,
          data: {
            err_no: 0,
            data: [
              { tag_id: 'js_001', tag_name: 'JavaScript' },
              { tag_id: 'vue_002', tag_name: 'Vue.js' },
              { tag_id: 'react_003', tag_name: 'React' }
            ]
          }
        });

        axios.post.mockResolvedValueOnce({
          status: 200,
          data: {
            err_no: 0,
            data: { article_id: 'juejin_123' }
          }
        });

        await publisherService.publishToJuejin(
          testArticle,
          testUser,
          publishOptions
        );

        const postCall = axios.post.mock.calls.find(call => 
          call[0].includes('article')
        );
        const requestData = postCall[1];

        expect(requestData.tag_ids).toEqual(['js_001', 'vue_002', 'react_003']);
      });
    });
  });

  describe('Zhihu Publisher', () => {
    describe('publishToZhihu', () => {
      it('should publish article to Zhihu successfully', async () => {
        // Enable Zhihu for test user
        testUser.platforms.zhihu.isActive = true;
        await testUser.save();

        const publishOptions = {
          column: 'tech-column',
          topics: ['编程', '技术'],
          excerpt: 'This is a test article excerpt'
        };

        // Mock successful Zhihu API responses
        axios.post.mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: {
              id: 'zhihu_345678',
              url: 'https://zhuanlan.zhihu.com/p/345678'
            }
          }
        });

        const result = await publisherService.publishToZhihu(
          testArticle,
          testUser,
          publishOptions
        );

        expect(result.success).toBe(true);
        expect(result.articleId).toBe('zhihu_345678');
        expect(result.url).toBe('https://zhuanlan.zhihu.com/p/345678');
        expect(result.platform).toBe('zhihu');
      });

      it('should handle Zhihu column validation', async () => {
        testUser.platforms.zhihu.isActive = true;
        await testUser.save();

        const publishOptions = {
          column: 'invalid-column',
          topics: ['编程']
        };

        // Mock column validation error
        axios.post.mockRejectedValueOnce({
          response: {
            status: 403,
            data: {
              error: {
                message: 'No permission to publish to this column'
              }
            }
          }
        });

        const result = await publisherService.publishToZhihu(
          testArticle,
          testUser,
          publishOptions
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('No permission to publish');
      });

      it('should validate Zhihu platform is active', async () => {
        const publishOptions = {
          column: 'tech-column',
          topics: ['编程']
        };

        const result = await publisherService.publishToZhihu(
          testArticle,
          testUser,
          publishOptions
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Zhihu platform is not active');
      });
    });
  });

  describe('Generic Publisher Methods', () => {
    describe('publishToMultiplePlatforms', () => {
      it('should publish to multiple platforms successfully', async () => {
        const platforms = ['csdn', 'juejin'];
        const publishOptions = {
          csdn: {
            category: 'web',
            tags: ['javascript']
          },
          juejin: {
            category: 'frontend',
            tags: ['javascript', 'vue']
          }
        };

        // Mock successful responses for both platforms
        axios.post
          .mockResolvedValueOnce({
            status: 200,
            data: {
              code: 200,
              data: {
                id: 'csdn_123',
                url: 'https://blog.csdn.net/test/123'
              }
            }
          })
          .mockResolvedValueOnce({
            status: 200,
            data: {
              err_no: 0,
              data: {
                article_id: 'juejin_456',
                article_info: { article_id: 'juejin_456' }
              }
            }
          });

        const results = await publisherService.publishToMultiplePlatforms(
          testArticle,
          testUser,
          platforms,
          publishOptions
        );

        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true);
        expect(results[0].platform).toBe('csdn');
        expect(results[1].success).toBe(true);
        expect(results[1].platform).toBe('juejin');
      });

      it('should handle mixed success and failure results', async () => {
        const platforms = ['csdn', 'juejin'];
        const publishOptions = {
          csdn: { category: 'web', tags: ['javascript'] },
          juejin: { category: 'frontend', tags: ['javascript'] }
        };

        // Mock success for CSDN, failure for Juejin
        axios.post
          .mockResolvedValueOnce({
            status: 200,
            data: {
              code: 200,
              data: { id: 'csdn_123', url: 'https://blog.csdn.net/test/123' }
            }
          })
          .mockRejectedValueOnce({
            response: {
              status: 401,
              data: { err_msg: 'Authentication failed' }
            }
          });

        const results = await publisherService.publishToMultiplePlatforms(
          testArticle,
          testUser,
          platforms,
          publishOptions
        );

        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true);
        expect(results[0].platform).toBe('csdn');
        expect(results[1].success).toBe(false);
        expect(results[1].platform).toBe('juejin');
        expect(results[1].error).toContain('Authentication failed');
      });

      it('should validate platform availability', async () => {
        const platforms = ['csdn', 'invalid-platform'];
        const publishOptions = {
          csdn: { category: 'web', tags: ['javascript'] },
          'invalid-platform': { category: 'test' }
        };

        const results = await publisherService.publishToMultiplePlatforms(
          testArticle,
          testUser,
          platforms,
          publishOptions
        );

        expect(results).toHaveLength(2);
        expect(results[1].success).toBe(false);
        expect(results[1].error).toContain('Unsupported platform');
      });
    });

    describe('validatePublishOptions', () => {
      it('should validate CSDN publish options', () => {
        const validOptions = {
          category: 'web',
          tags: ['javascript', 'nodejs'],
          type: 'original'
        };

        const result = publisherService.validatePublishOptions('csdn', validOptions);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect invalid CSDN options', () => {
        const invalidOptions = {
          tags: ['javascript'], // Missing required category
          type: 'invalid-type'
        };

        const result = publisherService.validatePublishOptions('csdn', invalidOptions);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('category is required');
        expect(result.errors).toContain('invalid type');
      });

      it('should validate Juejin publish options', () => {
        const validOptions = {
          category: 'frontend',
          tags: ['javascript', 'vue']
        };

        const result = publisherService.validatePublishOptions('juejin', validOptions);
        expect(result.isValid).toBe(true);
      });

      it('should validate tag limits', () => {
        const tooManyTags = {
          category: 'web',
          tags: Array.from({ length: 11 }, (_, i) => `tag${i}`)
        };

        const result = publisherService.validatePublishOptions('csdn', tooManyTags);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('too many tags');
      });
    });

    describe('formatContentForPlatform', () => {
      it('should format content for CSDN', () => {
        const formatted = publisherService.formatContentForPlatform(
          testArticle.content,
          'csdn'
        );

        expect(formatted).toContain('# Test Article');
        expect(formatted).toContain('**test article**');
        expect(formatted).toContain('```javascript');
      });

      it('should format content for Juejin', () => {
        const formatted = publisherService.formatContentForPlatform(
          testArticle.content,
          'juejin'
        );

        expect(formatted).toContain('# Test Article');
        expect(formatted).toContain('**test article**');
        // Juejin might have specific formatting requirements
      });

      it('should handle code blocks properly', () => {
        const contentWithCode = '```javascript\nconsole.log("test");\n```';
        
        const csdnFormatted = publisherService.formatContentForPlatform(contentWithCode, 'csdn');
        const juejinFormatted = publisherService.formatContentForPlatform(contentWithCode, 'juejin');

        expect(csdnFormatted).toContain('```javascript');
        expect(juejinFormatted).toContain('```javascript');
      });
    });
  });
});