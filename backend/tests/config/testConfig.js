const path = require('path');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

/**
 * Test Database Configuration
 */
const testDatabaseConfig = {
  // MongoDB Test Database
  mongodb: {
    uri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/publishonce_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    }
  },
  
  // Redis Test Database (for queue and cache)
  redis: {
    host: process.env.REDIS_TEST_HOST || 'localhost',
    port: process.env.REDIS_TEST_PORT || 6379,
    db: process.env.REDIS_TEST_DB || 1, // Use different DB for tests
    password: process.env.REDIS_TEST_PASSWORD || null,
    keyPrefix: 'test:publishonce:'
  }
};

/**
 * Test Environment Configuration
 */
const testEnvironmentConfig = {
  // Node Environment
  nodeEnv: 'test',
  
  // Server Configuration
  server: {
    port: process.env.TEST_PORT || 3001,
    host: process.env.TEST_HOST || 'localhost'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_TEST_SECRET || 'test_jwt_secret_key_for_testing_only',
    expiresIn: process.env.JWT_TEST_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_TEST_EXPIRES_IN || '7d'
  },
  
  // Bcrypt Configuration (faster for tests)
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_TEST_ROUNDS) || 4
  },
  
  // Rate Limiting (more lenient for tests)
  rateLimit: {
    windowMs: 1000, // 1 second
    max: 1000, // Allow many requests for tests
    skipSuccessfulRequests: true
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    destination: path.join(__dirname, '../temp/uploads')
  },
  
  // External Services (mocked in tests)
  externalServices: {
    email: {
      provider: 'mock',
      apiKey: 'mock_email_api_key'
    },
    storage: {
      provider: 'local',
      basePath: path.join(__dirname, '../temp/storage')
    },
    platforms: {
      csdn: {
        baseUrl: 'https://blog.csdn.net',
        apiUrl: 'https://blog-console-api.csdn.net',
        timeout: 5000
      },
      juejin: {
        baseUrl: 'https://juejin.cn',
        apiUrl: 'https://api.juejin.cn',
        timeout: 5000
      },
      zhihu: {
        baseUrl: 'https://www.zhihu.com',
        apiUrl: 'https://www.zhihu.com/api',
        timeout: 5000
      }
    }
  }
};

/**
 * Jest Configuration
 */
const jestConfig = {
  // Test Environment
  testEnvironment: 'node',
  
  // Test Match Patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Coverage Configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js', // Exclude main app file
    '!src/server.js', // Exclude server startup file
    '!src/config/**', // Exclude configuration files
    '!src/migrations/**', // Exclude database migrations
    '!src/seeds/**' // Exclude database seeds
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Setup and Teardown
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/setupTests.js'
  ],
  globalTeardown: '<rootDir>/tests/config/teardownTests.js',
  
  // Test Timeout
  testTimeout: 30000, // 30 seconds
  
  // Module Path Mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Transform Configuration
  transform: {
    '^.+\.js$': 'babel-jest'
  },
  
  // Ignore Patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // Verbose Output
  verbose: process.env.JEST_VERBOSE === 'true',
  
  // Silent Mode
  silent: process.env.JEST_SILENT === 'true',
  
  // Force Exit
  forceExit: true,
  
  // Detect Open Handles
  detectOpenHandles: true,
  
  // Max Workers
  maxWorkers: process.env.JEST_MAX_WORKERS || '50%'
};

/**
 * Test Data Configuration
 */
