import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class PriorityQueue {
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

    async checkDataExists(queueName: string="monitors"): Promise<boolean> {
        const score = await this.redis.get(`priority-queue:${queueName}`);
        if (score) {
            return true;
        }
        return false;
    }

    async setDataExists(queueName: string="monitors", value: string="1", ttlSeconds: number=3600): Promise<void> {
        await this.redis.set(`priority-queue:${queueName}`, value, 'EX', ttlSeconds);
    }



    /**
     * @param limit @default 10
     * @param queueName @default "monitors"
     * @param maxScore  @default Date.now() 
     * @returns 
     */
    async getDueItems(limit: number = 10, queueName: string = "monitors", maxScore: number = Date.now()): Promise<string[]> {
        return this.redis.zrangebyscore(
            queueName,
            0,
            maxScore,
            'LIMIT',
            0,
            limit
        );
    }

    async removeItem(queueName: string, member: string): Promise<number> {
        return this.redis.zrem(queueName, member); 
    }

    async addItem(queueName: string, score: number, member: string): Promise<number | string> {
        return this.redis.zadd(queueName, score, member);
    }
}
