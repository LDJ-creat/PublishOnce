module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 根目录
  rootDir: '.',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // 忽略的测试文件
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],
  
  // 覆盖率收集
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/index.js',
    '!src/server.js',
    '!src/config/database.js',
    '!src/migrations/**',
    '!src/seeders/**'
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/controllers/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/models/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/setupTests.js'
  ],
  
  // 全局清理
  globalTeardown: '<rootDir>/tests/config/teardownTests.js',
  
  // 模块路径映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // 转换配置
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  
  // 模块文件扩展名
  moduleFileExtensions: [
    'js',
    'json',
    'jsx',
    'ts',
    'tsx',
    'node'
  ],
  
  // 清除模拟
  clearMocks: true,
  
  // 重置模拟
  resetMocks: true,
  
  // 恢复模拟
  restoreMocks: true,
  
  // 详细输出
  verbose: true,
  
  // 测试超时时间（毫秒）
  testTimeout: 30000,
  
  // 最大并发数
  maxConcurrency: 5,
  
  // 最大工作进程数
  maxWorkers: '50%',
  
  // 错误时停止
  bail: false,
  
  // 强制退出
  forceExit: true,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  
  // 检测泄漏
  detectLeaks: false,
  
  // 全局变量
  globals: {
    'process.env.NODE_ENV': 'test'
  },
  
  // 项目配置（用于多项目设置）
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/config/setupTests.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/config/setupTests.js'],
      testTimeout: 60000
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/config/setupTests.js'],
      testTimeout: 120000
    }
  ],
  
  // 报告器配置
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-reports',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'PublishOnce Test Report',
        logoImgPath: undefined,
        inlineSource: false
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-reports',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],
  
  // 监视插件
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // 通知配置
  notify: true,
  notifyMode: 'failure-change',
  
  // 缓存配置
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // 错误处理
  errorOnDeprecated: true,
  
  // 自定义匹配器
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/setupTests.js',
    '<rootDir>/tests/utils/customMatchers.js'
  ],
  
  // 环境变量
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // 序列化器
  snapshotSerializers: [
    'jest-serializer-html'
  ],
  
  // 模拟配置
  unmockedModulePathPatterns: [
    'node_modules/react',
    'node_modules/enzyme'
  ],
  
  // 自定义解析器
  resolver: undefined,
  
  // 依赖提取器
  dependencyExtractor: undefined,
  
  // 哈希算法
  haste: {
    computeSha1: true,
    throwOnModuleCollision: true
  },
  
  // 预设配置
  preset: undefined,
  
  // 运行器
  runner: 'jest-runner',
  
  // 测试结果处理器
  testResultsProcessor: undefined,
  
  // 测试运行器
  testRunner: 'jest-circus/runner',
  
  // 测试序列化器
  testSequencer: '@jest/test-sequencer',
  
  // 转换忽略模式
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@babel/runtime))',
    '\\.pnp\\.[^\\\\]+$'
  ],
  
  // 监视忽略模式
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/test-reports/'
  ],
  
  // 自定义环境配置
  testEnvironment: '@jest/environment-node',
  
  // 全局设置
  globalSetup: undefined,
  
  // 全局清理
  globalTeardown: '<rootDir>/tests/config/teardownTests.js'
};