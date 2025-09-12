const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Redis = require('ioredis');
const { 
  getTestDatabaseUri, 
  getTestRedisConfig, 
  createTestDirectories,
  testEnvironmentConfig 
} = require('./testConfig');
const { setupTestDatabase, setupTestRedis } = require('../utils/testHelpers');

// Global test variables
let mongoServer;
let redisClient;
let testDbConnection;

/**
 * Global Test Setup
 * This file is executed once before all tests
 */
beforeAll(async () => {
  try {
    console.log('🚀 Setting up test environment...');
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = testEnvironmentConfig.jwt.secret;
    process.env.BCRYPT_ROUNDS = testEnvironmentConfig.bcrypt.rounds.toString();
    
    // Create test directories
    createTestDirectories();
    console.log('📁 Test directories created');
    
    // Setup in-memory MongoDB for tests
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'publishonce_test',
        port: 27017
      },
      binary: {
        version: '6.0.0'
      }
    });
    
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_TEST_URI = mongoUri;
    
    // Connect to test database
    testDbConnection = await setupTestDatabase(mongoUri);
    console.log('🗄️  Test database connected');
    
    // Setup Redis for tests (use Redis mock if Redis not available)
    try {
      redisClient = await setupTestRedis(getTestRedisConfig());
      console.log('🔴 Test Redis connected');
    } catch (error) {
      console.warn('⚠️  Redis not available, using mock implementation');
      // Setup Redis mock
      const RedisMock = require('ioredis-mock');
      redisClient = new RedisMock();
      global.testRedisClient = redisClient;
    }
    
    // Setup global test utilities
    global.testDb = testDbConnection;
    global.testRedis = redisClient;
    
    // Setup global mocks
    setupGlobalMocks();
    
    console.log('✅ Test environment setup completed');
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
});

/**
 * Global Test Teardown
 * This file is executed once after all tests
 */
afterAll(async () => {
  try {
    console.log('🧹 Cleaning up test environment...');
    
    // Close database connections
    if (testDbConnection) {
      await testDbConnection.close();
      console.log('🗄️  Test database disconnected');
    }
    
    // Close Redis connection
    if (redisClient && typeof redisClient.disconnect === 'function') {
      await redisClient.disconnect();
      console.log('🔴 Test Redis disconnected');
    }
    
    // Stop MongoDB memory server
    if (mongoServer) {
      await mongoServer.stop();
      console.log('🛑 MongoDB memory server stopped');
    }
    
    // Clean up test directories
    const { cleanupTestDirectories } = require('./testConfig');
    cleanupTestDirectories();
    console.log('📁 Test directories cleaned');
    
    console.log('✅ Test environment cleanup completed');
    
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
  }
});

/**
 * Setup Global Mocks
 */