const testDataConfig = {
  // Default Test User
  defaultUser: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  },
  
  // Default Admin User
  defaultAdmin: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  
  // Sample Article Data
  sampleArticle: {
    title: 'Test Article',
    content: '# Test Article\n\nThis is a test article content.',
    summary: 'This is a test article summary.',
    tags: ['test', 'article'],
    category: 'Technology'
  },
  
  // Platform Configurations
  platforms: {
    csdn: {
      name: 'CSDN',
      baseUrl: 'https://blog.csdn.net',
      requiredFields: ['username', 'profileUrl'],
      optionalFields: ['bio', 'avatar']
    },
    juejin: {
      name: '掘金',
      baseUrl: 'https://juejin.cn',
      requiredFields: ['username', 'profileUrl'],
      optionalFields: ['bio', 'avatar']
    },
    zhihu: {
      name: '知乎',
      baseUrl: 'https://www.zhihu.com',
      requiredFields: ['username', 'profileUrl'],
      optionalFields: ['bio', 'avatar']
    }
  },
  
  // Test File Paths
  filePaths: {
    tempDir: path.join(__dirname, '../temp'),
    uploadsDir: path.join(__dirname, '../temp/uploads'),
    storageDir: path.join(__dirname, '../temp/storage'),
    logsDir: path.join(__dirname, '../temp/logs')
  }
};

/**
 * Performance Test Configuration
 */
const performanceTestConfig = {
  // Load Testing
  loadTest: {
    concurrentUsers: 50,
    testDuration: 60, // seconds
    rampUpTime: 10, // seconds
    thinkTime: 1000 // milliseconds
  },
  
  // Stress Testing
  stressTest: {
    maxUsers: 200,
    stepUsers: 25,
    stepDuration: 30, // seconds
    maxDuration: 300 // seconds
  },
  
  // Performance Thresholds
  thresholds: {
    responseTime: {
      p95: 2000, // 95th percentile should be under 2 seconds
      p99: 5000  // 99th percentile should be under 5 seconds
    },
    throughput: {
      min: 10 // Minimum requests per second
    },
    errorRate: {
      max: 0.05 // Maximum 5% error rate
    }
  }
};

/**
 * Security Test Configuration
 */
const securityTestConfig = {
  // Authentication Tests
  auth: {
    maxLoginAttempts: 5,
    lockoutDuration: 300, // 5 minutes
    passwordMinLength: 8,
    passwordRequirements: {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: false
    }
  },
  
  // Input Validation Tests
  validation: {
    maxInputLength: 10000,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    sqlInjectionPatterns: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --"
    ],
    xssPatterns: [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(1)">'
    ]
  },
  
  // Rate Limiting Tests
  rateLimiting: {
    apiCallsPerMinute: 60,
    loginAttemptsPerMinute: 5,
    uploadRequestsPerMinute: 10
  }
};

/**
 * Integration Test Configuration
 */
const integrationTestConfig = {
  // External API Timeouts
  timeouts: {
    api: 10000, // 10 seconds
    database: 5000, // 5 seconds
    queue: 3000, // 3 seconds
    cache: 1000 // 1 second
  },
  
  // Retry Configuration
  retries: {
    maxAttempts: 3,
    backoffDelay: 1000, // 1 second
    backoffMultiplier: 2
  },
  
  // Mock Services
  mocks: {
    enableEmailService: true,
    enableFileUpload: true,
    enableExternalAPIs: true,
    enableQueue: true,
    enableCache: true
  }
};

/**
 * Utility Functions
 */
const getTestConfig = (configType) => {
  const configs = {
    database: testDatabaseConfig,
    environment: testEnvironmentConfig,
    jest: jestConfig,
    testData: testDataConfig,
    performance: performanceTestConfig,
    security: securityTestConfig,
    integration: integrationTestConfig
  };
  
  return configs[configType] || null;
};

const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test';
};

const getTestDatabaseUri = () => {
  return testDatabaseConfig.mongodb.uri;
};

const getTestRedisConfig = () => {
  return testDatabaseConfig.redis;
};

const createTestDirectories = () => {
  const fs = require('fs');
  const directories = Object.values(testDataConfig.filePaths);
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

const cleanupTestDirectories = () => {
  const fs = require('fs');
  const path = require('path');
  
  const tempDir = testDataConfig.filePaths.tempDir;
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

module.exports = {
  // Configuration Objects
  testDatabaseConfig,
  testEnvironmentConfig,
  jestConfig,
  testDataConfig,
  performanceTestConfig,
  securityTestConfig,
  integrationTestConfig,
  
  // Utility Functions
  getTestConfig,
  isTestEnvironment,
  getTestDatabaseUri,
  getTestRedisConfig,
  createTestDirectories,
  cleanupTestDirectories
};