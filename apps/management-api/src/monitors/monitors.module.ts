import { Module } from '@nestjs/common';
import { MonitorsService } from './monitors.service';
import { MonitorsController } from './monitors.controller';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '../auth/auth.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    DatabaseModule,
    ClientsModule.register([
      {
        name: 'KAFKA_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          producerOnlyMode: true,
          client: {
            clientId: 'management-api-producer',
            brokers: [process.env.KAFKA_URL || 'localhost:9092'],
            retry: {
              retries: 10,
              initialRetryTime: 1000,
              factor: 2,
              maxRetryTime: 60000,
            },
          },
        },
      },
    ]),
    AuthModule,
  ],
  controllers: [MonitorsController],
  providers: [MonitorsService],
})
export class MonitorsModule {}
