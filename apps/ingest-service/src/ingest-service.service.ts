import { Injectable } from '@nestjs/common';

@Injectable()
export class IngestServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
