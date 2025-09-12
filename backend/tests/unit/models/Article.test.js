const mongoose = require('mongoose');
const Article = require('../../../src/models/Article');
const User = require('../../../src/models/User');
const { connectDB, closeDB, clearDB, createTestUser } = require('../../utils/testHelpers');
const { generateArticleData } = require('../../fixtures/dataFactory');

describe('Article Model Tests', () => {
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
      email: 'test@example.com'
    });
  });

  describe('Article Creation', () => {
    it('should create article with valid data', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        content: '# Test Content\n\nThis is a test article.',
        author: testUser._id,
        tags: ['test', 'article'],
        category: 'Technology'
      });

      const article = new Article(articleData);
      const savedArticle = await article.save();

      expect(savedArticle._id).toBeDefined();
      expect(savedArticle.title).toBe(articleData.title);
      expect(savedArticle.content).toBe(articleData.content);
      expect(savedArticle.author.toString()).toBe(testUser._id.toString());
      expect(savedArticle.status).toBe('draft'); // Default status
      expect(savedArticle.tags).toEqual(expect.arrayContaining(articleData.tags));
      expect(savedArticle.createdAt).toBeDefined();
      expect(savedArticle.updatedAt).toBeDefined();
    });

    it('should set default values correctly', async () => {
      const articleData = {
        title: 'Minimal Article',
        content: 'Minimal content',
        author: testUser._id
      };

      const article = new Article(articleData);
      const savedArticle = await article.save();

      expect(savedArticle.status).toBe('draft');
      expect(savedArticle.tags).toEqual([]);
      expect(savedArticle.platforms).toEqual([]);
      expect(savedArticle.views).toBe(0);
      expect(savedArticle.likes).toBe(0);
      expect(savedArticle.comments).toBe(0);
    });

    it('should auto-generate slug from title', async () => {
      const articleData = generateArticleData({
        title: 'This is a Test Article Title',
        author: testUser._id
      });

      const article = new Article(articleData);
      const savedArticle = await article.save();

      expect(savedArticle.slug).toBe('this-is-a-test-article-title');
    });

    it('should handle duplicate slugs', async () => {
      const articleData1 = generateArticleData({
        title: 'Duplicate Title',
        author: testUser._id
      });

      const articleData2 = generateArticleData({
        title: 'Duplicate Title',
        author: testUser._id
      });

      const article1 = new Article(articleData1);
      const savedArticle1 = await article1.save();

      const article2 = new Article(articleData2);
      const savedArticle2 = await article2.save();

      expect(savedArticle1.slug).toBe('duplicate-title');
      expect(savedArticle2.slug).toMatch(/^duplicate-title-\d+$/);
    });
  });

  describe('Article Validation', () => {
    it('should require title', async () => {
      const articleData = generateArticleData({
        content: 'Content without title',
        author: testUser._id
      });
      delete articleData.title;

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow(/title.*required/i);
    });

    it('should require content', async () => {
      const articleData = generateArticleData({
        title: 'Title without content',
        author: testUser._id
      });
      delete articleData.content;

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow(/content.*required/i);
    });

    it('should require author', async () => {
      const articleData = generateArticleData({
        title: 'Article without author',
        content: 'Content without author'
      });

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow(/author.*required/i);
    });

    it('should validate title length', async () => {
      const articleData = generateArticleData({
        title: 'a'.repeat(201), // Too long
        author: testUser._id
      });

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow(/title.*200/i);
    });

    it('should validate summary length', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        author: testUser._id,
        summary: 'a'.repeat(501) // Too long
      });

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow(/summary.*500/i);
    });

    it('should validate status enum', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        author: testUser._id,
        status: 'invalid-status'
      });

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow(/status.*enum/i);
    });

    it('should validate tags array', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        author: testUser._id,
        tags: 'not-an-array'
      });

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow();
    });

    it('should limit number of tags', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        author: testUser._id,
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`) // Too many tags
      });

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow(/tags.*10/i);
    });

    it('should validate tag length', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        author: testUser._id,
        tags: ['a'.repeat(31)] // Tag too long
      });

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow(/tag.*30/i);
    });

    it('should validate author ObjectId', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        author: 'invalid-object-id'
      });

      const article = new Article(articleData);
      
      await expect(article.save()).rejects.toThrow();
    });
  });

  describe('Article Methods', () => {
    let testArticle;

    beforeEach(async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        content: '# Test Article\n\nThis is a test article with some content that can be used to generate a summary.',
        author: testUser._id,
        tags: ['test', 'article'],
        category: 'Technology'
      });

      testArticle = await Article.create(articleData);
    });

    it('should generate summary from content', () => {
      const summary = testArticle.generateSummary();
      
      expect(summary).toBeDefined();
      expect(summary.length).toBeLessThanOrEqual(200);
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should calculate reading time', () => {
      const readingTime = testArticle.calculateReadingTime();
      
      expect(readingTime).toBeDefined();
      expect(readingTime).toBeGreaterThan(0);
      expect(typeof readingTime).toBe('number');
    });

    it('should get word count', () => {
      const wordCount = testArticle.getWordCount();
      
      expect(wordCount).toBeDefined();
      expect(wordCount).toBeGreaterThan(0);
      expect(typeof wordCount).toBe('number');
    });

    it('should check if published', () => {
      expect(testArticle.isPublished()).toBe(false);
      
      testArticle.status = 'published';
      expect(testArticle.isPublished()).toBe(true);
    });

    it('should check if draft', () => {
      expect(testArticle.isDraft()).toBe(true);
      
      testArticle.status = 'published';
      expect(testArticle.isDraft()).toBe(false);
    });

    it('should get platform info', () => {
      testArticle.platforms = [
        {
          platform: 'csdn',
          articleId: '123',
          url: 'https://blog.csdn.net/test/123',
          status: 'published',
          publishedAt: new Date()
        }
      ];

      const csdnInfo = testArticle.getPlatformInfo('csdn');
      expect(csdnInfo).toBeDefined();
      expect(csdnInfo.platform).toBe('csdn');
      expect(csdnInfo.articleId).toBe('123');

      const nonExistentInfo = testArticle.getPlatformInfo('juejin');
      expect(nonExistentInfo).toBeNull();
    });

    it('should add platform info', () => {
      const platformInfo = {
        platform: 'juejin',
        articleId: '456',
        url: 'https://juejin.cn/post/456',
        status: 'published',
        publishedAt: new Date()
      };

      testArticle.addPlatformInfo(platformInfo);
      
      expect(testArticle.platforms).toHaveLength(1);
      expect(testArticle.platforms[0].platform).toBe('juejin');
    });

    it('should update platform info', () => {
      testArticle.platforms = [
        {
          platform: 'csdn',
          articleId: '123',
          status: 'pending'
        }
      ];

      testArticle.updatePlatformInfo('csdn', {
        status: 'published',
        url: 'https://blog.csdn.net/test/123',
        publishedAt: new Date()
      });

      const csdnInfo = testArticle.getPlatformInfo('csdn');
      expect(csdnInfo.status).toBe('published');
      expect(csdnInfo.url).toBeDefined();
      expect(csdnInfo.publishedAt).toBeDefined();
    });

    it('should remove platform info', () => {
      testArticle.platforms = [
        { platform: 'csdn', articleId: '123', status: 'published' },
        { platform: 'juejin', articleId: '456', status: 'published' }
      ];

      testArticle.removePlatformInfo('csdn');
      
      expect(testArticle.platforms).toHaveLength(1);
      expect(testArticle.platforms[0].platform).toBe('juejin');
    });
  });

  describe('Article Statics', () => {
    beforeEach(async () => {
      // Create test articles
      await Article.create([
        generateArticleData({
          title: 'Published Article 1',
          author: testUser._id,
          status: 'published',
          category: 'Technology',
          tags: ['javascript', 'nodejs']
        }),
        generateArticleData({
          title: 'Published Article 2',
          author: testUser._id,
          status: 'published',
          category: 'Technology',
          tags: ['python', 'django']
        }),
        generateArticleData({
          title: 'Draft Article',
          author: testUser._id,
          status: 'draft',
          category: 'Technology'
        })
      ]);
    });

    it('should find published articles', async () => {
      const publishedArticles = await Article.findPublished();
      
      expect(publishedArticles).toHaveLength(2);
      expect(publishedArticles.every(article => article.status === 'published')).toBe(true);
    });

    it('should find articles by author', async () => {
      const userArticles = await Article.findByAuthor(testUser._id);
      
      expect(userArticles).toHaveLength(3);
      expect(userArticles.every(article => article.author.toString() === testUser._id.toString())).toBe(true);
    });

    it('should find articles by category', async () => {
      const techArticles = await Article.findByCategory('Technology');
      
      expect(techArticles).toHaveLength(3);
      expect(techArticles.every(article => article.category === 'Technology')).toBe(true);
    });

    it('should find articles by tags', async () => {
      const jsArticles = await Article.findByTags(['javascript']);
      
      expect(jsArticles).toHaveLength(1);
      expect(jsArticles[0].tags).toContain('javascript');
    });

    it('should search articles by text', async () => {
      const searchResults = await Article.searchByText('Published');
      
      expect(searchResults).toHaveLength(2);
      expect(searchResults.every(article => article.title.includes('Published'))).toBe(true);
    });

    it('should get popular articles', async () => {
      // Update some articles with views
      await Article.findOneAndUpdate(
        { title: 'Published Article 1' },
        { views: 100, likes: 10 }
      );
      await Article.findOneAndUpdate(
        { title: 'Published Article 2' },
        { views: 50, likes: 5 }
      );

      const popularArticles = await Article.findPopular(1);
      
      expect(popularArticles).toHaveLength(1);
      expect(popularArticles[0].views).toBe(100);
    });

    it('should get recent articles', async () => {
      const recentArticles = await Article.findRecent(2);
      
      expect(recentArticles).toHaveLength(2);
      expect(recentArticles[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        recentArticles[1].createdAt.getTime()
      );
    });
  });

  describe('Article Hooks', () => {
    it('should update updatedAt on save', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        author: testUser._id
      });

      const article = await Article.create(articleData);
      const originalUpdatedAt = article.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      article.title = 'Updated Title';
      await article.save();

      expect(article.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should set publishedAt when status changes to published', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        author: testUser._id,
        status: 'draft'
      });

      const article = await Article.create(articleData);
      expect(article.publishedAt).toBeUndefined();

      article.status = 'published';
      await article.save();

      expect(article.publishedAt).toBeDefined();
      expect(article.publishedAt).toBeInstanceOf(Date);
    });

    it('should not change publishedAt if already published', async () => {
      const publishedAt = new Date();
      const articleData = generateArticleData({
        title: 'Test Article',
        author: testUser._id,
        status: 'published',
        publishedAt
      });

      const article = await Article.create(articleData);
      const originalPublishedAt = article.publishedAt;

      article.title = 'Updated Title';
      await article.save();

      expect(article.publishedAt.getTime()).toBe(originalPublishedAt.getTime());
    });
  });
});