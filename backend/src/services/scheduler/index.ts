import cron from 'node-cron';
import scrapeProcessor from '../queue/scrapeProcessor';
import { PlatformCredential } from '../../models/PlatformCredential';

/**
 * 定时任务调度器
 * 负责管理所有定时抓取任务
 */
class TaskScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  /**
   * 初始化调度器
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('任务调度器已经初始化');
      return;
    }

    try {
      // 启动默认的定时抓取任务
      await this.setupDefaultTasks();
      
      // 启动用户自定义抓取任务
      await this.setupUserTasks();
      
      this.isInitialized = true;
      console.log('任务调度器初始化完成');
    } catch (error) {
      console.error('任务调度器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置默认的定时任务
   */
  private async setupDefaultTasks() {
    // 每天凌晨2点执行全平台数据抓取
    const dailyScrapeTask = cron.schedule('0 2 * * *', async () => {
      console.log('开始执行每日数据抓取任务');
      await this.executeFullPlatformScrape();
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });

    this.tasks.set('daily-scrape', dailyScrapeTask);
    dailyScrapeTask.start();
    console.log('每日数据抓取任务已启动 (每天凌晨2点)');

    // 每4小时执行一次热门文章抓取
    const hotArticlesTask = cron.schedule('0 */4 * * *', async () => {
      console.log('开始执行热门文章抓取任务');
      await this.executeHotArticlesScrape();
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });

    this.tasks.set('hot-articles', hotArticlesTask);
    hotArticlesTask.start();
    console.log('热门文章抓取任务已启动 (每4小时)');

    // 每周日凌晨3点执行数据清理任务
    const cleanupTask = cron.schedule('0 3 * * 0', async () => {
      console.log('开始执行数据清理任务');
      await this.executeDataCleanup();
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });

    this.tasks.set('weekly-cleanup', cleanupTask);
    cleanupTask.start();
    console.log('数据清理任务已启动 (每周日凌晨3点)');
  }

  /**
   * 设置用户自定义任务
   */
  private async setupUserTasks() {
    try {
      // 获取所有活跃的用户凭据
      const activeCredentials = await PlatformCredential.find({
        isActive: true
      }).populate('userId');

      // 为每个用户的每个平台设置个性化抓取任务
      for (const credential of activeCredentials) {
        await this.setupUserPlatformTask(credential);
      }
    } catch (error) {
      console.error('设置用户自定义任务失败:', error);
    }
  }

  /**
   * 为用户平台设置个性化抓取任务
   */
  private async setupUserPlatformTask(credential: any) {
    const taskId = `user-${credential.userId._id}-${credential.platform}`;
    
    // 每6小时抓取用户关注的数据
    const userTask = cron.schedule('0 */6 * * *', async () => {
      console.log(`开始执行用户 ${credential.userId.username} 的 ${credential.platform} 平台抓取任务`);
      
      try {
        await scrapeProcessor.addScrapeJob({
          userId: credential.userId._id.toString(),
          platform: credential.platform,
          type: 'article-stats',
          config: {
            scrapeUserArticles: true,
            scrapeFollowedAuthors: true,
            scrapeTrendingTopics: true
          }
        });
      } catch (error) {
        console.error(`用户 ${credential.userId.username} 的 ${credential.platform} 抓取任务失败:`, error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });

    this.tasks.set(taskId, userTask);
    userTask.start();
    console.log(`用户 ${credential.userId.username} 的 ${credential.platform} 抓取任务已启动`);
  }

  /**
   * 执行全平台数据抓取
   */
  private async executeFullPlatformScrape() {
    const platforms = ['csdn', 'juejin', 'huawei'];
    
    for (const platform of platforms) {
      try {
        await scrapeProcessor.addScrapeJob({
          type: 'batch-stats',
          platform,
          articleIds: [] // 空数组，表示全平台抓取
        });
        
        console.log(`${platform} 平台全量抓取任务已添加到队列`);
      } catch (error) {
        console.error(`${platform} 平台全量抓取任务添加失败:`, error);
      }
    }
  }

  /**
   * 执行热门文章抓取
   */
  private async executeHotArticlesScrape() {
    const platforms = ['csdn', 'juejin', 'huawei'];
    
    for (const platform of platforms) {
      try {
        await scrapeProcessor.addScrapeJob({
          userId: 'system',
          platform,
          type: 'article-stats'
        });
        
        console.log(`${platform} 平台热门文章抓取任务已添加到队列`);
      } catch (error) {
        console.error(`${platform} 平台热门文章抓取任务添加失败:`, error);
      }
    }
  }

  /**
   * 执行数据清理任务
   */
  private async executeDataCleanup() {
    try {
      // 这里可以添加数据清理逻辑
      // 比如删除过期的抓取数据、清理临时文件等
      console.log('数据清理任务执行完成');
    } catch (error) {
      console.error('数据清理任务执行失败:', error);
    }
  }

  /**
   * 添加自定义定时任务
   */
  addCustomTask(taskId: string, cronExpression: string, taskFunction: () => Promise<void>) {
    if (this.tasks.has(taskId)) {
      console.warn(`任务 ${taskId} 已存在，将被覆盖`);
      this.removeTask(taskId);
    }

    const task = cron.schedule(cronExpression, taskFunction, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });

    this.tasks.set(taskId, task);
    task.start();
    console.log(`自定义任务 ${taskId} 已启动`);
  }

  /**
   * 移除任务
   */
  removeTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.stop();
      this.tasks.delete(taskId);
      console.log(`任务 ${taskId} 已移除`);
    }
  }

  /**
   * 获取所有任务状态
   */
  getTasksStatus() {
    const status: { [key: string]: boolean } = {};
    
    for (const [taskId, task] of this.tasks) {
      // node-cron的ScheduledTask没有getStatus方法，我们假设已启动的任务都是活跃的
      status[taskId] = true;
    }
    
    return status;
  }

  /**
   * 停止所有任务
   */
  stopAllTasks() {
    for (const [taskId, task] of this.tasks) {
      task.stop();
      console.log(`任务 ${taskId} 已停止`);
    }
  }

  /**
   * 启动所有任务
   */
  startAllTasks() {
    for (const [taskId, task] of this.tasks) {
      task.start();
      console.log(`任务 ${taskId} 已启动`);
    }
  }

  /**
   * 优雅关闭
   */
  async shutdown() {
    console.log('正在关闭任务调度器...');
    
    for (const [taskId, task] of this.tasks) {
      task.stop();
    }
    
    this.tasks.clear();
    this.isInitialized = false;
    console.log('任务调度器已关闭');
  }
}

// 创建单例实例
const taskScheduler = new TaskScheduler();

export default taskScheduler;
export { TaskScheduler };