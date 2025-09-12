#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// 测试配置
const TEST_CONFIG = {
  unit: {
    pattern: 'tests/unit/**/*.test.js',
    timeout: 30000,
    setupFiles: ['<rootDir>/tests/config/setupTests.js'],
    testEnvironment: 'node',
    maxWorkers: '50%'
  },
  integration: {
    pattern: 'tests/integration/**/*.test.js',
    timeout: 60000,
    setupFiles: ['<rootDir>/tests/config/setupTests.js'],
    testEnvironment: 'node',
    maxWorkers: 1
  },
  e2e: {
    pattern: 'tests/e2e/**/*.test.js',
    timeout: 120000,
    setupFiles: ['<rootDir>/tests/config/setupTests.js'],
    testEnvironment: 'node',
    maxWorkers: 1
  },
  security: {
    pattern: 'tests/security/**/*.test.js',
    timeout: 60000,
    setupFiles: ['<rootDir>/tests/config/setupTests.js'],
    testEnvironment: 'node',
    maxWorkers: 1
  },
  performance: {
    pattern: 'tests/performance/**/*.test.js',
    timeout: 300000,
    setupFiles: ['<rootDir>/tests/config/setupTests.js'],
    testEnvironment: 'node',
    maxWorkers: 1
  }
};

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: 'unit',
    coverage: false,
    watch: false,
    verbose: false,
    ci: false,
    bail: false,
    updateSnapshot: false,
    parallel: true,
    maxWorkers: null,
    testNamePattern: null,
    testPathPattern: null,
    silent: false,
    detectOpenHandles: false,
    forceExit: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--type':
        options.type = args[++i];
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--ci':
        options.ci = true;
        break;
      case '--bail':
        options.bail = true;
        break;
      case '--updateSnapshot':
        options.updateSnapshot = true;
        break;
      case '--no-parallel':
        options.parallel = false;
        break;
      case '--maxWorkers':
        options.maxWorkers = args[++i];
        break;
      case '--testNamePattern':
      case '-t':
        options.testNamePattern = args[++i];
        break;
      case '--testPathPattern':
        options.testPathPattern = args[++i];
        break;
      case '--silent':
        options.silent = true;
        break;
      case '--detectOpenHandles':
        options.detectOpenHandles = true;
        break;
      case '--forceExit':
        options.forceExit = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

// 显示帮助信息
function showHelp() {
  console.log(`
使用方法: node scripts/test.js [选项]

选项:
  --type <type>           测试类型 (unit|integration|e2e|security|performance)
  --coverage              生成覆盖率报告
  --watch                 监视模式
  --verbose               详细输出
  --ci                    CI模式
  --bail                  遇到失败时停止
  --updateSnapshot        更新快照
  --no-parallel           禁用并行执行
  --maxWorkers <num>      最大工作进程数
  --testNamePattern <pattern>  测试名称模式
  -t <pattern>            测试名称模式（简写）
  --testPathPattern <pattern>  测试路径模式
  --silent                静默模式
  --detectOpenHandles     检测打开的句柄
  --forceExit             强制退出
  --help                  显示帮助信息

示例:
  node scripts/test.js --type unit --coverage
  node scripts/test.js --type integration --watch
  node scripts/test.js --type e2e --ci
  node scripts/test.js --type unit -t "User" --verbose
  node scripts/test.js --type integration --testPathPattern "auth"
`);
}

