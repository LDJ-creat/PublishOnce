const request = require('supertest');
const app = require('../../src/app');
const { setupTestDB, cleanupTestDB } = require('../helpers/database');
const { createTestUser, createTestArticle } = require('../factories');
const mongoose = require('mongoose');
const os = require('os');
const cluster = require('cluster');

describe('压力测试', () => {
  let testUsers = [];
  let authTokens = [];
  
  beforeAll(async () => {
    await setupTestDB();
    
    // 创建多个测试用户
    for (let i = 0; i < 10; i++) {
      const user = await createTestUser({
        email: `stresstest${i}@example.com`,
        username: `stressuser${i}`
      });
      testUsers.push(user);
      
      // 获取认证token
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
  
  describe('极限并发测试', () => {
    test('极限用户并发登录', async () => {
      const maxConcurrentUsers = 200;
      const requestsPerUser = 20;
      const startTime = Date.now();
      
      console.log(`\n🚀 开始极限并发测试: ${maxConcurrentUsers} 用户, 每用户 ${requestsPerUser} 请求`);
      
      const promises = [];
      const errors = [];
      const responseTimes = [];
      
      for (let i = 0; i < maxConcurrentUsers; i++) {
        for (let j = 0; j < requestsPerUser; j++) {
          const userIndex = i % testUsers.length;
          const requestStart = Date.now();
          
          const promise = request(app)
            .post('/api/auth/login')
            .send({
              email: testUsers[userIndex].email,
              password: 'password123'
            })
            .then(response => {
              const responseTime = Date.now() - requestStart;
              responseTimes.push(responseTime);
              return response;
            })
            .catch(error => {
              errors.push(error);
              const responseTime = Date.now() - requestStart;
              responseTimes.push(responseTime);
              throw error;
            });
          
          promises.push(promise);
        }
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // 统计结果
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalRequests = successful + failed;
      const successRate = (successful / totalRequests) * 100;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      // 计算百分位数
      responseTimes.sort((a, b) => a - b);
      const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
      
      console.log(`\n📊 极限并发测试结果:`);
      console.log(`   总请求数: ${totalRequests}`);
      console.log(`   成功请求: ${successful}`);
      console.log(`   失败请求: ${failed}`);
      console.log(`   成功率: ${successRate.toFixed(2)}%`);
      console.log(`   总耗时: ${totalDuration}ms`);
      console.log(`   QPS: ${Math.round((totalRequests / totalDuration) * 1000)}`);
      console.log(`   平均响应时间: ${Math.round(avgResponseTime)}ms`);
      console.log(`   最小响应时间: ${minResponseTime}ms`);
      console.log(`   最大响应时间: ${maxResponseTime}ms`);
      console.log(`   P95响应时间: ${p95ResponseTime}ms`);
      console.log(`   P99响应时间: ${p99ResponseTime}ms`);
      
      // 压力测试断言（相对宽松）
      expect(successRate).toBeGreaterThan(70); // 70%成功率
      expect(avgResponseTime).toBeLessThan(5000); // 平均响应时间小于5秒
      expect(p95ResponseTime).toBeLessThan(10000); // P95响应时间小于10秒
    }, 300000);
    
    test('数据库连接池压力测试', async () => {
      const maxConnections = 100;
      const operationsPerConnection = 50;
      const startTime = Date.now();
      
      console.log(`\n🔥 数据库压力测试: ${maxConnections} 连接, 每连接 ${operationsPerConnection} 操作`);
      
      const promises = [];
      const errors = [];
      
      for (let i = 0; i < maxConnections; i++) {
        for (let j = 0; j < operationsPerConnection; j++) {
          const promise = mongoose.connection.db
            .collection('users')
            .findOne({ _id: testUsers[i % testUsers.length]._id })
            .catch(error => {
              errors.push(error);
              throw error;
            });
          
          promises.push(promise);
        }
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalOperations = successful + failed;
      const successRate = (successful / totalOperations) * 100;
      
      console.log(`\n📊 数据库压力测试结果:`);
      console.log(`   总操作数: ${totalOperations}`);
      console.log(`   成功操作: ${successful}`);
      console.log(`   失败操作: ${failed}`);
      console.log(`   成功率: ${successRate.toFixed(2)}%`);
      console.log(`   总耗时: ${totalDuration}ms`);
      console.log(`   OPS: ${Math.round((totalOperations / totalDuration) * 1000)}`);
      console.log(`   错误数量: ${errors.length}`);
      
      // 数据库压力测试断言
      expect(successRate).toBeGreaterThan(80); // 80%成功率
      expect(errors.length).toBeLessThan(totalOperations * 0.2); // 错误率小于20%
    }, 180000);
  });
  
  describe('资源耗尽测试', () => {
    test('内存压力测试', async () => {
      const initialMemory = process.memoryUsage();
      const largeDataSets = [];
      
      console.log(`\n💾 内存压力测试开始`);
      console.log(`   初始内存使用: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      
      try {
        // 创建大量数据来测试内存限制
        for (let i = 0; i < 1000; i++) {
          const largeData = {
            id: i,
            data: new Array(10000).fill(`large-data-${i}`),
            timestamp: new Date(),
            metadata: {
              processed: false,
              size: 10000,
              type: 'stress-test'
            }
          };
          
          largeDataSets.push(largeData);
          
          // 每100次迭代检查内存使用
          if (i % 100 === 0) {
            const currentMemory = process.memoryUsage();
            const heapUsed = Math.round(currentMemory.heapUsed / 1024 / 1024);
            const heapTotal = Math.round(currentMemory.heapTotal / 1024 / 1024);
            
            console.log(`   迭代 ${i}: 堆内存 ${heapUsed}MB / ${heapTotal}MB`);
            
            // 如果内存使用超过500MB，停止测试
            if (currentMemory.heapUsed > 500 * 1024 * 1024) {
              console.log(`   ⚠️  内存使用达到限制，停止测试`);
              break;
            }
          }
          
          // 模拟一些API调用
          if (i % 50 === 0) {
            await request(app)
              .get('/api/articles')
              .set('Authorization', `Bearer ${authTokens[0]}`);
          }
        }
        
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        console.log(`\n📊 内存压力测试结果:`);
        console.log(`   最终内存使用: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
        console.log(`   内存增长: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
        console.log(`   数据集大小: ${largeDataSets.length}`);
        
        // 清理数据
        largeDataSets.length = 0;
        
        // 强制垃圾回收
        if (global.gc) {
          global.gc();
          const afterGcMemory = process.memoryUsage();
          console.log(`   GC后内存: ${Math.round(afterGcMemory.heapUsed / 1024 / 1024)}MB`);
        }
        
        // 内存测试断言
        expect(memoryIncrease).toBeLessThan(600 * 1024 * 1024); // 内存增长小于600MB
        
      } catch (error) {
        console.error('内存压力测试出错:', error.message);
        throw error;
      }
    }, 300000);
    
    test('文件描述符压力测试', async () => {
      console.log(`\n📁 文件描述符压力测试开始`);
      
      const connections = [];
      const maxConnections = 100;
      
      try {
        // 创建大量HTTP连接
        for (let i = 0; i < maxConnections; i++) {
          const promise = request(app)
            .get('/api/health')
            .timeout(30000); // 30秒超时
          
          connections.push(promise);
          
          // 每10个连接检查一次
          if (i % 10 === 0) {
            console.log(`   创建连接: ${i + 1}/${maxConnections}`);
          }
        }
        
        const results = await Promise.allSettled(connections);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`\n📊 文件描述符压力测试结果:`);
        console.log(`   总连接数: ${maxConnections}`);
        console.log(`   成功连接: ${successful}`);
        console.log(`   失败连接: ${failed}`);
        console.log(`   成功率: ${((successful / maxConnections) * 100).toFixed(2)}%`);
        
        // 文件描述符测试断言
        expect(successful / maxConnections).toBeGreaterThan(0.8); // 80%成功率
        
      } catch (error) {
        console.error('文件描述符压力测试出错:', error.message);
        throw error;
      }
    }, 120000);
  });
  
  describe('长时间运行测试', () => {
    test('持续负载测试', async () => {
      const testDuration = 60000; // 1分钟
      const requestInterval = 100; // 每100ms一个请求
      const startTime = Date.now();
      
      console.log(`\n⏱️  持续负载测试: ${testDuration / 1000}秒`);
      
      const results = [];
      const errors = [];
      let requestCount = 0;
      
      const testInterval = setInterval(async () => {
        const currentTime = Date.now();
        if (currentTime - startTime >= testDuration) {
          clearInterval(testInterval);
          return;
        }
        
        requestCount++;
        const userIndex = requestCount % testUsers.length;
        
        try {
          const response = await request(app)
            .get('/api/articles')
            .set('Authorization', `Bearer ${authTokens[userIndex]}`)
            .timeout(5000);
          
          results.push({
            timestamp: currentTime,
            status: response.status,
            responseTime: Date.now() - currentTime
          });
        } catch (error) {
          errors.push({
            timestamp: currentTime,
            error: error.message
          });
        }
        
        // 每10秒输出一次状态
        if (requestCount % 100 === 0) {
          const elapsed = Math.round((currentTime - startTime) / 1000);
          console.log(`   ${elapsed}s: 请求 ${requestCount}, 成功 ${results.length}, 错误 ${errors.length}`);
        }
      }, requestInterval);
      
      // 等待测试完成
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (Date.now() - startTime >= testDuration) {
            clearInterval(checkInterval);
            clearInterval(testInterval);
            resolve();
          }
        }, 1000);
      });
      
      const totalRequests = results.length + errors.length;
      const successRate = (results.length / totalRequests) * 100;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      console.log(`\n📊 持续负载测试结果:`);
      console.log(`   测试时长: ${Math.round((Date.now() - startTime) / 1000)}秒`);
      console.log(`   总请求数: ${totalRequests}`);
      console.log(`   成功请求: ${results.length}`);
      console.log(`   失败请求: ${errors.length}`);
      console.log(`   成功率: ${successRate.toFixed(2)}%`);
      console.log(`   平均响应时间: ${Math.round(avgResponseTime)}ms`);
      console.log(`   平均QPS: ${Math.round(totalRequests / (testDuration / 1000))}`);
      
      // 持续负载测试断言
      expect(successRate).toBeGreaterThan(85); // 85%成功率
      expect(avgResponseTime).toBeLessThan(2000); // 平均响应时间小于2秒
    }, 120000);
  });
  
  describe('系统资源监控', () => {
    test('系统资源使用监控', async () => {
      console.log(`\n🖥️  系统资源监控开始`);
      
      const initialStats = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      };
      
      console.log(`\n📊 初始系统状态:`);
      console.log(`   内存使用: ${Math.round(initialStats.memory.heapUsed / 1024 / 1024)}MB`);
      console.log(`   运行时间: ${Math.round(initialStats.uptime)}秒`);
      console.log(`   CPU核心数: ${os.cpus().length}`);
      console.log(`   系统负载: ${os.loadavg().map(l => l.toFixed(2)).join(', ')}`);
      console.log(`   空闲内存: ${Math.round(os.freemem() / 1024 / 1024)}MB`);
      console.log(`   总内存: ${Math.round(os.totalmem() / 1024 / 1024)}MB`);
      
      // 执行一些负载操作
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const promise = request(app)
          .post('/api/articles')
          .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
          .send({
            title: `压力测试文章 ${i}`,
            content: `这是压力测试创建的文章内容 ${Date.now()}`,
            platforms: ['weibo']
          });
        
        promises.push(promise);
      }
      
      await Promise.allSettled(promises);
      
      const finalStats = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(initialStats.cpu),
        uptime: process.uptime()
      };
      
      const memoryIncrease = finalStats.memory.heapUsed - initialStats.memory.heapUsed;
      const cpuUsage = (finalStats.cpu.user + finalStats.cpu.system) / 1000000; // 转换为秒
      
      console.log(`\n📊 最终系统状态:`);
      console.log(`   内存使用: ${Math.round(finalStats.memory.heapUsed / 1024 / 1024)}MB`);
      console.log(`   内存增长: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      console.log(`   CPU时间: ${cpuUsage.toFixed(2)}秒`);
      console.log(`   系统负载: ${os.loadavg().map(l => l.toFixed(2)).join(', ')}`);
      console.log(`   空闲内存: ${Math.round(os.freemem() / 1024 / 1024)}MB`);
      
      // 系统资源断言
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 内存增长小于100MB
      expect(os.freemem()).toBeGreaterThan(100 * 1024 * 1024); // 至少100MB空闲内存
    }, 60000);
  });
});

// 压力测试工具函数
function createStressTestScenario(options = {}) {
  const {
    duration = 30000,
    concurrency = 10,
    requestsPerSecond = 5,
    endpoint = '/api/health',
    method = 'GET',
    headers = {},
    body = null
  } = options;
  
  return new Promise((resolve) => {
    const results = [];
    const errors = [];
    const startTime = Date.now();
    let requestCount = 0;
    
    const interval = setInterval(async () => {
      if (Date.now() - startTime >= duration) {
        clearInterval(interval);
        resolve({ results, errors, requestCount });
        return;
      }
      
      for (let i = 0; i < concurrency; i++) {
        requestCount++;
        
        const requestStart = Date.now();
        
        try {
          let req = request(app)[method.toLowerCase()](endpoint);
          
          Object.keys(headers).forEach(key => {
            req = req.set(key, headers[key]);
          });
          
          if (body) {
            req = req.send(body);
          }
          
          const response = await req;
          
          results.push({
            timestamp: requestStart,
            responseTime: Date.now() - requestStart,
            status: response.status
          });
        } catch (error) {
          errors.push({
            timestamp: requestStart,
            error: error.message
          });
        }
      }
    }, 1000 / requestsPerSecond);
  });
}

module.exports = {
  createStressTestScenario
};