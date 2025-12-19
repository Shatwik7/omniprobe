import { Injectable } from '@nestjs/common';

@Injectable()
export class ManagementApiService {
  getHello(): string {
    return 'Hello World!';
  }
}
