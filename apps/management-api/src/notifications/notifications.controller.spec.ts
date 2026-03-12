import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Notification } from '@app/database';
import { CanActivate } from '@nestjs/common';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockService: jest.Mocked<NotificationsService>;

  const mockNotification = {
    id: 'test-id-1',
    channel: 'SLACK',
    address: '#ops',
    status: 'SENT',
    message: 'Test',
    projectId: 'project-1',
  } as any;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByTeamId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      waitForNotification: jest.fn(),
    } as any;

    const mockGuard: CanActivate = {
      canActivate: jest.fn(() => true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(TeamMemberGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  describe('create', () => {
    it('should call service.create with correct parameters', async () => {
      const createDto = {
        channel: 'SLACK',
        address: '#ops',
        projectId: 'project-1',
      };

      mockService.create.mockResolvedValue(mockNotification);

      const result = await controller.create(createDto);

      expect(mockService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockNotification);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with projectId', async () => {
      mockService.findAll.mockResolvedValue([mockNotification]);

      const result = await controller.findAll('project-1');

      expect(mockService.findAll).toHaveBeenCalledWith('project-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      mockService.findOne.mockResolvedValue(mockNotification);

      const result = await controller.findOne('test-id-1');

      expect(mockService.findOne).toHaveBeenCalledWith('test-id-1');
      expect(result).toEqual(mockNotification);
    });
  });

  describe('findByTeamId', () => {
    it('should call service.findByTeamId', async () => {
      mockService.findByTeamId.mockResolvedValue([mockNotification]);

      const result = await controller.findByTeamId('team-1');

      expect(mockService.findByTeamId).toHaveBeenCalledWith('team-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('update', () => {
    it('should call service.update with id and updateDto', async () => {
      const updateDto = { status: 'FAILED' };
      const updated = { ...mockNotification, ...updateDto };

      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('test-id-1', updateDto);

      expect(mockService.update).toHaveBeenCalledWith('test-id-1', updateDto);
      expect(result.status).toBe('FAILED');
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      mockService.remove.mockResolvedValue(mockNotification);

      const result = await controller.remove('test-id-1');

      expect(mockService.remove).toHaveBeenCalledWith('test-id-1');
      expect(result).toEqual(mockNotification);
    });
  });

  describe('waitForNotification', () => {
    it('should call service.waitForNotification with incidentId', async () => {
      mockService.waitForNotification.mockResolvedValue(mockNotification);

      const result = await controller.waitForNotification('incident-1');

      expect(mockService.waitForNotification).toHaveBeenCalledWith(
        'incident-1',
        30000,
      );
      expect(result).toEqual(mockNotification);
    });

    it('should use custom timeout if provided', async () => {
      mockService.waitForNotification.mockResolvedValue(mockNotification);

      await controller.waitForNotification('incident-1', '5000');

      expect(mockService.waitForNotification).toHaveBeenCalledWith(
        'incident-1',
        5000,
      );
    });
  });
});
