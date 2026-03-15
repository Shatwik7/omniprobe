import { Module } from '@nestjs/common';
import { IngestServiceController } from './ingest-service.controller';
import { IngestServiceService } from './ingest-service.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import {
  DatabaseModule,
} from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    ClientsModule.register([
      {
        name: 'KAFKA_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'scheduler-producer',
            brokers: ['localhost:9092'],
            retry: {
              retries: 10,
            }
          },
        },
      },
    ]),
  ],
  controllers: [IngestServiceController],
  providers: [IngestServiceService],
})
export class IngestServiceModule { }
