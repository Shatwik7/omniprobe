import { Injectable, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { LONG_POLLING_OPTIONS } from './long-polling.constant';

export interface LongPollingOptions {
  redisUrl: string;
}

@Injectable()
export class LongPollingService implements OnModuleDestroy {
  private readonly logger = new Logger(LongPollingService.name);

  private observers = new Map<string, ((data: any) => void)[]>();

  private pubClient: Redis;
  private subClient: Redis;

  constructor(@Inject(LONG_POLLING_OPTIONS) private options: LongPollingOptions) {
    this.pubClient = new Redis(options.redisUrl);
    this.subClient = new Redis(options.redisUrl);
    this.setupSubscriber();
  }

  private setupSubscriber() {
    this.subClient.on('message', (channel, message) => {
      // Channel: updates:monitor:{id}
      const parts = channel.split(':');
      const monitorId = parts[2];

      try {
        const data = JSON.parse(message);
        this.resolveLocalObservers(monitorId, data);
      } catch (err) {
        this.logger.error(`Error parsing Redis message: ${err.message}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.pubClient.quit();
    await this.subClient.quit();
  }

  /**
   * CONSUMER (Waiting Clients)
   */
  waitForUpdates(monitorId: string): Promise<any> {
    return new Promise((resolve) => {
      if (!this.observers.has(monitorId)) {
        this.observers.set(monitorId, []);
        this.subClient.subscribe(`updates:monitor:${monitorId}`)
          .catch(err => this.logger.error(`Subscribe failed: ${err.message}`));
      }

      const waiters = this.observers.get(monitorId)!;
      waiters.push(resolve);

      const timer = setTimeout(() => {
        this.removeObserver(monitorId, resolve);
        resolve(null);
      }, 30000);

      const originalResolve = resolve;

    });
  }

  /**
   * PRODUCER (Ingest Service)
   */
  async publishUpdate(monitorId: string, data: any) {
    const channel = `updates:monitor:${monitorId}`;
    await this.pubClient.publish(channel, JSON.stringify(data));
  }

  /**
   * THE FAN-OUT LOGIC
   * This is where the broadcast happens
   */
  private resolveLocalObservers(monitorId: string, data: any) {
    const waiters = this.observers.get(monitorId);

    if (!waiters || waiters.length === 0) return;

    this.logger.log(`Broadcasting update for Monitor ${monitorId} to ${waiters.length} clients.`);

    waiters.forEach((resolve) => resolve(data));

    this.cleanupMonitor(monitorId);
  }

  private removeObserver(monitorId: string, resolveFn: any) {
    const waiters = this.observers.get(monitorId);
    if (!waiters) return;

    const remaining = waiters.filter((fn) => fn !== resolveFn);

    if (remaining.length === 0) {
      this.cleanupMonitor(monitorId);
    } else {
      this.observers.set(monitorId, remaining);
    }
  }

  private cleanupMonitor(monitorId: string) {
    this.observers.delete(monitorId);
    this.subClient.unsubscribe(`updates:monitor:${monitorId}`)
      .catch(err => this.logger.error(`Unsubscribe failed: ${err.message}`));
  }
}