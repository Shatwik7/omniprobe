import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { LongPollingService } from '@app/common';
import {
  BadRequestException,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: {
    checkMonitorInProject: jest.Mock;
    create: jest.Mock;
    findAllByMonitor: jest.Mock;
    getMonitorAvailability: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let pollingService: {
    publishUpdate: jest.Mock;
    waitForUpdates: jest.Mock;
  };

  const analyticsServiceMock = {
    checkMonitorInProject: jest.fn(),
    create: jest.fn(),
    findAllByMonitor: jest.fn(),
    getMonitorAvailability: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const pollingServiceMock = {
    publishUpdate: jest.fn(),
    waitForUpdates: jest.fn(),
  };

  const MONITOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const PROJECT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const ANALYTICS_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: analyticsServiceMock },
        { provide: LongPollingService, useValue: pollingServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get(AnalyticsService);
    pollingService = module.get(LongPollingService);

    analyticsServiceMock.checkMonitorInProject.mockReset();
    analyticsServiceMock.create.mockReset();
    analyticsServiceMock.findAllByMonitor.mockReset();
    analyticsServiceMock.getMonitorAvailability.mockReset();
    analyticsServiceMock.findOne.mockReset();
    analyticsServiceMock.update.mockReset();
    analyticsServiceMock.remove.mockReset();
    pollingServiceMock.publishUpdate.mockReset();
    pollingServiceMock.waitForUpdates.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      monitorId: MONITOR_ID,
      region: 'EU',
      rollingAverage: 120,
      anomalyDetected: false,
      trend: 'stable',
    };

    it('should create analytics and publish update', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      const created = { id: ANALYTICS_ID, ...dto };
      analyticsService.create.mockReturnValueOnce(Promise.resolve(created));
      pollingService.publishUpdate.mockReturnValueOnce(
        Promise.resolve(undefined),
      );

      const result = await controller.create(MONITOR_ID, PROJECT_ID, dto as any);

      expect(analyticsService.checkMonitorInProject).toHaveBeenCalledWith(
        MONITOR_ID,
        PROJECT_ID,
      );
      expect(analyticsService.create).toHaveBeenCalledWith(dto);
      expect(pollingService.publishUpdate).toHaveBeenCalledWith(
        `analytics:${MONITOR_ID}`,
        created,
      );
      expect(result).toEqual(created);
    });

    it('should throw NotAcceptableException if monitor not in project', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(true),
      );

      await expect(
        controller.create(MONITOR_ID, PROJECT_ID, dto as any),
      ).rejects.toThrow(NotAcceptableException);
      expect(analyticsService.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return analytics list for monitor', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      const list = [{ id: ANALYTICS_ID, region: 'EU' }];
      analyticsService.findAllByMonitor.mockReturnValueOnce(
        Promise.resolve(list),
      );

      const result = await controller.findAll(MONITOR_ID, PROJECT_ID);

      expect(analyticsService.checkMonitorInProject).toHaveBeenCalledWith(
        MONITOR_ID,
        PROJECT_ID,
      );
      expect(analyticsService.findAllByMonitor).toHaveBeenCalledWith(MONITOR_ID, undefined);
      expect(result).toEqual(list);
    });

    it('should throw NotAcceptableException if monitor not in project', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(true),
      );

      await expect(
        controller.findAll(MONITOR_ID, PROJECT_ID),
      ).rejects.toThrow(NotAcceptableException);
    });
  });

  describe('poll', () => {
    it('should wait for updates and return data', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      const update = { id: ANALYTICS_ID, trend: 'increasing' };
      pollingService.waitForUpdates.mockReturnValueOnce(
        Promise.resolve(update),
      );

      const result = await controller.poll(MONITOR_ID, PROJECT_ID);

      expect(pollingService.waitForUpdates).toHaveBeenCalledWith(
        `analytics:${MONITOR_ID}`,
      );
      expect(result).toEqual(update);
    });

    it('should throw NotFoundException on timeout (null data)', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      pollingService.waitForUpdates.mockReturnValueOnce(Promise.resolve(null));

      await expect(
        controller.poll(MONITOR_ID, PROJECT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotAcceptableException if monitor not in project', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(true),
      );

      await expect(
        controller.poll(MONITOR_ID, PROJECT_ID),
      ).rejects.toThrow(NotAcceptableException);
    });
  });

  describe('findOne', () => {
    it('should return analytics by id', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      const analytics = { id: ANALYTICS_ID, region: 'EU' };
      analyticsService.findOne.mockReturnValueOnce(Promise.resolve(analytics));

      const result = await controller.findOne(
        ANALYTICS_ID,
        MONITOR_ID,
        PROJECT_ID,
      );

      expect(analyticsService.findOne).toHaveBeenCalledWith(ANALYTICS_ID);
      expect(result).toEqual(analytics);
    });

    it('should throw NotFoundException when analytics not found', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      analyticsService.findOne.mockReturnValueOnce(Promise.resolve(null));

      await expect(
        controller.findOne(ANALYTICS_ID, MONITOR_ID, PROJECT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotAcceptableException if monitor not in project', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(true),
      );

      await expect(
        controller.findOne(ANALYTICS_ID, MONITOR_ID, PROJECT_ID),
      ).rejects.toThrow(NotAcceptableException);
    });
  });

  describe('getMonitorAvailability', () => {
    it('should return availability and downtime without time range', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      analyticsService.getMonitorAvailability.mockReturnValueOnce(
        Promise.resolve({ availability: 99.5, downtime: 3000 }),
      );

      const result = await controller.getMonitorAvailability(
        MONITOR_ID,
        PROJECT_ID,
      );

      expect(analyticsService.getMonitorAvailability).toHaveBeenCalledWith(
        MONITOR_ID,
        undefined,
        undefined,
      );
      expect(result).toEqual({ availability: 99.5, downtime: 3000 });
    });

    it('should return availability and downtime with time range', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      analyticsService.getMonitorAvailability.mockReturnValueOnce(
        Promise.resolve({ availability: 98.2, downtime: 120000 }),
      );

      const result = await controller.getMonitorAvailability(
        MONITOR_ID,
        PROJECT_ID,
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
      );

      expect(analyticsService.getMonitorAvailability).toHaveBeenCalledWith(
        MONITOR_ID,
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
      );
      expect(result).toEqual({ availability: 98.2, downtime: 120000 });
    });

    it('should throw NotAcceptableException if monitor not in project', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(true),
      );

      await expect(
        controller.getMonitorAvailability(MONITOR_ID, PROJECT_ID),
      ).rejects.toThrow(NotAcceptableException);
    });

    it('should throw BadRequestException when only one date is provided', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );

      await expect(
        controller.getMonitorAvailability(
          MONITOR_ID,
          PROJECT_ID,
          '2026-01-01T00:00:00.000Z',
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when date format is invalid', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );

      await expect(
        controller.getMonitorAvailability(
          MONITOR_ID,
          PROJECT_ID,
          'invalid-date',
          '2026-01-01T01:00:00.000Z',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update analytics and publish update', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      const updated = { id: ANALYTICS_ID, trend: 'increasing' };
      analyticsService.update.mockReturnValueOnce(Promise.resolve(updated));
      pollingService.publishUpdate.mockReturnValueOnce(
        Promise.resolve(undefined),
      );

      const result = await controller.update(
        ANALYTICS_ID,
        MONITOR_ID,
        PROJECT_ID,
        { trend: 'increasing' },
      );

      expect(analyticsService.update).toHaveBeenCalledWith(ANALYTICS_ID, {
        trend: 'increasing',
      });
      expect(pollingService.publishUpdate).toHaveBeenCalledWith(
        `analytics:${MONITOR_ID}`,
        updated,
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when analytics not found', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      analyticsService.update.mockReturnValueOnce(Promise.resolve(null));

      await expect(
        controller.update(ANALYTICS_ID, MONITOR_ID, PROJECT_ID, {
          trend: 'stable',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotAcceptableException if monitor not in project', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(true),
      );

      await expect(
        controller.update(ANALYTICS_ID, MONITOR_ID, PROJECT_ID, {}),
      ).rejects.toThrow(NotAcceptableException);
    });
  });

  describe('remove', () => {
    it('should delete analytics and return deleted: true', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      analyticsService.remove.mockReturnValueOnce(Promise.resolve(true));

      const result = await controller.remove(
        ANALYTICS_ID,
        MONITOR_ID,
        PROJECT_ID,
      );

      expect(analyticsService.remove).toHaveBeenCalledWith(ANALYTICS_ID);
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when analytics not found', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(false),
      );
      analyticsService.remove.mockReturnValueOnce(Promise.resolve(false));

      await expect(
        controller.remove(ANALYTICS_ID, MONITOR_ID, PROJECT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotAcceptableException if monitor not in project', async () => {
      analyticsService.checkMonitorInProject.mockReturnValueOnce(
        Promise.resolve(true),
      );

      await expect(
        controller.remove(ANALYTICS_ID, MONITOR_ID, PROJECT_ID),
      ).rejects.toThrow(NotAcceptableException);
    });
  });
});