// 检查环境
async function checkEnvironment() {
  console.log('🔍 检查测试环境...');
  
  // 检查Node.js版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    console.error('❌ 需要Node.js 16或更高版本');
    process.exit(1);
  }
  console.log(`✅ Node.js版本: ${nodeVersion}`);

  // 检查必要的环境变量
  const requiredEnvVars = [
    'NODE_ENV',
    'MONGODB_URI',
    'REDIS_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn('⚠️  缺少环境变量:', missingVars.join(', '));
  }

  // 检查测试数据库连接
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  NODE_ENV不是test，可能会影响测试数据库');
  }

  // 检查依赖
  try {
    await exec('npm list jest --depth=0');
    console.log('✅ Jest已安装');
  } catch (error) {
    console.error('❌ Jest未安装或版本不兼容');
    process.exit(1);
  }

  // 检查测试目录
  const testDirs = ['tests/unit', 'tests/integration', 'tests/e2e', 'tests/security', 'tests/performance'];
  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  测试目录不存在: ${dir}`);
    }
  }

  // 检查服务连接
  if (process.env.MONGODB_URI) {
    try {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI, { 
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      await mongoose.disconnect();
      console.log('✅ MongoDB连接正常');
    } catch (error) {
      console.warn('⚠️  MongoDB连接失败:', error.message);
    }
  }

  if (process.env.REDIS_URL) {
    try {
      const redis = require('redis');
      const client = redis.createClient({ url: process.env.REDIS_URL });
      await client.connect();
      await client.ping();
      await client.disconnect();
      console.log('✅ Redis连接正常');
    } catch (error) {
      console.warn('⚠️  Redis连接失败:', error.message);
    }
  }

  console.log('✅ 环境检查完成');
}

// 构建Jest命令
function buildJestCommand(options) {
  const config = TEST_CONFIG[options.type];
  if (!config) {
    console.error(`❌ 不支持的测试类型: ${options.type}`);
    process.exit(1);
  }

  const jestArgs = [
    '--testMatch', `**/${config.pattern}`,
    '--testTimeout', config.timeout.toString(),
    '--testEnvironment', config.testEnvironment
  ];

  // 添加setupFiles
  if (config.setupFiles) {
    jestArgs.push('--setupFilesAfterEnv', ...config.setupFiles);
  }

  // 工作进程配置
  const maxWorkers = options.maxWorkers || config.maxWorkers;
  if (maxWorkers) {
    jestArgs.push('--maxWorkers', maxWorkers.toString());
  }

  if (!options.parallel) {
    jestArgs.push('--runInBand');
  }

  // 添加选项
  if (options.coverage) {
    jestArgs.push('--coverage');
    jestArgs.push('--coverageDirectory', 'coverage');
    jestArgs.push('--coverageReporters', 'text', 'lcov', 'html', 'json', 'cobertura');
    jestArgs.push('--collectCoverageFrom', 'src/**/*.{js,ts}');
    jestArgs.push('--collectCoverageFrom', '!src/**/*.d.ts');
    jestArgs.push('--collectCoverageFrom', '!src/**/*.test.{js,ts}');
    jestArgs.push('--collectCoverageFrom', '!src/**/__tests__/**');
    jestArgs.push('--coverageThreshold', JSON.stringify({
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }));
  }

  if (options.watch) {
    jestArgs.push('--watch');
  }

  if (options.verbose) {
    jestArgs.push('--verbose');
  }

  if (options.silent) {
    jestArgs.push('--silent');
  }

  if (options.ci) {
    jestArgs.push('--ci');
    jestArgs.push('--watchman=false');
    jestArgs.push('--passWithNoTests');
  }

  if (options.bail) {
    jestArgs.push('--bail');
  }

  if (options.updateSnapshot) {
    jestArgs.push('--updateSnapshot');
  }

  if (options.testNamePattern) {
    jestArgs.push('--testNamePattern', options.testNamePattern);
  }

  if (options.testPathPattern) {
    jestArgs.push('--testPathPattern', options.testPathPattern);
  }

  if (options.detectOpenHandles) {
    jestArgs.push('--detectOpenHandles');
  }

  if (options.forceExit) {
    jestArgs.push('--forceExit');
  }

  // 报告器配置
  if (options.ci) {
    jestArgs.push('--reporters', 'default', 'jest-junit');
  }

  return jestArgs;
}

// 测试前设置
async function setupTests(options) {
  console.log(`🚀 开始运行${options.type}测试...`);
  
  // 创建必要的目录
  const dirs = [
    'test-reports', 
    'coverage', 
    `test-reports/${options.type}`,
    'test-reports/junit',
    'test-reports/performance',
    'test-reports/security'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 创建目录: ${dir}`);
    }
  });

  // 设置环境变量
  process.env.NODE_ENV = 'test';
  process.env.JEST_JUNIT_OUTPUT_DIR = 'test-reports/junit';
  process.env.JEST_JUNIT_OUTPUT_NAME = `${options.type}-results.xml`;
  
  // 清理之前的报告（仅当不是watch模式时）
  if (!options.watch) {
    const reportDir = `test-reports/${options.type}`;
    if (fs.existsSync(reportDir)) {
      fs.rmSync(reportDir, { recursive: true, force: true });
      fs.mkdirSync(reportDir, { recursive: true });
      console.log(`🧹 清理报告目录: ${reportDir}`);
    }
  }

  // 预热数据库连接（仅对需要数据库的测试）
  if (['integration', 'e2e', 'performance'].includes(options.type)) {
    console.log('🔥 预热数据库连接...');
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 10000
        });
        console.log('✅ 数据库连接已建立');
      }
    } catch (error) {
      console.warn('⚠️  数据库预热失败:', error.message);
    }
  }

  // 记录测试开始时间
  const startTime = new Date().toISOString();
  const testInfo = {
    type: options.type,
    startTime,
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    options
  };
  
  fs.writeFileSync(
    `test-reports/${options.type}/test-info.json`,
    JSON.stringify(testInfo, null, 2)
  );
}

