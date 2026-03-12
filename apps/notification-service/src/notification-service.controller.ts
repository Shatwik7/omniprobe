import { Controller, Get } from '@nestjs/common';
import { NotificationServiceService } from './notification-service.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Topics } from '@app/kafka-topics/enums/topics';
import { AlertTriggeredEvent } from '@app/kafka-topics';
import { IncidentTriggeredEvent } from '@app/kafka-topics/dtos/IncidentTriggeredEvent.dto';

@Controller()
export class NotificationServiceController {
  constructor(
    private readonly notificationServiceService: NotificationServiceService,
  ) {}

  @EventPattern(Topics.ALERTS_TRIGGERED_NOTIFICATIONS)
  async handleAlertTriggered(@Payload() data: AlertTriggeredEvent) {
    return this.notificationServiceService.createAlertNotification(data);
  }

  @EventPattern(Topics.INCIDENTS_TRIGGERED_NOTIFICATIONS)
  async handleIncidentTriggered(@Payload() data:IncidentTriggeredEvent) {
    return this.notificationServiceService.createIncidentNotification(data);
  }
}
