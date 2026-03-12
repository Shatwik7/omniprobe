import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NotificationServiceModule } from '../src/notification-service.module';
import {
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  jest,
} from '@jest/globals';
import { NotificationServiceController } from '../src/notification-service.controller';
import { AlertTriggeredEvent } from '@app/kafka-topics';
import { v4 as uuidv4 } from 'uuid';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { Module } from '@nestjs/common';
import { NotificationServiceService } from '../src/notification-service.service';
import { IncidentTriggeredEvent } from '@app/kafka-topics/dtos/IncidentTriggeredEvent.dto';

@Module({})
class MockDatabaseModule {}

jest.mock('kafkajs', () => {
  const events = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
  };
  return {
    Kafka: class {
      producer() {
        return {
          connect: () => Promise.resolve(),
          disconnect: () => Promise.resolve(),
          send: () => Promise.resolve(),
          on: () => {},
          events,
        };
      }
      consumer() {
        return {
          connect: () => Promise.resolve(),
          disconnect: () => Promise.resolve(),
          subscribe: () => Promise.resolve(),
          run: () => Promise.resolve(),
          on: () => {},
          events,
        };
      }
    },
    logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 4, DEBUG: 5 },
  };
});

describe('NotificationServiceController (e2e)', () => {
  let app: INestApplication;
  let controller: NotificationServiceController;
  let service: NotificationServiceService;

  const mockNotificationService = {
    createAlertNotification: jest.fn(),
    createIncidentNotification: jest.fn(),
  };

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [
        NotificationServiceModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
    })
      .overrideModule(DatabaseModule)
      .useModule(MockDatabaseModule);

    moduleBuilder.overrideProvider(NotificationServiceService)
        .useValue(mockNotificationService);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    controller = moduleFixture.get<NotificationServiceController>(
      NotificationServiceController,
    );
    service = moduleFixture.get<NotificationServiceService>(NotificationServiceService);
  }, 20000);

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('handleAlertTriggered', () => {
    it('should process a valid alert event', async () => {
      const data: AlertTriggeredEvent = {
        Alert: uuidv4(),
        title: 'Test Alert',
        message: 'This is a test alert',
        channel: 'email',
        address: 'test@example.com',
      };

      await controller.handleAlertTriggered(data);

      expect(service.createAlertNotification).toHaveBeenCalledWith(data);
    });
  });

  describe('handleIncidentTriggered', () => {
    it('should process a valid incident event', async () => {
      const data: IncidentTriggeredEvent = {
        Incident: uuidv4(),
        title: 'Test Incident',
        message: 'This is a test incident',
        channel: 'webhook',
        address: 'http://webhook.site',
      };

      await controller.handleIncidentTriggered(data);

      expect(service.createIncidentNotification).toHaveBeenCalledWith(data);
    });
  });
});