function setupGlobalMocks() {
  // Mock console methods in test environment
  if (process.env.JEST_SILENT === 'true') {
    global.console = {
      ...console,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  }
  
  // Mock Date.now for consistent testing
  const mockDate = new Date('2024-01-01T00:00:00.000Z');
  global.mockCurrentDate = mockDate;
  
  // Mock setTimeout and setInterval for faster tests
  jest.useFakeTimers({
    doNotFake: ['nextTick', 'setImmediate']
  });
  
  // Mock external HTTP requests
  const nock = require('nock');
  
  // Mock CSDN API
  nock('https://blog-console-api.csdn.net')
    .persist()
    .post('/v1/mdeditor/saveArticle')
    .reply(200, {
      code: 200,
      message: 'success',
      data: {
        id: 'mock_article_id',
        url: 'https://blog.csdn.net/testuser/article/details/123456'
      }
    });
  
  // Mock Juejin API
  nock('https://api.juejin.cn')
    .persist()
    .post('/content_api/v1/article/create')
    .reply(200, {
      err_no: 0,
      err_msg: 'success',
      data: {
        article_id: 'mock_juejin_id',
        article_url: 'https://juejin.cn/post/mock_juejin_id'
      }
    });
  
  // Mock Zhihu API
  nock('https://www.zhihu.com')
    .persist()
    .post('/api/v4/articles')
    .reply(200, {
      id: 'mock_zhihu_id',
      url: 'https://zhuanlan.zhihu.com/p/mock_zhihu_id',
      title: 'Mock Article'
    });
  
  // Mock file system operations
  const fs = require('fs');
  const path = require('path');
  
  // Create mock upload directory
  const uploadDir = path.join(__dirname, '../temp/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Mock email service
  jest.mock('nodemailer', () => ({
    createTransporter: jest.fn(() => ({
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'mock_message_id',
        response: '250 Message queued'
      })
    }))
  }));
  
  // Mock file upload middleware
  jest.mock('multer', () => {
    const multer = jest.requireActual('multer');
    return {
      ...multer,
      memoryStorage: jest.fn(() => ({
        _handleFile: jest.fn((req, file, cb) => {
          cb(null, {
            buffer: Buffer.from('mock file content'),
            size: 1024,
            mimetype: file.mimetype,
            originalname: file.originalname
          });
        }),
        _removeFile: jest.fn((req, file, cb) => cb())
      }))
    };
  });
  
  // Mock Bull Queue
  jest.mock('bull', () => {
    return jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({
        id: 'mock_job_id',
        data: {},
        opts: {}
      }),
      process: jest.fn(),
      on: jest.fn(),
      getJob: jest.fn().mockResolvedValue({
        id: 'mock_job_id',
        data: {},
        progress: jest.fn(),
        finished: jest.fn().mockResolvedValue({}),
        failed: jest.fn().mockResolvedValue(null)
      }),
      getJobs: jest.fn().mockResolvedValue([]),
      clean: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue()
    }));
  });
  
  // Mock Winston Logger
  jest.mock('winston', () => ({
    createLogger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    })),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      json: jest.fn(),
      simple: jest.fn(),
      colorize: jest.fn(),
      printf: jest.fn()
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  }));
  
  console.log('🎭 Global mocks setup completed');
}

/**
 * Custom Jest Matchers
 */
expect.extend({
  // Custom matcher for MongoDB ObjectId
  toBeValidObjectId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false
      };
    }
  },
  
  // Custom matcher for HTTP status codes
  toHaveStatus(received, expected) {
    const pass = received.status === expected;
    if (pass) {
      return {
        message: () => `expected response not to have status ${expected}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected response to have status ${expected}, but got ${received.status}`,
        pass: false
      };
    }
  },
  
  // Custom matcher for response body structure
  toHaveResponseStructure(received, expected) {
    const hasAllKeys = Object.keys(expected).every(key => 
      received.hasOwnProperty(key)
    );
    
    if (hasAllKeys) {
      return {
        message: () => `expected response not to have structure ${JSON.stringify(expected)}`,
        pass: true
      };
    } else {
      const missingKeys = Object.keys(expected).filter(key => 
        !received.hasOwnProperty(key)
      );
      return {
        message: () => `expected response to have keys: ${missingKeys.join(', ')}`,
        pass: false
      };
    }
  }
});

/**
 * Global Test Utilities
 */
global.testUtils = {
  // Wait for a specific amount of time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random test data
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Generate random email
  randomEmail: () => {
    const username = global.testUtils.randomString(8);
    return `${username}@test.com`;
  },
  
  // Generate random number
  randomNumber: (min = 1, max = 1000) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  // Deep clone object
  deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
  
  // Check if object is empty
  isEmpty: (obj) => Object.keys(obj).length === 0,
  
  // Format date for testing
  formatDate: (date) => new Date(date).toISOString(),
  
  // Mock current time
  mockTime: (date) => {
    jest.setSystemTime(new Date(date));
  },
  
  // Restore real time
  restoreTime: () => {
    jest.useRealTimers();
  }
};

console.log('🧪 Test setup configuration loaded');