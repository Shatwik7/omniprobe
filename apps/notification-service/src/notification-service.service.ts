import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from '@app/database';
import { Repository } from 'typeorm';
import { AlertTriggeredEvent } from '@app/kafka-topics';
import { EmailService } from './notification-providers/Email.service';
import { WebHookService } from './notification-providers/WebHook.service';
import { IncidentTriggeredEvent } from '@app/kafka-topics/dtos/IncidentTriggeredEvent.dto';
import { LongPollingService } from '@app/common/long-polling/long-polling.service';
import { SlackService } from './notification-providers/Slack.service';

@Injectable()
export class NotificationServiceService {
  private readonly logger = new Logger(NotificationServiceService.name);
  private readonly rateLimitStore: { [key: string]: { count: number, startTime: number } } = {};

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly emailService: EmailService,
    private readonly webHookService: WebHookService,
    private readonly longPollingService: LongPollingService,
    private readonly slackService: SlackService,
  ) { }

  private isRateLimited(key: string): boolean {
    const limit = 10; // 10 requests
    const duration = 60 * 1000; // per 1 minute

    if (!this.rateLimitStore[key]) {
      this.rateLimitStore[key] = {
        count: 1,
        startTime: Date.now(),
      };
      return false;
    }

    const now = Date.now();
    const elapsedTime = now - this.rateLimitStore[key].startTime;

    if (elapsedTime > duration) {
      this.rateLimitStore[key] = {
        count: 1,
        startTime: now,
      };
      return false;
    }

    if (this.rateLimitStore[key].count < limit) {
      this.rateLimitStore[key].count++;
      return false;
    }

    return true;
  }

  async createAlertNotification(data: AlertTriggeredEvent) {
    if (this.isRateLimited(data.channel + ':' + data.address) || this.isRateLimited(data.channel)) {
      this.logger.warn(`Rate limit exceeded for address: ${data.channel + ':' + data.address}`);
      return;
    }

    const notification = this.notificationRepository.create({
      title: data.title,
      message: data.message,
      channel: data.channel,
      address: data.address,
      status: 'PENDING',
      alert_id: data.Alert,
      project: { id: data.Project },
    });
    this.longPollingService
      .publishUpdate(`notification:${data.Project}`, notification)
      .catch((err) => {
        this.logger.error(
          `Failed to publish notification update for project ${data.Project}: ${err.message}`,
        );
      });
    switch (data.channel) {
      case 'email':
        await this.emailService.send(data.address, data.title, data.message);
        notification.status = 'SENT';
        await this.notificationRepository.save(notification);
        break;
      case 'webhook':
        await this.webHookService.send(data.address, data.title, data.message);
        notification.status = 'SENT';
        await this.notificationRepository.save(notification);
        break;
      case 'slack':
        //await this.slackService.sendMessageToEmail(data.address, data.message);
        notification.status = 'SENT';
        await this.notificationRepository.save(notification);
        break;
      case 'sms':
        // Implement SMS sending logic here
        this.logger.log(`SMS notifications are not implemented yet.`);
        notification.status = 'PENDING';
        await this.notificationRepository.save(notification);
        break;
      default:
        this.logger.log(
          `Notification for channel ${data.channel} is not supported yet.`,
        );
        await this.notificationRepository.save(notification);
        break;
    }
    return notification;
  }


  async createIncidentNotification(data: IncidentTriggeredEvent) {
    if (this.isRateLimited(data.channel + ':' + data.address) || this.isRateLimited(data.channel)) {
      this.logger.warn(`Rate limit exceeded for address: ${data.channel + ':' + data.address}`);
      return;
    }

    const notification = this.notificationRepository.create({
      title: data.title,
      message: data.message,
      channel: data.channel,
      address: data.address,
      status: 'PENDING',
      incident_id: data.Incident,
      project: { id: data.Project },
    });
    this.longPollingService.publishUpdate(`notification:${data.Project}`, notification).catch(err => {
      this.logger.error(`Failed to publish notification update for project ${data.Project}: ${err.message}`);
    });
    switch (data.channel) {
      case 'email':
        await this.emailService.send(data.address, data.title, data.message);
        notification.status = 'SENT';
        await this.notificationRepository.save(notification);
        break;
      case 'webhook':
        await this.webHookService.send(data.address, data.title, data.message);
        notification.status = 'SENT';
        await this.notificationRepository.save(notification);
        break;
      case 'slack':
        //await this.slackService.sendMessageToEmail(data.address, data.message);
        notification.status = 'SENT';
        await this.notificationRepository.save(notification);
        break;
      case 'sms':
        // Implement SMS sending logic here
        this.logger.log(`SMS notifications are not implemented yet.`);
        notification.status = 'PENDING';
        await this.notificationRepository.save(notification);
        break;
      default:
        this.logger.log(
          `Notification for channel ${data.channel} is not supported yet.`,
        );
        await this.notificationRepository.save(notification);
        break;
    }
    return notification;
  }
}
