import { Monitor } from "@app/database";
import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";


@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly redis: Redis;

    constructor() {
        this.redis = new Redis(process.env.REDIS_URL || 'localhost:6379');
    }

    async onModuleDestroy() {
        await this.redis.quit();
    }

    getClient() {
        return this.redis;
    }

    public async set(data: Monitor, value: string, ttlSeconds?: number): Promise<void> {
        const key = `monitor:${data.id}`;
        if (ttlSeconds) {
            await this.redis.hset(key, value, 'EX', ttlSeconds);
        } else {
            await this.redis.hset(key, value);
        }
    }

    public async get(id: string): Promise<Monitor | null> {
        const key = `monitor:${id}`;
        const value = await this.redis.hgetall(key) as unknown as Monitor;
        return value;
    }

    public async delete(data: Monitor): Promise<void> {
        const key = `monitor:${data.id}`;
        await this.redis.del(key);
    }

    public async setMonitor(monitor: Monitor): Promise<void> {
        const key = `monitor:${monitor.id}`;
        await this.redis.set(key, JSON.stringify(monitor));
    }



    /**
     * 
     * @param shardno @default 0
     * @returns 
     */
    async tryAcquireBootstrapLock(shardno: number=0): Promise<boolean> {
        const result = await this.redis.set(
            `monitor:bootstrap-lock:${shardno}`,
            '1',
            'EX',
            600,
            'NX' // Set if not exists, with 60 seconds expiration
        );

        return result === 'OK';
    }

    /**
     * @param shardno @default 0
     * @returns
     */
    async tryReleaseBootstrapLock(shardno: number=0): Promise<void> {
        await this.redis.del(`monitor:bootstrap-lock:${shardno}`);
    }



    public async getMonitor(id: string): Promise<Monitor | null> {
        const key = `monitor:${id}`;
        const data = await this.redis.get(key);
        if (!data) return null;
        return JSON.parse(data) as Monitor;
    }

    public async deleteMonitor(id: string): Promise<void> {
        const key = `monitor:${id}`;
        await this.redis.del(key);
    }
}
