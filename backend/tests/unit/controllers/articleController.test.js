const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../../src/app');
const User = require('../../../src/models/User');
const Article = require('../../../src/models/Article');
const { connectDB, closeDB, clearDB, createTestUser, createAuthToken } = require('../../utils/testHelpers');
const { generateArticleData } = require('../../fixtures/dataFactory');

describe('Article Controller Tests', () => {
  let testUser;
  let authToken;
  let anotherUser;
  let anotherUserToken;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();
    
    // Create test users
    testUser = await createTestUser({
      username: 'testuser',
      email: 'test@example.com'
    });
    authToken = createAuthToken(testUser._id);

    anotherUser = await createTestUser({
      username: 'anotheruser',
      email: 'another@example.com'
    });
    anotherUserToken = createAuthToken(anotherUser._id);
  });

  describe('POST /api/articles', () => {
    it('should create a new article successfully', async () => {
      const articleData = generateArticleData({
        title: 'Test Article',
        content: '# Test Content\n\nThis is a test article.',
        tags: ['test', 'article'],
        category: 'Technology'
      });

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.article).toHaveProperty('title', articleData.title);
      expect(response.body.article).toHaveProperty('content', articleData.content);
      expect(response.body.article).toHaveProperty('author', testUser._id.toString());
      expect(response.body.article).toHaveProperty('status', 'draft');
      expect(response.body.article.tags).toEqual(expect.arrayContaining(articleData.tags));

      // Verify article was created in database
      const article = await Article.findById(response.body.article._id);
      expect(article).toBeTruthy();
      expect(article.title).toBe(articleData.title);
    });

    it('should not create article without authentication', async () => {
      const articleData = generateArticleData();

      const response = await request(app)
        .post('/api/articles')
        .send(articleData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate title length', async () => {
      const articleData = generateArticleData({
        title: 'a'.repeat(201) // Too long
      });

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate tags format', async () => {
      const articleData = generateArticleData({
        tags: 'invalid-tags-format' // Should be array
      });

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should auto-generate summary if not provided', async () => {
      const articleData = generateArticleData({
        content: 'This is a long article content that should be used to generate a summary automatically when no summary is provided by the user.'
      });
      delete articleData.summary;

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(articleData)
        .expect(201);

      expect(response.body.article).toHaveProperty('summary');
      expect(response.body.article.summary.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/articles', () => {
    beforeEach(async () => {
      // Create test articles
      await Article.create([
        generateArticleData({
          title: 'Public Article 1',
          author: testUser._id,
          status: 'published'
        }),
        generateArticleData({
          title: 'Draft Article 1',
          author: testUser._id,
          status: 'draft'
        }),
        generateArticleData({
          title: 'Another User Article',
          author: anotherUser._id,
          status: 'published'
        })
      ]);
    });

    it('should get all published articles without authentication', async () => {
      const response = await request(app)
        .get('/api/articles')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.articles).toHaveLength(2); // Only published articles
      expect(response.body.articles.every(article => article.status === 'published')).toBe(true);
    });

    it('should get user articles with authentication', async () => {
      const response = await request(app)
        .get('/api/articles?my=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.articles).toHaveLength(2); // User's articles (published + draft)
      expect(response.body.articles.every(article => article.author === testUser._id.toString())).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/articles?page=1&limit=1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.articles).toHaveLength(1);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('totalItems');
    });

    it('should support filtering by category', async () => {
      await Article.create(generateArticleData({
        title: 'Tech Article',
        author: testUser._id,
        status: 'published',
        category: 'Technology'
      }));

      const response = await request(app)
        .get('/api/articles?category=Technology')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.articles.every(article => article.category === 'Technology')).toBe(true);
    });

    it('should support filtering by tags', async () => {
      await Article.create(generateArticleData({
        title: 'Tagged Article',
        author: testUser._id,
        status: 'published',
        tags: ['javascript', 'nodejs']
      }));

      const response = await request(app)
        .get('/api/articles?tags=javascript')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.articles.some(article => 
        article.tags.includes('javascript')
      )).toBe(true);
    });

    it('should support search by title and content', async () => {
      await Article.create(generateArticleData({
        title: 'Searchable Article',
        content: 'This article contains searchable content',
        author: testUser._id,
        status: 'published'
      }));

      const response = await request(app)
        .get('/api/articles?search=searchable')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.articles.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/articles/:id', () => {
    let testArticle;
    let draftArticle;

    beforeEach(async () => {
      testArticle = await Article.create(generateArticleData({
        title: 'Test Article',
        author: testUser._id,
        status: 'published'
      }));

      draftArticle = await Article.create(generateArticleData({
        title: 'Draft Article',
        author: testUser._id,
        status: 'draft'
      }));
    });

    it('should get published article by ID', async () => {
      const response = await request(app)
        .get(`/api/articles/${testArticle._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.article).toHaveProperty('_id', testArticle._id.toString());
      expect(response.body.article).toHaveProperty('title', testArticle.title);
    });

    it('should get draft article by author', async () => {
      const response = await request(app)
        .get(`/api/articles/${draftArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.article).toHaveProperty('_id', draftArticle._id.toString());
    });

    it('should not get draft article by non-author', async () => {
      const response = await request(app)
        .get(`/api/articles/${draftArticle._id}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should not get draft article without authentication', async () => {
      const response = await request(app)
        .get(`/api/articles/${draftArticle._id}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent article', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/articles/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid article ID format', async () => {
      const response = await request(app)
        .get('/api/articles/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/articles/:id', () => {
    let testArticle;

    beforeEach(async () => {
      testArticle = await Article.create(generateArticleData({
        title: 'Original Title',
        author: testUser._id,
        status: 'draft'
      }));
    });

    it('should update article by author', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['updated', 'test']
      };

      const response = await request(app)
        .put(`/api/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.article).toHaveProperty('title', updateData.title);
      expect(response.body.article).toHaveProperty('content', updateData.content);
      expect(response.body.article.tags).toEqual(expect.arrayContaining(updateData.tags));

      // Verify update in database
      const updatedArticle = await Article.findById(testArticle._id);
      expect(updatedArticle.title).toBe(updateData.title);
    });

    it('should not update article by non-author', async () => {
      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should not update article without authentication', async () => {
      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/articles/${testArticle._id}`)
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should update article status', async () => {
      const updateData = {
        status: 'published'
      };

      const response = await request(app)
        .put(`/api/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.article).toHaveProperty('status', 'published');
      expect(response.body.article).toHaveProperty('publishedAt');
    });

    it('should validate update data', async () => {
      const updateData = {
        title: 'a'.repeat(201) // Too long
      };

      const response = await request(app)
        .put(`/api/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/articles/:id', () => {
    let testArticle;

    beforeEach(async () => {
      testArticle = await Article.create(generateArticleData({
        title: 'Article to Delete',
        author: testUser._id,
        status: 'draft'
      }));
    });

    it('should delete article by author', async () => {
      const response = await request(app)
        .delete(`/api/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Article deleted successfully');

      // Verify deletion in database
      const deletedArticle = await Article.findById(testArticle._id);
      expect(deletedArticle).toBeNull();
    });

    it('should not delete article by non-author', async () => {
      const response = await request(app)
        .delete(`/api/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);

      // Verify article still exists
      const article = await Article.findById(testArticle._id);
      expect(article).toBeTruthy();
    });

    it('should not delete article without authentication', async () => {
      const response = await request(app)
        .delete(`/api/articles/${testArticle._id}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent article', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/articles/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/articles/:id/duplicate', () => {
    let testArticle;

    beforeEach(async () => {
      testArticle = await Article.create(generateArticleData({
        title: 'Original Article',
        author: testUser._id,
        status: 'published'
      }));
    });

    it('should duplicate article by author', async () => {
      const response = await request(app)
        .post(`/api/articles/${testArticle._id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.article).toHaveProperty('title', `Copy of ${testArticle.title}`);
      expect(response.body.article).toHaveProperty('status', 'draft');
      expect(response.body.article).toHaveProperty('author', testUser._id.toString());
      expect(response.body.article._id).not.toBe(testArticle._id.toString());
    });

    it('should not duplicate article by non-author', async () => {
      const response = await request(app)
        .post(`/api/articles/${testArticle._id}/duplicate`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});