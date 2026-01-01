import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { LongPollingService, LongPollingOptions } from './long-polling.service';
import { LONG_POLLING_OPTIONS } from './long-polling.constant';

export interface LongPollingModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<LongPollingOptions> | LongPollingOptions;
}

@Global()
@Module({})
export class LongPollingModule {
  static forRootAsync(options: LongPollingModuleAsyncOptions): DynamicModule {
    const asyncProvider: Provider = {
      provide: LONG_POLLING_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: LongPollingModule,
      imports: options.imports || [],
      providers: [asyncProvider, LongPollingService],
      exports: [LongPollingService],
    };
  }
}