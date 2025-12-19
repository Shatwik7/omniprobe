import { Controller, Get } from '@nestjs/common';
import { AlertEngineService } from './alert-engine.service';

@Controller()
export class AlertEngineController {
  constructor(private readonly alertEngineService: AlertEngineService) {}

  @Get()
  getHello(): string {
    return this.alertEngineService.getHello();
  }
}
