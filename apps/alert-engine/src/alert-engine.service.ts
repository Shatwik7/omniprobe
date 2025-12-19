import { Injectable } from '@nestjs/common';

@Injectable()
export class AlertEngineService {
  getHello(): string {
    return 'Hello World!';
  }
}
