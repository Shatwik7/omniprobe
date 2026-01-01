import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '@app/database';

@Module({
  imports:[AuthModule,DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
