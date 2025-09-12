const request = require('supertest');
const app = require('../../src/app');
const { setupTestDB, cleanupTestDB } = require('../helpers/database');
const { createTestUser, createTestArticle } = require('../factories');
const mongoose = require('mongoose');
const os = require('os');

describe('容量测试', () => {
  let testUsers = [];
  let authTokens = [];
  
  beforeAll(async () => {
    await setupTestDB();
    
    // 创建测试用户
    for (let i = 0; i < 20; i++) {
      const user = await createTestUser({
        email: `capacitytest${i}@example.com`,
        username: `capacityuser${i}`
      });
      testUsers.push(user);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        });
      
      authTokens.push(loginResponse.body.token);
    }
  });
  
  afterAll(async () => {
    await cleanupTestDB();
  });
  
  describe('数据容量测试', () => {
    test('大量文章存储容量测试', async () => {
      const articleCount = 1000;
      const batchSize = 50;
      const startTime = Date.now();
      
      console.log(`\n📚 文章存储容量测试: ${articleCount} 篇文章`);
      
      const createdArticles = [];
      const errors = [];
      
      // 分批创建文章
      for (let batch = 0; batch < Math.ceil(articleCount / batchSize); batch++) {
        const batchPromises = [];
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, articleCount);
        
        console.log(`   批次 ${batch + 1}: 创建文章 ${batchStart + 1}-${batchEnd}`);
        
        for (let i = batchStart; i < batchEnd; i++) {
          const userIndex = i % testUsers.length;
          
          const promise = request(app)
            .post('/api/articles')
            .set('Authorization', `Bearer ${authTokens[userIndex]}`)
            .send({
              title: `容量测试文章 ${i + 1}`,
              content: `这是容量测试创建的第 ${i + 1} 篇文章。`.repeat(10), // 增加内容长度
              platforms: ['weibo', 'wechat'],
              tags: [`tag${i % 10}`, `category${i % 5}`],
              metadata: {
                testType: 'capacity',
                batchNumber: batch + 1,
                articleNumber: i + 1,
                timestamp: new Date().toISOString()
              }
            })
            .then(response => {
              createdArticles.push(response.body);
              return response;
            })
            .catch(error => {
              errors.push({ index: i, error: error.message });
              throw error;
            });
          
          batchPromises.push(promise);
        }
        
        // 等待当前批次完成
        const batchResults = await Promise.allSettled(batchPromises);
        const batchSuccessful = batchResults.filter(r => r.status === 'fulfilled').length;
        const batchFailed = batchResults.filter(r => r.status === 'rejected').length;
        
        console.log(`   批次 ${batch + 1} 完成: 成功 ${batchSuccessful}, 失败 ${batchFailed}`);
        
        // 检查内存使用
        const memoryUsage = process.memoryUsage();
        console.log(`   内存使用: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
        
        // 短暂延迟避免过载
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const successfulArticles = createdArticles.length;
      const failedArticles = errors.length;
      const successRate = (successfulArticles / articleCount) * 100;
      
      console.log(`\n📊 文章存储容量测试结果:`);
      console.log(`   目标文章数: ${articleCount}`);
      console.log(`   成功创建: ${successfulArticles}`);
      console.log(`   创建失败: ${failedArticles}`);
      console.log(`   成功率: ${successRate.toFixed(2)}%`);
      console.log(`   总耗时: ${Math.round(totalDuration / 1000)}秒`);
      console.log(`   平均创建速度: ${Math.round(successfulArticles / (totalDuration / 1000))} 文章/秒`);
      
      // 测试查询性能
      const queryStart = Date.now();
      const queryResponse = await request(app)
        .get('/api/articles?limit=100')
        .set('Authorization', `Bearer ${authTokens[0]}`);
      const queryTime = Date.now() - queryStart;
      
      console.log(`   查询100篇文章耗时: ${queryTime}ms`);
      
      // 容量测试断言
      expect(successRate).toBeGreaterThan(90); // 90%成功率
      expect(queryTime).toBeLessThan(2000); // 查询时间小于2秒
      expect(successfulArticles).toBeGreaterThan(800); // 至少成功创建800篇
    }, 300000);
    
    test('大量用户容量测试', async () => {
      const userCount = 500;
      const batchSize = 25;
      const startTime = Date.now();
      
      console.log(`\n👥 用户容量测试: ${userCount} 个用户`);
      
      const createdUsers = [];
      const errors = [];
      
      // 分批创建用户
      for (let batch = 0; batch < Math.ceil(userCount / batchSize); batch++) {
        const batchPromises = [];
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, userCount);
        
        console.log(`   批次 ${batch + 1}: 创建用户 ${batchStart + 1}-${batchEnd}`);
        
        for (let i = batchStart; i < batchEnd; i++) {
          const promise = request(app)
            .post('/api/auth/register')
            .send({
              username: `capacityuser${i}`,
              email: `capacityuser${i}@example.com`,
              password: 'password123',
              profile: {
                bio: `这是容量测试用户 ${i + 1} 的个人简介`,
                location: `测试城市 ${i % 10}`,
                website: `https://user${i}.example.com`
              }
            })
            .then(response => {
              createdUsers.push(response.body);
              return response;
            })
            .catch(error => {
              errors.push({ index: i, error: error.message });
              throw error;
            });
          
          batchPromises.push(promise);
        }
        
        const batchResults = await Promise.allSettled(batchPromises);
        const batchSuccessful = batchResults.filter(r => r.status === 'fulfilled').length;
        const batchFailed = batchResults.filter(r => r.status === 'rejected').length;
        
        console.log(`   批次 ${batch + 1} 完成: 成功 ${batchSuccessful}, 失败 ${batchFailed}`);
        
        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const successfulUsers = createdUsers.length;
      const failedUsers = errors.length;
      const successRate = (successfulUsers / userCount) * 100;
      
      console.log(`\n📊 用户容量测试结果:`);
      console.log(`   目标用户数: ${userCount}`);
      console.log(`   成功创建: ${successfulUsers}`);
      console.log(`   创建失败: ${failedUsers}`);
      console.log(`   成功率: ${successRate.toFixed(2)}%`);
      console.log(`   总耗时: ${Math.round(totalDuration / 1000)}秒`);
      console.log(`   平均创建速度: ${Math.round(successfulUsers / (totalDuration / 1000))} 用户/秒`);
      
      // 测试用户查询性能
      const queryStart = Date.now();
      const queryResponse = await request(app)
        .get('/api/admin/users?limit=50')
        .set('Authorization', `Bearer ${authTokens[0]}`);
      const queryTime = Date.now() - queryStart;
      
      console.log(`   查询50个用户耗时: ${queryTime}ms`);
      
      // 用户容量测试断言
      expect(successRate).toBeGreaterThan(85); // 85%成功率
      expect(queryTime).toBeLessThan(3000); // 查询时间小于3秒
      expect(successfulUsers).toBeGreaterThan(400); // 至少成功创建400个用户
    }, 240000);
  });
  
  describe('并发处理容量测试', () => {
    test('最大并发用户数测试', async () => {
      const maxConcurrentUsers = 100;
      const testDuration = 30000; // 30秒
      const startTime = Date.now();
      
      console.log(`\n🔄 最大并发用户数测试: ${maxConcurrentUsers} 并发用户, ${testDuration / 1000}秒`);
      
      const activeConnections = new Set();
      const completedRequests = [];
      const errors = [];
      let requestCounter = 0;
      
      // 创建并发用户会话
      const userSessions = [];
      for (let i = 0; i < maxConcurrentUsers; i++) {
        const userIndex = i % testUsers.length;
        
        const session = {
          userId: testUsers[userIndex]._id,
          token: authTokens[userIndex],
          requestCount: 0,
          errors: []
        };
        
        userSessions.push(session);
      }
      
      // 启动并发请求
      const sessionPromises = userSessions.map(async (session, index) => {
        const sessionStart = Date.now();
        
        while (Date.now() - startTime < testDuration) {
          const requestId = `${index}-${++requestCounter}`;
          activeConnections.add(requestId);
          
          try {
            const requestStart = Date.now();
            
            // 随机选择API操作
            const operations = [
              () => request(app).get('/api/articles').set('Authorization', `Bearer ${session.token}`),
              () => request(app).get('/api/profile').set('Authorization', `Bearer ${session.token}`),
              () => request(app).post('/api/articles').set('Authorization', `Bearer ${session.token}`).send({
                title: `并发测试文章 ${requestId}`,
                content: `并发测试内容 ${Date.now()}`,
                platforms: ['weibo']
              }),
              () => request(app).get('/api/statistics/overview').set('Authorization', `Bearer ${session.token}`)
            ];
            
            const operation = operations[Math.floor(Math.random() * operations.length)];
            const response = await operation();
            
            const responseTime = Date.now() - requestStart;
            
            completedRequests.push({
              sessionIndex: index,
              requestId,
              responseTime,
              status: response.status,
              timestamp: requestStart
            });
            
            session.requestCount++;
            
          } catch (error) {
            const errorInfo = {
              sessionIndex: index,
              requestId,
              error: error.message,
              timestamp: Date.now()
            };
            
            errors.push(errorInfo);
            session.errors.push(errorInfo);
          } finally {
            activeConnections.delete(requestId);
          }
          
          // 短暂延迟避免过于频繁的请求
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        }
        
        return {
          sessionIndex: index,
          duration: Date.now() - sessionStart,
          requestCount: session.requestCount,
          errorCount: session.errors.length
        };
      });
      
      // 等待所有会话完成
      const sessionResults = await Promise.all(sessionPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // 统计结果
      const totalRequests = completedRequests.length + errors.length;
      const successfulRequests = completedRequests.length;
      const failedRequests = errors.length;
      const successRate = (successfulRequests / totalRequests) * 100;
      const avgResponseTime = completedRequests.reduce((sum, req) => sum + req.responseTime, 0) / completedRequests.length;
      const maxResponseTime = Math.max(...completedRequests.map(req => req.responseTime));
      const minResponseTime = Math.min(...completedRequests.map(req => req.responseTime));
      
      // 计算QPS
      const qps = Math.round(totalRequests / (totalDuration / 1000));
      
      console.log(`\n📊 最大并发用户数测试结果:`);
      console.log(`   并发用户数: ${maxConcurrentUsers}`);
      console.log(`   测试时长: ${Math.round(totalDuration / 1000)}秒`);
      console.log(`   总请求数: ${totalRequests}`);
      console.log(`   成功请求: ${successfulRequests}`);
      console.log(`   失败请求: ${failedRequests}`);
      console.log(`   成功率: ${successRate.toFixed(2)}%`);
      console.log(`   QPS: ${qps}`);
      console.log(`   平均响应时间: ${Math.round(avgResponseTime)}ms`);
      console.log(`   最小响应时间: ${minResponseTime}ms`);
      console.log(`   最大响应时间: ${maxResponseTime}ms`);
      
      // 分析每个会话的性能
      const avgRequestsPerSession = sessionResults.reduce((sum, s) => sum + s.requestCount, 0) / sessionResults.length;
      const avgErrorsPerSession = sessionResults.reduce((sum, s) => sum + s.errorCount, 0) / sessionResults.length;
      
      console.log(`   平均每会话请求数: ${Math.round(avgRequestsPerSession)}`);
      console.log(`   平均每会话错误数: ${Math.round(avgErrorsPerSession)}`);
      
      // 并发容量测试断言
      expect(successRate).toBeGreaterThan(80); // 80%成功率
      expect(avgResponseTime).toBeLessThan(3000); // 平均响应时间小于3秒
      expect(qps).toBeGreaterThan(10); // QPS大于10
    }, 180000);
    
    test('数据库连接池容量测试', async () => {
      const maxConnections = 50;
      const operationsPerConnection = 20;
      const startTime = Date.now();
      
      console.log(`\n🗄️  数据库连接池容量测试: ${maxConnections} 连接, 每连接 ${operationsPerConnection} 操作`);
      
      const connectionPromises = [];
      const results = [];
      const errors = [];
      
      // 创建数据库连接测试
      for (let i = 0; i < maxConnections; i++) {
        const connectionPromise = (async (connectionIndex) => {
          const connectionStart = Date.now();
          const connectionResults = [];
          const connectionErrors = [];
          
          for (let j = 0; j < operationsPerConnection; j++) {
            try {
              const operationStart = Date.now();
              
              // 随机数据库操作
              const operations = [
                () => mongoose.connection.db.collection('users').findOne({}),
                () => mongoose.connection.db.collection('articles').findOne({}),
                () => mongoose.connection.db.collection('users').countDocuments(),
                () => mongoose.connection.db.collection('articles').countDocuments(),
                () => mongoose.connection.db.collection('users').find({}).limit(5).toArray()
              ];
              
              const operation = operations[Math.floor(Math.random() * operations.length)];
              const result = await operation();
              
              const operationTime = Date.now() - operationStart;
              
              connectionResults.push({
                connectionIndex,
                operationIndex: j,
                operationTime,
                timestamp: operationStart
              });
              
            } catch (error) {
              connectionErrors.push({
                connectionIndex,
                operationIndex: j,
                error: error.message,
                timestamp: Date.now()
              });
            }
          }
          
          return {
            connectionIndex,
            duration: Date.now() - connectionStart,
            successfulOperations: connectionResults.length,
            failedOperations: connectionErrors.length,
            results: connectionResults,
            errors: connectionErrors
          };
        })(i);
        
        connectionPromises.push(connectionPromise);
      }
      
      // 等待所有连接完成
      const connectionResults = await Promise.allSettled(connectionPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // 统计结果
      const successfulConnections = connectionResults.filter(r => r.status === 'fulfilled').length;
      const failedConnections = connectionResults.filter(r => r.status === 'rejected').length;
      
      let totalOperations = 0;
      let successfulOperations = 0;
      let failedOperations = 0;
      let totalOperationTime = 0;
      
      connectionResults.forEach(result => {
        if (result.status === 'fulfilled') {
          const conn = result.value;
          totalOperations += conn.successfulOperations + conn.failedOperations;
          successfulOperations += conn.successfulOperations;
          failedOperations += conn.failedOperations;
          
          conn.results.forEach(op => {
            totalOperationTime += op.operationTime;
          });
        }
      });
      
      const connectionSuccessRate = (successfulConnections / maxConnections) * 100;
      const operationSuccessRate = (successfulOperations / totalOperations) * 100;
      const avgOperationTime = totalOperationTime / successfulOperations;
      const operationsPerSecond = Math.round(totalOperations / (totalDuration / 1000));
      
      console.log(`\n📊 数据库连接池容量测试结果:`);
      console.log(`   目标连接数: ${maxConnections}`);
      console.log(`   成功连接: ${successfulConnections}`);
      console.log(`   失败连接: ${failedConnections}`);
      console.log(`   连接成功率: ${connectionSuccessRate.toFixed(2)}%`);
      console.log(`   总操作数: ${totalOperations}`);
      console.log(`   成功操作: ${successfulOperations}`);
      console.log(`   失败操作: ${failedOperations}`);
      console.log(`   操作成功率: ${operationSuccessRate.toFixed(2)}%`);
      console.log(`   平均操作时间: ${Math.round(avgOperationTime)}ms`);
      console.log(`   操作吞吐量: ${operationsPerSecond} ops/sec`);
      console.log(`   总耗时: ${Math.round(totalDuration / 1000)}秒`);
      
      // 数据库连接池容量测试断言
      expect(connectionSuccessRate).toBeGreaterThan(90); // 90%连接成功率
      expect(operationSuccessRate).toBeGreaterThan(85); // 85%操作成功率
      expect(avgOperationTime).toBeLessThan(1000); // 平均操作时间小于1秒
    }, 120000);
  });
  
  describe('存储容量测试', () => {
    test('大文件上传容量测试', async () => {
      const fileCount = 20;
      const fileSizeKB = 100; // 100KB per file
      const startTime = Date.now();
      
      console.log(`\n📁 大文件上传容量测试: ${fileCount} 个文件, 每个 ${fileSizeKB}KB`);
      
      const uploadResults = [];
      const errors = [];
      
      for (let i = 0; i < fileCount; i++) {
        try {
          const uploadStart = Date.now();
          
          // 创建模拟文件内容
          const fileContent = 'x'.repeat(fileSizeKB * 1024);
          const buffer = Buffer.from(fileContent);
          
          const response = await request(app)
            .post('/api/upload')
            .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
            .attach('file', buffer, `capacity-test-${i}.txt`)
            .field('description', `容量测试文件 ${i + 1}`);
          
          const uploadTime = Date.now() - uploadStart;
          
          uploadResults.push({
            fileIndex: i,
            uploadTime,
            fileSize: fileSizeKB * 1024,
            response: response.body
          });
          
          console.log(`   文件 ${i + 1}/${fileCount} 上传完成: ${uploadTime}ms`);
          
        } catch (error) {
          errors.push({
            fileIndex: i,
            error: error.message
          });
          
          console.log(`   文件 ${i + 1}/${fileCount} 上传失败: ${error.message}`);
        }
        
        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const successfulUploads = uploadResults.length;
      const failedUploads = errors.length;
      const successRate = (successfulUploads / fileCount) * 100;
      const totalDataSize = successfulUploads * fileSizeKB * 1024;
      const avgUploadTime = uploadResults.reduce((sum, r) => sum + r.uploadTime, 0) / successfulUploads;
      const uploadThroughput = Math.round(totalDataSize / (totalDuration / 1000)); // bytes per second
      
      console.log(`\n📊 大文件上传容量测试结果:`);
      console.log(`   目标文件数: ${fileCount}`);
      console.log(`   成功上传: ${successfulUploads}`);
      console.log(`   上传失败: ${failedUploads}`);
      console.log(`   成功率: ${successRate.toFixed(2)}%`);
      console.log(`   总数据量: ${Math.round(totalDataSize / 1024)}KB`);
      console.log(`   平均上传时间: ${Math.round(avgUploadTime)}ms`);
      console.log(`   上传吞吐量: ${Math.round(uploadThroughput / 1024)}KB/s`);
      console.log(`   总耗时: ${Math.round(totalDuration / 1000)}秒`);
      
      // 大文件上传容量测试断言
      expect(successRate).toBeGreaterThan(80); // 80%成功率
      expect(avgUploadTime).toBeLessThan(5000); // 平均上传时间小于5秒
      expect(uploadThroughput).toBeGreaterThan(10240); // 吞吐量大于10KB/s
    }, 180000);
  });
  
  describe('系统扩展性测试', () => {
    test('渐进式负载测试', async () => {
      const phases = [
        { users: 10, duration: 10000, name: '轻负载' },
        { users: 25, duration: 15000, name: '中负载' },
        { users: 50, duration: 20000, name: '重负载' },
        { users: 75, duration: 15000, name: '极重负载' }
      ];
      
      console.log(`\n📈 渐进式负载测试开始`);
      
      const phaseResults = [];
      
      for (const [index, phase] of phases.entries()) {
        console.log(`\n   阶段 ${index + 1}: ${phase.name} - ${phase.users} 用户, ${phase.duration / 1000}秒`);
        
        const phaseStart = Date.now();
        const phaseRequests = [];
        const phaseErrors = [];
        
        // 创建阶段性并发用户
        const userPromises = [];
        for (let i = 0; i < phase.users; i++) {
          const userIndex = i % testUsers.length;
          
          const userPromise = (async () => {
            const userStart = Date.now();
            const userRequests = [];
            const userErrors = [];
            
            while (Date.now() - phaseStart < phase.duration) {
              try {
                const requestStart = Date.now();
                
                const response = await request(app)
                  .get('/api/articles')
                  .set('Authorization', `Bearer ${authTokens[userIndex]}`)
                  .timeout(5000);
                
                const responseTime = Date.now() - requestStart;
                
                userRequests.push({
                  timestamp: requestStart,
                  responseTime,
                  status: response.status
                });
                
              } catch (error) {
                userErrors.push({
                  timestamp: Date.now(),
                  error: error.message
                });
              }
              
              // 用户请求间隔
              await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
            }
            
            return {
              userIndex: i,
              duration: Date.now() - userStart,
              requests: userRequests,
              errors: userErrors
            };
          })();
          
          userPromises.push(userPromise);
        }
        
        // 等待阶段完成
        const userResults = await Promise.all(userPromises);
        const phaseEnd = Date.now();
        const phaseDuration = phaseEnd - phaseStart;
        
        // 统计阶段结果
        let totalRequests = 0;
        let totalErrors = 0;
        let totalResponseTime = 0;
        
        userResults.forEach(user => {
          totalRequests += user.requests.length;
          totalErrors += user.errors.length;
          totalResponseTime += user.requests.reduce((sum, req) => sum + req.responseTime, 0);
        });
        
        const phaseSuccessRate = ((totalRequests - totalErrors) / totalRequests) * 100;
        const phaseAvgResponseTime = totalResponseTime / totalRequests;
        const phaseQPS = Math.round(totalRequests / (phaseDuration / 1000));
        
        const phaseResult = {
          phase: index + 1,
          name: phase.name,
          users: phase.users,
          duration: phaseDuration,
          totalRequests,
          totalErrors,
          successRate: phaseSuccessRate,
          avgResponseTime: phaseAvgResponseTime,
          qps: phaseQPS
        };
        
        phaseResults.push(phaseResult);
        
        console.log(`   阶段 ${index + 1} 结果:`);
        console.log(`     请求数: ${totalRequests}`);
        console.log(`     错误数: ${totalErrors}`);
        console.log(`     成功率: ${phaseSuccessRate.toFixed(2)}%`);
        console.log(`     平均响应时间: ${Math.round(phaseAvgResponseTime)}ms`);
        console.log(`     QPS: ${phaseQPS}`);
        
        // 阶段间短暂休息
        if (index < phases.length - 1) {
          console.log(`   休息 2 秒...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`\n📊 渐进式负载测试总结:`);
      phaseResults.forEach(result => {
        console.log(`   ${result.name}: ${result.users} 用户, QPS ${result.qps}, 成功率 ${result.successRate.toFixed(1)}%`);
      });
      
      // 分析性能趋势
      const qpsTrend = phaseResults.map(r => r.qps);
      const responseTimeTrend = phaseResults.map(r => r.avgResponseTime);
      const successRateTrend = phaseResults.map(r => r.successRate);
      
      console.log(`   QPS趋势: ${qpsTrend.join(' → ')}`);
      console.log(`   响应时间趋势: ${responseTimeTrend.map(t => Math.round(t)).join(' → ')}ms`);
      console.log(`   成功率趋势: ${successRateTrend.map(r => r.toFixed(1)).join(' → ')}%`);
      
      // 渐进式负载测试断言
      expect(phaseResults[0].successRate).toBeGreaterThan(95); // 轻负载成功率 > 95%
      expect(phaseResults[phaseResults.length - 1].successRate).toBeGreaterThan(70); // 极重负载成功率 > 70%
      expect(Math.max(...qpsTrend)).toBeGreaterThan(20); // 最大QPS > 20
    }, 300000);
  });
});

// 容量测试工具函数
function createCapacityTestScenario(options = {}) {
  const {
    maxUsers = 100,
    rampUpTime = 30000,
    sustainTime = 60000,
    rampDownTime = 30000,
    endpoint = '/api/health',
    method = 'GET'
  } = options;
  
  return new Promise(async (resolve) => {
    const results = {
      rampUp: [],
      sustain: [],
      rampDown: [],
      errors: []
    };
    
    const startTime = Date.now();
    
    // 渐进增加用户
    console.log(`开始渐进增加用户阶段: ${rampUpTime / 1000}秒`);
    // ... 实现渐进增加逻辑
    
    // 维持最大负载
    console.log(`开始维持最大负载阶段: ${sustainTime / 1000}秒`);
    // ... 实现维持负载逻辑
    
    // 渐进减少用户
    console.log(`开始渐进减少用户阶段: ${rampDownTime / 1000}秒`);
    // ... 实现渐进减少逻辑
    
    resolve(results);
  });
}

module.exports = {
  createCapacityTestScenario
};