import Bull from 'bull';
import Redis from 'ioredis';
export declare const redis: Redis;
export declare const publishQueue: Bull.Queue<any>;
export declare const scrapeQueue: Bull.Queue<any>;
export declare const notificationQueue: Bull.Queue<any>;
declare const _default: {
    publishQueue: Bull.Queue<any>;
    scrapeQueue: Bull.Queue<any>;
    notificationQueue: Bull.Queue<any>;
    redis: Redis;
};
export default _default;
//# sourceMappingURL=index.d.ts.map