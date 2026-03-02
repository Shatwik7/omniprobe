import { Test, TestingModule } from '@nestjs/testing';
import { LongPollingModule, LongPollingModuleAsyncOptions } from './long-polling.module';
import { LongPollingService, LongPollingOptions } from './long-polling.service';
import { LONG_POLLING_OPTIONS } from './long-polling.constant';
import { Module } from '@nestjs/common';
import { describe, it, expect } from '@jest/globals';

describe('LongPollingModule', () => {
  it('should be defined', () => {
    expect(LongPollingModule).toBeDefined();
  });

  describe('forRootAsync', () => {
    it('should provide LongPollingService and options', async () => {
      const options: LongPollingOptions = {
        redisUrl: 'redis://localhost:6379',
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LongPollingModule.forRootAsync({
            useFactory: () => options,
          }),
        ],
      }).compile();

      const service = module.get<LongPollingService>(LongPollingService);
      const pollingOptions = module.get<LongPollingOptions>(LONG_POLLING_OPTIONS);

      expect(service).toBeInstanceOf(LongPollingService);
      expect(pollingOptions).toEqual(options);
    });

    it('should import modules', async () => {
        @Module({
            exports: [String],
            providers: [{
                provide: String,
                useValue: 'test'
            }]
        })
        class TestModule {}

        const options: LongPollingModuleAsyncOptions = {
            imports: [TestModule],
            useFactory: (test: string) => ({
                redisUrl: 'redis://localhost:6379',
            }),
            inject: [String],
        };

        const module: TestingModule = await Test.createTestingModule({
            imports: [LongPollingModule.forRootAsync(options)],
        }).compile();

        const service = module.get<LongPollingService>(LongPollingService);
        expect(service).toBeInstanceOf(LongPollingService);
    });
  });
});
