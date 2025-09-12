const jwt = require('jsonwebtoken');
const auth = require('../../../src/middleware/auth');
const User = require('../../../src/models/User');
const { connectDB, closeDB, clearDB } = require('../../utils/testHelpers');

// Mock Express request and response objects
const mockRequest = (headers = {}) => ({
  headers,
  get: function(name) {
    return this.headers[name.toLowerCase()];
  }
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Auth Middleware Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();
    jest.clearAllMocks();
  });

  describe('JWT Token Validation', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword'
      });

      validToken = jwt.sign(
        { userId: testUser._id.toString() },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    it('should authenticate with valid Bearer token', async () => {
      const req = mockRequest({
        authorization: `Bearer ${validToken}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(testUser._id.toString());
      expect(req.user.email).toBe(testUser.email);
    });

    it('should authenticate with valid token in lowercase authorization header', async () => {
      const req = mockRequest({
        authorization: `bearer ${validToken}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
    });

    it('should reject request without authorization header', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. No token provided.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', async () => {
      const req = mockRequest({
        authorization: 'InvalidFormat'
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      const req = mockRequest({
        authorization: 'Bearer invalid-token'
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Invalid token.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id.toString() },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const req = mockRequest({
        authorization: `Bearer ${expiredToken}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Token expired.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when user not found in database', async () => {
      // Create token with non-existent user ID
      const nonExistentUserId = '507f1f77bcf86cd799439011';
      const tokenWithInvalidUser = jwt.sign(
        { userId: nonExistentUserId },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const req = mockRequest({
        authorization: `Bearer ${tokenWithInvalidUser}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. User not found.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with token signed with wrong secret', async () => {
      const tokenWithWrongSecret = jwt.sign(
        { userId: testUser._id.toString() },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const req = mockRequest({
        authorization: `Bearer ${tokenWithWrongSecret}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Invalid token.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.findById to throw an error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const req = mockRequest({
        authorization: `Bearer ${validToken}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error during authentication.'
      });
      expect(mockNext).not.toHaveBeenCalled();

      // Restore original method
      User.findById = originalFindById;
    });

    it('should handle malformed JWT payload', async () => {
      // Create token without userId
      const tokenWithoutUserId = jwt.sign(
        { someOtherField: 'value' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const req = mockRequest({
        authorization: `Bearer ${tokenWithoutUserId}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Invalid token payload.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token Extraction', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword'
      });

      validToken = jwt.sign(
        { userId: testUser._id.toString() },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    it('should extract token from Authorization header with Bearer prefix', async () => {
      const req = mockRequest({
        authorization: `Bearer ${validToken}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
    });

    it('should handle extra whitespace in authorization header', async () => {
      const req = mockRequest({
        authorization: `  Bearer   ${validToken}  `
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
    });

    it('should be case insensitive for Bearer keyword', async () => {
      const req = mockRequest({
        authorization: `BEARER ${validToken}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
    });
  });

  describe('User Data Attachment', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        bio: 'Test bio',
        avatar: 'avatar-url'
      });

      validToken = jwt.sign(
        { userId: testUser._id.toString() },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    it('should attach complete user data to request object', async () => {
      const req = mockRequest({
        authorization: `Bearer ${validToken}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(testUser._id.toString());
      expect(req.user.username).toBe(testUser.username);
      expect(req.user.email).toBe(testUser.email);
      expect(req.user.bio).toBe(testUser.bio);
      expect(req.user.avatar).toBe(testUser.avatar);
      expect(req.user.password).toBeUndefined(); // Password should not be included
    });

    it('should not include sensitive fields in user data', async () => {
      const req = mockRequest({
        authorization: `Bearer ${validToken}`
      });
      const res = mockResponse();

      await auth(req, res, mockNext);

      expect(req.user.password).toBeUndefined();
      expect(req.user.__v).toBeUndefined();
    });
  });
});