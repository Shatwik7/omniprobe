import { Module } from '@nestjs/common';
import { ManagementApiController } from './management-api.controller';
import { ManagementApiService } from './management-api.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ManagementApiController],
  providers: [ManagementApiService],
})
export class ManagementApiModule {}
