import { Controller, Get } from '@nestjs/common';
import { ManagementApiService } from './management-api.service';

@Controller()
export class ManagementApiController {
  constructor(private readonly managementApiService: ManagementApiService) {}

  @Get()
  getHello(): string {
    return this.managementApiService.getHello();
  }
}
