import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '@app/database';
import { LongPollingService } from '@app/common';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockRepository: jest.Mocked<Repository<Notification>>;
  let mockLongPollingService: jest.Mocked<LongPollingService>;

  const mockNotification = {
    id: 'test-id-1',
    channel: 'SLACK',
    address: '#ops-channel',
    status: 'SENT',
    message: 'Test notification',
    title: 'Test',
    incident_id: 'incident-1',
    alert_id: null,
    sentAt: new Date(),
    project: { id: 'project-1' },
  } as any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
    } as any;

    mockLongPollingService = {
      publishUpdate: jest.fn(),
      waitForUpdates: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepository,
        },
        {
          provide: LongPollingService,
          useValue: mockLongPollingService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('create', () => {
    it('should create a new notification', async () => {
      const createDto = {
        channel: 'SLACK',
        address: '#ops-channel',
        message: 'Test notification',
        projectId: 'project-1',
      };

      mockRepository.create.mockReturnValue(mockNotification);
      mockRepository.save.mockResolvedValue(mockNotification);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(createDto),
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('should throw BadRequestException if channel is missing', async () => {
      const createDto = {
        address: '#ops-channel',
        projectId: 'project-1',
      } as any;

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should publish update via long polling', async () => {
      const createDto = {
        channel: 'SLACK',
        address: '#ops-channel',
        incidentId: 'incident-1',
        projectId: 'project-1',
      };

      mockRepository.create.mockReturnValue(mockNotification);
      mockRepository.save.mockResolvedValue(mockNotification);
      mockLongPollingService.publishUpdate.mockResolvedValue(undefined);

      await service.create(createDto);

      expect(mockLongPollingService.publishUpdate).toHaveBeenCalledWith(
        'notification:incident-1',
        mockNotification,
      );
    });
  });

  describe('findAll', () => {
    it('should return all notifications', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: (jest.fn() as any).mockResolvedValue([mockNotification]),
      } as any;

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'notification',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'notification.sentAt',
        'DESC',
      );
      expect(result).toEqual([mockNotification]);
    });

    it('should filter by projectId when provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: (jest.fn() as any).mockResolvedValue([mockNotification]),
      } as any;

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll('project-1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'notification.project_id = :projectId',
        { projectId: 'project-1' },
      );
    });
  });

  describe('findOne', () => {
    it('should return a notification by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.findOne('test-id-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id-1' },
        relations: ['project'],
      });
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByTeamId', () => {
    it('should return notifications for a team', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: (jest.fn() as any).mockResolvedValue([mockNotification]),
      } as any;

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findByTeamId('team-1');

      expect(result).toEqual([mockNotification]);
    });
  });

  describe('update', () => {
    it('should update a notification', async () => {
      const updateDto = { status: 'FAILED' };
      const updatedNotification = { ...mockNotification, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockNotification);
      mockRepository.save.mockResolvedValue(updatedNotification);

      const result = await service.update('test-id-1', updateDto);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
      expect(result.status).toBe('FAILED');
    });

    it('should throw NotFoundException when updating non-existent notification', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a notification', async () => {
      mockRepository.findOne.mockResolvedValue(mockNotification);
      mockRepository.remove.mockResolvedValue(mockNotification);

      const result = await service.remove('test-id-1');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockNotification);
      expect(result).toEqual(mockNotification);
    });
  });

  describe('waitForNotification', () => {
    it('should wait for notification updates via long polling', async () => {
      mockLongPollingService.waitForUpdates.mockResolvedValue(mockNotification);

      const result = await service.waitForNotification('incident-1');

      expect(mockLongPollingService.waitForUpdates).toHaveBeenCalledWith(
        'notification:incident-1',
      );
      expect(result).toEqual(mockNotification);
    });

    it('should use custom timeout', async () => {
      mockLongPollingService.waitForUpdates.mockResolvedValue(null);

      await service.waitForNotification('incident-1', 5000);

      expect(mockLongPollingService.waitForUpdates).toHaveBeenCalledWith(
        'notification:incident-1',
      );
    });
  });
});