// 运行测试
function runTests(jestArgs) {
  return new Promise((resolve) => {
    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: 'inherit',
      shell: true
    });

    jest.on('close', (code) => {
      resolve(code);
    });

    jest.on('error', (error) => {
      console.error('❌ 启动Jest失败:', error.message);
      resolve(1);
    });
  });
}

// 测试后清理
async function cleanupTests(options, exitCode) {
  console.log('🧹 清理测试环境...');
  
  try {
    // 生成测试报告摘要
    await generateTestSummary(options, exitCode);
    
    // 断开数据库连接
    if (['integration', 'e2e', 'performance'].includes(options.type)) {
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
          console.log('🔌 数据库连接已断开');
        }
      } catch (error) {
        console.warn('⚠️  断开数据库连接失败:', error.message);
      }
    }
    
    // 清理Redis连接
    try {
      const redis = require('redis');
      // 清理可能存在的Redis连接
      if (global.redisClient) {
        await global.redisClient.disconnect();
        console.log('🔌 Redis连接已断开');
      }
    } catch (error) {
      // Redis清理失败不影响主流程
    }
    
    // 清理临时文件
    const tempDirs = ['temp', '.tmp', 'test-temp'];
    tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`🗑️  删除临时目录: ${dir}`);
      }
    });
    
    // 清理测试数据库（如果是测试环境）
    if (process.env.NODE_ENV === 'test' && !options.watch) {
      console.log('🗑️  清理测试数据...');
      // 这里可以添加清理测试数据的逻辑
    }
    
    console.log('✅ 清理完成');
  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error.message);
  }
}

