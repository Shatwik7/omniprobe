import { Injectable } from '@nestjs/common';

@Injectable()
export class TelemetryIngestServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
