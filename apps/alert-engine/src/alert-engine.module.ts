import { Module } from '@nestjs/common';
import { AlertEngineController } from './alert-engine.controller';
import { AlertEngineService } from './alert-engine.service';

@Module({
  imports: [],
  controllers: [AlertEngineController],
  providers: [AlertEngineService],
})
export class AlertEngineModule {}
