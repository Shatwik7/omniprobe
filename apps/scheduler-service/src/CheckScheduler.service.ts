import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaProducerService } from './KafkaProducer.service';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Monitor } from '@app/database';
import { CheckExecutionRequestedEvent } from '@app/kafka-topics';
import { HttpMethod } from '@app/kafka-topics';
import { PriorityQueue } from './PriorityQueue.service';
import { CacheService } from './Cache.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CheckSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CheckSchedulerService.name);
  private readonly shardSize = 100;

  constructor(
    private readonly kafka: KafkaProducerService,
    private readonly priorityQueue: PriorityQueue,
    private readonly cache: CacheService,
    @InjectRepository(Monitor)
    private readonly monitorRepository: Repository<Monitor>,
  ) {}

  async start() {
    while (true) {
      try {
        await this.processDueMonitors();
      } catch (error) {
        console.error('Error processing due monitors:', error);
        await this.sleep(1000);
      }
    }
  }

  async onModuleInit() {
    //check for cache exitenced
    const exists = await this.priorityQueue.checkDataExists();
    if (!exists) {
      this.logger.log('No existing priority queue data found. Initializing...');

      const lock = await this.cache.tryAcquireBootstrapLock(0);
      if (!lock) {
        this.logger.log(
          'Another instance is bootstrapping the priority queue. Waiting for it to complete...',
        );
        while (await this.priorityQueue.checkDataExists()) {
          await this.sleep(10000);
        }
        this.logger.log(
          'Priority queue initialization completed by another instance. Starting scheduler...',
        );
        return;
      } else {
        this.logger.log(
          'Acquired bootstrap lock. Initializing priority queue...',
        );
        const monitors = await this.monitorRepository.count();

        for (let offset = 0; offset < monitors; offset += this.shardSize) {
          const monitorBatch = await this.monitorRepository.find({
            where: { isActive: true },
            skip: offset,
            take: this.shardSize,
          });
          await Promise.all(
            monitorBatch.map(async (monitor) => {
              const nextRun = Date.now() + monitor.frequencySeconds * 1000;
              await this.priorityQueue.addItem('monitors', nextRun, monitor.id);
            }),
          );
        }
        this.logger.log(
          'Priority queue initialization completed. Starting scheduler...',
        );
        await this.cache.tryReleaseBootstrapLock(0);
      }
    } else {
      this.logger.log(
        'Existing priority queue data found. Starting scheduler...',
      );
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  private async processDueMonitors() {
    const dueMonitors = await this.priorityQueue.getDueItems(100);

    if (dueMonitors.length === 0) {
      await this.sleep(500);
    }

    for (const monitorId of dueMonitors) {
      // Atomic removal
      await this.priorityQueue.removeItem('monitors', monitorId);

      // Fetch monitor metadata
      const monitor = await this.getMonitor(monitorId);

      const data: CheckExecutionRequestedEvent = {
        id: crypto.randomUUID(),
        checkId: monitor.id,
        url: monitor.target,
        enqueuedAt: new Date().toISOString(),
        timeout: monitor.timeout  || 30000, // default to 30 seconds if not set
        method: HttpMethod(monitor.method),
        headers: monitor.headers,
        body: monitor.body,
      };

      const emitted = await this.kafka.emitCheckExecutionRequested(data);
      if (!emitted) {
        console.error(
          `Failed to emit check execution requested for monitor ${monitorId}`,
        );
      }

      const nextRun = Date.now() + monitor.frequencySeconds * 1000;

      await this.priorityQueue.addItem('monitors', nextRun, monitorId);
    }
    return;
  }

  private async getMonitor(monitorId: string) {
    const cachedMonitor = await this.cache.getMonitor(monitorId);
    if (cachedMonitor) {
      return cachedMonitor;
    }
    const monitor = await this.monitorRepository.findOne({
      where: { id: monitorId },
    });
    if (!monitor) {
      throw new Error(`Monitor with ID ${monitorId} not found in database`);
    }
    await this.cache.setMonitor(monitor);
    return monitor;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
