const request = require('supertest');
const app = require('../../src/app');
const { setupTestDB, cleanupTestDB } = require('../helpers/database');
const { createTestUser, createTestArticle } = require('../factories');
const mongoose = require('mongoose');
const cluster = require('cluster');
const os = require('os');

describe('负载测试', () => {
  let testUser;
  let authToken;
  
  beforeAll(async () => {
    await setupTestDB();
    testUser = await createTestUser();
    
    // 获取认证token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });
  
  afterAll(async () => {
    await cleanupTestDB();
  });
  
  describe('API端点负载测试', () => {
    test('用户认证接口负载测试', async () => {
      const concurrentRequests = 50;
      const requestsPerUser = 10;
      const startTime = Date.now();
      
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        for (let j = 0; j < requestsPerUser; j++) {
          const promise = request(app)
            .post('/api/auth/login')
            .send({
              email: testUser.email,
              password: 'password123'
            })
            .expect(200);
          
          promises.push(promise);
        }
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 统计结果
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalRequests = successful + failed;
      const requestsPerSecond = Math.round((totalRequests / duration) * 1000);
      
      console.log(`\n📊 用户认证负载测试结果:`);
      console.log(`   总请求数: ${totalRequests}`);
      console.log(`   成功请求: ${successful}`);
      console.log(`   失败请求: ${failed}`);
      console.log(`   总耗时: ${duration}ms`);
      console.log(`   QPS: ${requestsPerSecond}`);
      console.log(`   平均响应时间: ${Math.round(duration / totalRequests)}ms`);
      
      // 性能断言
      expect(successful / totalRequests).toBeGreaterThan(0.95); // 95%成功率
      expect(requestsPerSecond).toBeGreaterThan(10); // 至少10 QPS
      expect(duration / totalRequests).toBeLessThan(1000); // 平均响应时间小于1秒
    }, 60000);
    
    test('文章创建接口负载测试', async () => {
      const concurrentUsers = 20;
      const articlesPerUser = 5;
      const startTime = Date.now();
      
      const promises = [];
      
      for (let i = 0; i < concurrentUsers; i++) {
        for (let j = 0; j < articlesPerUser; j++) {
          const promise = request(app)
            .post('/api/articles')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              title: `负载测试文章 ${i}-${j}`,
              content: `这是负载测试创建的文章内容 ${Date.now()}`,
              platforms: ['weibo', 'wechat']
            })
            .expect(201);
          
          promises.push(promise);
        }
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 统计结果
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalRequests = successful + failed;
      const requestsPerSecond = Math.round((totalRequests / duration) * 1000);
      
      console.log(`\n📊 文章创建负载测试结果:`);
      console.log(`   总请求数: ${totalRequests}`);
      console.log(`   成功请求: ${successful}`);
      console.log(`   失败请求: ${failed}`);
      console.log(`   总耗时: ${duration}ms`);
      console.log(`   QPS: ${requestsPerSecond}`);
      console.log(`   平均响应时间: ${Math.round(duration / totalRequests)}ms`);
      
      // 性能断言
      expect(successful / totalRequests).toBeGreaterThan(0.90); // 90%成功率
      expect(requestsPerSecond).toBeGreaterThan(5); // 至少5 QPS
      expect(duration / totalRequests).toBeLessThan(2000); // 平均响应时间小于2秒
    }, 120000);
    
    test('文章列表查询负载测试', async () => {
      // 先创建一些测试数据
      const testArticles = [];
      for (let i = 0; i < 100; i++) {
        const article = await createTestArticle({ author: testUser._id });
        testArticles.push(article);
      }
      
      const concurrentRequests = 100;
      const startTime = Date.now();
      
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app)
          .get('/api/articles')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            page: Math.floor(Math.random() * 10) + 1,
            limit: 10
          })
          .expect(200);
        
        promises.push(promise);
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 统计结果
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalRequests = successful + failed;
      const requestsPerSecond = Math.round((totalRequests / duration) * 1000);
      
      console.log(`\n📊 文章列表查询负载测试结果:`);
      console.log(`   总请求数: ${totalRequests}`);
      console.log(`   成功请求: ${successful}`);
      console.log(`   失败请求: ${failed}`);
      console.log(`   总耗时: ${duration}ms`);
      console.log(`   QPS: ${requestsPerSecond}`);
      console.log(`   平均响应时间: ${Math.round(duration / totalRequests)}ms`);
      
      // 性能断言
      expect(successful / totalRequests).toBeGreaterThan(0.98); // 98%成功率
      expect(requestsPerSecond).toBeGreaterThan(20); // 至少20 QPS
      expect(duration / totalRequests).toBeLessThan(500); // 平均响应时间小于500ms
    }, 60000);
  });
  
  describe('数据库负载测试', () => {
    test('MongoDB连接池负载测试', async () => {
      const concurrentConnections = 50;
      const operationsPerConnection = 10;
      const startTime = Date.now();
      
      const promises = [];
      
      for (let i = 0; i < concurrentConnections; i++) {
        for (let j = 0; j < operationsPerConnection; j++) {
          const promise = mongoose.connection.db
            .collection('articles')
            .findOne({ author: testUser._id });
          
          promises.push(promise);
        }
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 统计结果
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalOperations = successful + failed;
      const operationsPerSecond = Math.round((totalOperations / duration) * 1000);
      
      console.log(`\n📊 MongoDB负载测试结果:`);
      console.log(`   总操作数: ${totalOperations}`);
      console.log(`   成功操作: ${successful}`);
      console.log(`   失败操作: ${failed}`);
      console.log(`   总耗时: ${duration}ms`);
      console.log(`   OPS: ${operationsPerSecond}`);
      console.log(`   平均响应时间: ${Math.round(duration / totalOperations)}ms`);
      
      // 性能断言
      expect(successful / totalOperations).toBeGreaterThan(0.95);
      expect(operationsPerSecond).toBeGreaterThan(50);
    }, 30000);
  });
  
  describe('内存使用测试', () => {
    test('内存泄漏检测', async () => {
      const initialMemory = process.memoryUsage();
      
      // 执行大量操作
      for (let i = 0; i < 1000; i++) {
        await request(app)
          .get('/api/articles')
          .set('Authorization', `Bearer ${authToken}`);
        
        // 每100次操作检查一次内存
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage();
          const heapUsedDiff = currentMemory.heapUsed - initialMemory.heapUsed;
          
          console.log(`操作 ${i}: 堆内存增长 ${Math.round(heapUsedDiff / 1024 / 1024)}MB`);
          
          // 如果内存增长超过100MB，可能存在内存泄漏
          if (heapUsedDiff > 100 * 1024 * 1024) {
            console.warn('⚠️  检测到可能的内存泄漏');
          }
        }
      }
      
      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const heapUsedDiff = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`\n📊 内存使用测试结果:`);
      console.log(`   初始堆内存: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`   最终堆内存: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`   内存增长: ${Math.round(heapUsedDiff / 1024 / 1024)}MB`);
      
      // 内存增长不应超过50MB
      expect(heapUsedDiff).toBeLessThan(50 * 1024 * 1024);
    }, 300000);
  });
  
  describe('CPU使用测试', () => {
    test('CPU密集型操作测试', async () => {
      const startTime = process.hrtime.bigint();
      const startCpuUsage = process.cpuUsage();
      
      // 模拟CPU密集型操作
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const promise = request(app)
          .post('/api/articles/batch-process')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            operation: 'analyze',
            articleIds: [testUser._id] // 使用测试数据
          });
        
        promises.push(promise);
      }
      
      await Promise.allSettled(promises);
      
      const endTime = process.hrtime.bigint();
      const endCpuUsage = process.cpuUsage(startCpuUsage);
      const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
      
      const cpuPercent = ((endCpuUsage.user + endCpuUsage.system) / (duration * 1000)) * 100;
      
      console.log(`\n📊 CPU使用测试结果:`);
      console.log(`   总耗时: ${Math.round(duration)}ms`);
      console.log(`   用户CPU时间: ${Math.round(endCpuUsage.user / 1000)}ms`);
      console.log(`   系统CPU时间: ${Math.round(endCpuUsage.system / 1000)}ms`);
      console.log(`   CPU使用率: ${Math.round(cpuPercent)}%`);
      
      // CPU使用率不应超过80%
      expect(cpuPercent).toBeLessThan(80);
    }, 60000);
  });
});

// 性能测试辅助函数
function measurePerformance(fn, iterations = 1000) {
  return new Promise(async (resolve) => {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await fn();
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1000000); // 转换为毫秒
    }
    
    times.sort((a, b) => a - b);
    
    const stats = {
      min: times[0],
      max: times[times.length - 1],
      mean: times.reduce((a, b) => a + b, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)]
    };
    
    resolve(stats);
  });
}

// 导出性能测试工具
module.exports = {
  measurePerformance
};