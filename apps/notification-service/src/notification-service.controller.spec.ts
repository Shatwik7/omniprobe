import { Test, TestingModule } from '@nestjs/testing';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { randomUUID } from 'crypto';
import { AlertTriggeredEvent } from '@app/kafka-topics';
import { Notification } from '@app/database';

describe('NotificationServiceController', () => {
  let notificationServiceController: NotificationServiceController;
  let notificationServiceService: NotificationServiceService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NotificationServiceController],
      providers: [
        {
          provide: NotificationServiceService,
          useValue: {
            create: jest.fn(),
            createAlertNotification: jest.fn(),
            createIncidentNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    notificationServiceController = app.get<NotificationServiceController>(
      NotificationServiceController,
    );
    notificationServiceService = app.get<NotificationServiceService>(
      NotificationServiceService,
    );
  });

  describe('handleAlertTriggered', () => {
    it('should process the alert triggered event and return the created notification', async () => {
      const data: AlertTriggeredEvent = {
        title: 'Alert',
        message: 'This is an alert message',
        channel: 'email',
        address: 'test@example.com',
        Alert: randomUUID(),
        Project: randomUUID(),
      };

      const notification = new Notification();
      Object.assign(notification, data);
      notification.id = randomUUID();
      notification.status = 'SENT';

      jest
        .spyOn(notificationServiceService, 'createAlertNotification')
        .mockResolvedValue(notification);

      const result = await notificationServiceController.handleAlertTriggered(data);
      expect(
        notificationServiceService.createAlertNotification,
      ).toHaveBeenCalledWith(data);
      expect(result).toEqual(notification);
    });

    it('should return undefined for invalid alert data', async () => {
      const data = new AlertTriggeredEvent();
      jest.spyOn(notificationServiceService, 'createAlertNotification').mockResolvedValue(undefined);
      const result = await notificationServiceController.handleAlertTriggered(data);
      expect(result).toBe(undefined);
    });
  });
});