// 生成测试报告摘要
async function generateTestSummary(options, exitCode) {
  const endTime = new Date().toISOString();
  const testInfoPath = `test-reports/${options.type}/test-info.json`;
  
  let startTime = endTime;
  if (fs.existsSync(testInfoPath)) {
    const testInfo = JSON.parse(fs.readFileSync(testInfoPath, 'utf8'));
    startTime = testInfo.startTime;
  }
  
  const duration = new Date(endTime) - new Date(startTime);
  
  const summary = {
    type: options.type,
    startTime,
    endTime,
    duration: `${Math.round(duration / 1000)}s`,
    exitCode,
    success: exitCode === 0,
    nodeVersion: process.version,
    platform: os.platform(),
    options,
    reports: [],
    coverage: null,
    testResults: null
  };

  // 检查各种报告文件
  const reportFiles = [
    { type: 'coverage-lcov', file: 'coverage/lcov.info' },
    { type: 'coverage-html', file: 'coverage/index.html' },
    { type: 'coverage-json', file: 'coverage/coverage-final.json' },
    { type: 'junit', file: `test-reports/junit/${options.type}-results.xml` },
    { type: 'jest-results', file: `test-reports/${options.type}/results.json` }
  ];

  reportFiles.forEach(report => {
    report.exists = fs.existsSync(report.file);
    if (report.exists) {
      report.size = fs.statSync(report.file).size;
      report.modified = fs.statSync(report.file).mtime.toISOString();
    }
    summary.reports.push(report);
  });

  // 读取覆盖率信息
  if (options.coverage && fs.existsSync('coverage/coverage-final.json')) {
    try {
      const coverageData = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));
      const totals = Object.values(coverageData).reduce((acc, file) => {
        acc.lines += file.s ? Object.keys(file.s).length : 0;
        acc.functions += file.f ? Object.keys(file.f).length : 0;
        acc.branches += file.b ? Object.keys(file.b).length : 0;
        acc.statements += file.s ? Object.keys(file.s).length : 0;
        return acc;
      }, { lines: 0, functions: 0, branches: 0, statements: 0 });
      
      summary.coverage = totals;
    } catch (error) {
      console.warn('⚠️  读取覆盖率数据失败:', error.message);
    }
  }

  // 保存摘要
  const summaryPath = `test-reports/${options.type}/summary.json`;
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // 也保存到根目录（用于CI）
  fs.writeFileSync('test-reports/summary.json', JSON.stringify(summary, null, 2));

  // 输出摘要信息
  console.log('\n📊 测试报告摘要:');
  console.log(`   类型: ${summary.type}`);
  console.log(`   结果: ${summary.success ? '✅ 成功' : '❌ 失败'}`);
  console.log(`   耗时: ${summary.duration}`);
  console.log(`   退出码: ${summary.exitCode}`);
  
  if (summary.coverage) {
    console.log(`   覆盖率: ${summary.coverage.lines} 行, ${summary.coverage.functions} 函数`);
  }
  
  const existingReports = summary.reports.filter(r => r.exists);
  if (existingReports.length > 0) {
    console.log('   报告文件:');
    existingReports.forEach(report => {
      console.log(`     - ${report.type}: ${report.file}`);
    });
  }
  
  console.log(`\n📄 详细摘要已保存到: ${summaryPath}`);
}

// 主函数
async function main() {
  const options = parseArgs();
  let exitCode = 1;
  
  try {
    console.log('🧪 PublishOnce 测试套件');
    console.log('========================\n');
    
    // 检查环境
    await checkEnvironment();
    
    // 测试前设置
    await setupTests(options);
    
    // 构建Jest命令
    const jestArgs = buildJestCommand(options);
    
    console.log(`\n🏃 运行命令: npx jest ${jestArgs.join(' ')}\n`);
    
    // 运行测试
    exitCode = await runTests(jestArgs);
    
    // 测试后清理
    await cleanupTests(options, exitCode);
    
    if (exitCode === 0) {
      console.log('\n🎉 所有测试通过！');
    } else {
      console.log('\n💥 测试失败，请检查上面的错误信息');
    }
    
  } catch (error) {
    console.error('\n❌ 测试运行过程中出现错误:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    exitCode = 1;
  } finally {
    // 确保清理工作完成
    try {
      await cleanupTests(options, exitCode);
    } catch (cleanupError) {
      console.error('清理过程中出现错误:', cleanupError.message);
    }
    
    // 在CI环境中强制退出
    if (options.ci || options.forceExit) {
      process.exit(exitCode);
    }
  }
  
  return exitCode;
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n收到中断信号，正在清理...');
  try {
    // 执行清理工作
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    // 忽略清理错误
  }
  process.exit(0);
});

// 如果直接运行此脚本
if (require.main === module) {
  main().then(exitCode => {
    if (!process.env.CI) {
      process.exit(exitCode);
    }
  }).catch(error => {
    console.error('主函数执行失败:', error);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, checkEnvironment, buildJestCommand };