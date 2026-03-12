import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '@app/database';
import { LongPollingService } from '@app/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly longPollingService: LongPollingService,
  ) { }

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    if (!createNotificationDto.channel || !createNotificationDto.address) {
      throw new BadRequestException('Channel and address are required');
    }

    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      status: createNotificationDto.status || 'PENDING',
    });

    const saved = await this.notificationRepository.save(notification);

    // Publish update via long polling
    if (createNotificationDto.incidentId) {
      await this.longPollingService.publishUpdate(
        `notification:${createNotificationDto.incidentId}`,
        saved,
      );
    }

    return saved;
  }

  async findAll(projectId?: string): Promise<Notification[]> {
    const query = this.notificationRepository.createQueryBuilder('notification');

    if (projectId) {
      query.where('notification.project_id = :projectId', { projectId });
    }

    return query.orderBy('notification.sentAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async findByTeamId(teamId: string): Promise<Notification[]> {
    return this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.project', 'project')
      .leftJoinAndSelect('project.team', 'team')
      .where('team.id = :teamId', { teamId })
      .orderBy('notification.sentAt', 'DESC')
      .getMany();
  }

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.findOne(id);

    Object.assign(notification, updateNotificationDto);
    const updated = await this.notificationRepository.save(notification);

    return updated;
  }

  async remove(id: string): Promise<Notification> {
    const notification = await this.findOne(id);
    return this.notificationRepository.remove(notification);
  }

  async waitForNotification(projectId: string, timeout = 30000): Promise<Notification | null> {
    return this.longPollingService.waitForUpdates(`notification:${projectId}`);
  }
}
