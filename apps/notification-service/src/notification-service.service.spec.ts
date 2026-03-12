import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationServiceService } from './notification-service.service';
import { EmailService } from './notification-providers/Email.service';
import { DatabaseModule, Notification, Project } from '@app/database';
import { AlertTriggeredEvent } from '@app/kafka-topics';
import { describe, beforeEach, it, expect, afterEach, jest } from '@jest/globals';
import { WebHookService } from './notification-providers/WebHook.service';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { LongPollingService } from '@app/common/long-polling/long-polling.service';

describe('NotificationServiceService', () => {
  let service: NotificationServiceService;
  let notificationRepository: Repository<Notification>;
  let emailService: EmailService;
  let webHookService: WebHookService;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEmailService = {
    send: jest.fn(),
  };

  const mockWebHookService = {
    send: jest.fn(),
  };

  const mockLongPollingService = {
    waitForNotification: jest.fn(async () => null),
    publishUpdate: jest.fn(async () => undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
      ],
      providers: [
        NotificationServiceService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: WebHookService,
          useValue: mockWebHookService,
        },
        {
          provide: LongPollingService,
          useValue: mockLongPollingService,
        },
      ],
    }).compile();

    service = module.get<NotificationServiceService>(NotificationServiceService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    emailService = module.get<EmailService>(EmailService);
    webHookService = module.get<WebHookService>(WebHookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification and send an email for the email channel', async () => {
      const data: AlertTriggeredEvent = {
        title: 'Test Alert',
        message: 'This is a test alert',
        channel: 'email',
        address: 'test@example.com',
        Alert: randomUUID(),
        Project: randomUUID(),
      };

      const notification = new Notification();
      mockNotificationRepository.create.mockReturnValue(notification);

      await service.createAlertNotification(data);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        title: data.title,
        message: data.message,
        status: 'PENDING',
        alert_id: data.Alert,
        channel: data.channel,
        address: data.address,
        project: { id: data.Project },
      });
      expect(mockLongPollingService.publishUpdate).toHaveBeenCalledWith(
        `notification:${data.Project}`,
        notification,
      );
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(notification);
      expect(mockEmailService.send).toHaveBeenCalledWith(
        data.address,
        data.title,
        data.message,
      );
      expect(notification.status).toEqual('SENT');
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(notification);
    });

    it('should create a notification with PENDING status for unsupported channels', async () => {
      const data: AlertTriggeredEvent = {
        title: 'Test Alert',
        message: 'This is a test alert',
        channel: 'unsupported',
        address: 'test@example.com',
        Alert: randomUUID(),
        Project: randomUUID(),
      };

      const notification = new Notification();
      mockNotificationRepository.create.mockImplementation((dto) => {
        return Object.assign(notification, dto);
      });

      await service.createAlertNotification(data);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        title: data.title,
        message: data.message,
        channel: data.channel,
        status: 'PENDING',
        alert_id: data.Alert,
        address: data.address,
        project: { id: data.Project },
      });
      expect(mockLongPollingService.publishUpdate).toHaveBeenCalledWith(
        `notification:${data.Project}`,
        notification,
      );
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(notification);
      expect(mockEmailService.send).not.toHaveBeenCalled();
      expect(notification.status).toEqual('PENDING');
    });

    it('should not create a notification if rate limit is exceeded', async () => {
      const data: AlertTriggeredEvent = {
        title: 'Test Alert',
        message: 'This is a test alert',
        channel: 'email',
        address: 'test@example.com',
        Alert: randomUUID(),
        Project: randomUUID(),
      };

      for (let i = 0; i < 11; i++) {
        await service.createAlertNotification(data);
      }

      mockNotificationRepository.create.mockClear();
      mockNotificationRepository.save.mockClear();
      mockEmailService.send.mockClear();
      mockLongPollingService.publishUpdate.mockClear();

      await service.createAlertNotification(data);

      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
      expect(mockEmailService.send).not.toHaveBeenCalled();
      expect(mockLongPollingService.publishUpdate).not.toHaveBeenCalled();
    });
  });
});