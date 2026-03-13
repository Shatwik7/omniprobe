import { Test, TestingModule } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { LongPollingService } from '@app/common';
import {
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';
import { AlertType } from '@app/database';

describe('AlertsController', () => {
  let controller: AlertsController;
  let alertsService: {
    checkMonitorInProject: jest.Mock;
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let pollingService: {
    publishUpdate: jest.Mock;
    waitForUpdates: jest.Mock;
  };

  const alertsServiceMock = {
    checkMonitorInProject: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
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
  const ALERT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        {
          provide: AlertsService,
          useValue: alertsServiceMock,
        },
        {
          provide: LongPollingService,
          useValue: pollingServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AlertsController>(AlertsController);
    alertsService = module.get(AlertsService);
    pollingService = module.get(LongPollingService);

    alertsServiceMock.checkMonitorInProject.mockReset();
    alertsServiceMock.create.mockReset();
    alertsServiceMock.findAll.mockReset();
    alertsServiceMock.findOne.mockReset();
    alertsServiceMock.update.mockReset();
    alertsServiceMock.remove.mockReset();
    pollingServiceMock.publishUpdate.mockReset();
    pollingServiceMock.waitForUpdates.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should create alert and publish update', async () => {
    const dto = {
      type: AlertType.ANOMALY,
      message: 'Latency anomaly',
      monitorId: MONITOR_ID,
      metadata: { z: 3.1 },
    };
    const created = { id: ALERT_ID, ...dto };

    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    alertsService.create.mockReturnValueOnce(Promise.resolve(created));
    pollingService.publishUpdate.mockReturnValueOnce(Promise.resolve(undefined));

    const result = await controller.create(MONITOR_ID, PROJECT_ID, dto as any);

    expect(alertsService.checkMonitorInProject).toHaveBeenCalledWith(
      MONITOR_ID,
      PROJECT_ID,
    );
    expect(alertsService.create).toHaveBeenCalledWith(dto);
    expect(pollingService.publishUpdate).toHaveBeenCalledWith(
      `alerts:${MONITOR_ID}`,
      created,
    );
    expect(result).toEqual(created);
  });

  it('create should throw NotAcceptableException on monitor mismatch', async () => {
    const dto = {
      type: AlertType.ANOMALY,
      message: 'Latency anomaly',
      monitorId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    };

    await expect(
      controller.create(MONITOR_ID, PROJECT_ID, dto as any),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('findAll should return alerts list', async () => {
    const list = [{ id: ALERT_ID }];
    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    alertsService.findAll.mockReturnValueOnce(Promise.resolve(list));

    const result = await controller.findAll(MONITOR_ID, PROJECT_ID);

    expect(alertsService.findAll).toHaveBeenCalledWith(MONITOR_ID);
    expect(result).toEqual(list);
  });

  it('poll should return long-poll update data', async () => {
    const update = { id: ALERT_ID, type: AlertType.ANOMALY };
    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    pollingService.waitForUpdates.mockReturnValueOnce(Promise.resolve(update));

    const result = await controller.poll(MONITOR_ID, PROJECT_ID);

    expect(pollingService.waitForUpdates).toHaveBeenCalledWith(
      `alerts:${MONITOR_ID}`,
    );
    expect(result).toEqual(update);
  });

  it('poll should throw NotFoundException on timeout', async () => {
    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    pollingService.waitForUpdates.mockReturnValueOnce(Promise.resolve(null));

    await expect(controller.poll(MONITOR_ID, PROJECT_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findOne should return alert by id', async () => {
    const alert = { id: ALERT_ID };
    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    alertsService.findOne.mockReturnValueOnce(Promise.resolve(alert));

    const result = await controller.findOne(ALERT_ID, MONITOR_ID, PROJECT_ID);

    expect(alertsService.findOne).toHaveBeenCalledWith(ALERT_ID);
    expect(result).toEqual(alert);
  });

  it('findOne should throw NotFoundException when missing', async () => {
    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    alertsService.findOne.mockReturnValueOnce(Promise.resolve(null));

    await expect(
      controller.findOne(ALERT_ID, MONITOR_ID, PROJECT_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('update should return updated alert and publish update', async () => {
    const updated = { id: ALERT_ID, message: 'Updated' };
    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    alertsService.update.mockReturnValueOnce(Promise.resolve(updated));
    pollingService.publishUpdate.mockReturnValueOnce(Promise.resolve(undefined));

    const result = await controller.update(
      ALERT_ID,
      MONITOR_ID,
      PROJECT_ID,
      { message: 'Updated' },
    );

    expect(alertsService.update).toHaveBeenCalledWith(ALERT_ID, {
      message: 'Updated',
    });
    expect(pollingService.publishUpdate).toHaveBeenCalledWith(
      `alerts:${MONITOR_ID}`,
      updated,
    );
    expect(result).toEqual(updated);
  });

  it('update should throw NotFoundException when missing', async () => {
    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    alertsService.update.mockReturnValueOnce(Promise.resolve(null));

    await expect(
      controller.update(ALERT_ID, MONITOR_ID, PROJECT_ID, {
        message: 'Updated',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('remove should delete and publish deleted event', async () => {
    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    alertsService.remove.mockReturnValueOnce(Promise.resolve(true));
    pollingService.publishUpdate.mockReturnValueOnce(Promise.resolve(undefined));

    const result = await controller.remove(ALERT_ID, MONITOR_ID, PROJECT_ID);

    expect(alertsService.remove).toHaveBeenCalledWith(ALERT_ID);
    expect(pollingService.publishUpdate).toHaveBeenCalledWith(
      `alerts:${MONITOR_ID}`,
      { id: ALERT_ID, deleted: true },
    );
    expect(result).toEqual({ deleted: true });
  });

  it('remove should throw NotFoundException when missing', async () => {
    alertsService.checkMonitorInProject.mockReturnValueOnce(
      Promise.resolve(false),
    );
    alertsService.remove.mockReturnValueOnce(Promise.resolve(false));

    await expect(
      controller.remove(ALERT_ID, MONITOR_ID, PROJECT_ID),
    ).rejects.toThrow(NotFoundException);
  });
});
