import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Analytics, Monitor, Project } from '@app/database';
import { Repository } from 'typeorm';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let analyticsRepository: Pick<
    Repository<Analytics>,
    'create' | 'save' | 'find' | 'findOne' | 'delete'
  >;
  let monitorRepository: Pick<Repository<Monitor>, 'findOne'>;

  const analyticsRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const monitorRepositoryMock = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Analytics),
          useValue: analyticsRepositoryMock,
        },
        {
          provide: getRepositoryToken(Monitor),
          useValue: monitorRepositoryMock,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    analyticsRepository = module.get(getRepositoryToken(Analytics));
    monitorRepository = module.get(getRepositoryToken(Monitor));

    analyticsRepositoryMock.create.mockReset();
    analyticsRepositoryMock.save.mockReset();
    analyticsRepositoryMock.find.mockReset();
    analyticsRepositoryMock.findOne.mockReset();
    analyticsRepositoryMock.delete.mockReset();
    monitorRepositoryMock.findOne.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkMonitorInProject', () => {
    it('should return false when monitor exists in project', async () => {
      monitorRepositoryMock.findOne.mockReturnValueOnce(
        Promise.resolve({ id: 'monitor-1' }),
      );

      const result = await service.checkMonitorInProject(
        'monitor-1',
        'project-1',
      );

      expect(monitorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'monitor-1', project: { id: 'project-1' } },
      });
      expect(result).toBe(false);
    });

    it('should return true when monitor does not exist in project', async () => {
      monitorRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

      const result = await service.checkMonitorInProject(
        'monitor-1',
        'project-1',
      );

      expect(result).toBe(true);
    });
  });

  describe('create', () => {
    it('should create and save analytics', async () => {
      const dto = {
        monitorId: 'monitor-1',
        region: 'EU',
        rollingAverage: 120.5,
        anomalyDetected: false,
        trend: 'stable',
      };
      const created = { region: 'EU' } as Analytics;
      const saved = { id: 'analytics-1', region: 'EU' } as Analytics;

      analyticsRepositoryMock.create.mockReturnValueOnce(created);
      analyticsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

      const result = await service.create(dto);

      expect(analyticsRepository.create).toHaveBeenCalledWith({
        region: 'EU',
        rollingAverage: 120.5,
        anomalyDetected: false,
        trend: 'stable',
        monitor: { id: 'monitor-1' },
      });
      expect(analyticsRepository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(saved);
    });
  });

  describe('findAllByMonitor', () => {
    it('should return all analytics for a monitor ordered by date', async () => {
      const list = [
        { id: 'analytics-1', region: 'EU' },
        { id: 'analytics-2', region: 'IN' },
      ] as Analytics[];
      analyticsRepositoryMock.find.mockReturnValueOnce(Promise.resolve(list));

      const result = await service.findAllByMonitor('monitor-1');

      expect(analyticsRepository.find).toHaveBeenCalledWith({
        where: { monitor: { id: 'monitor-1' } },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(list);
    });
  });

  describe('findOne', () => {
    it('should return analytics by id with monitor relation', async () => {
      const analytics = { id: 'analytics-1', region: 'EU' } as Analytics;
      analyticsRepositoryMock.findOne.mockReturnValueOnce(
        Promise.resolve(analytics),
      );

      const result = await service.findOne('analytics-1');

      expect(analyticsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'analytics-1' },
        relations: ['monitor'],
      });
      expect(result).toEqual(analytics);
    });

    it('should return null when analytics not found', async () => {
      analyticsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and save analytics', async () => {
      const existing = {
        id: 'analytics-1',
        region: 'EU',
        trend: 'stable',
      } as Analytics;
      const updated = { ...existing, trend: 'increasing' } as Analytics;

      analyticsRepositoryMock.findOne.mockReturnValueOnce(
        Promise.resolve(existing),
      );
      analyticsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(updated));

      const result = await service.update('analytics-1', { trend: 'increasing' });

      expect(analyticsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('should return null when analytics not found', async () => {
      analyticsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

      const result = await service.update('nonexistent-id', { trend: 'stable' });

      expect(result).toBeNull();
      expect(analyticsRepositoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete analytics and return true on success', async () => {
      analyticsRepositoryMock.delete.mockReturnValueOnce(
        Promise.resolve({ affected: 1 }),
      );

      const result = await service.remove('analytics-1');

      expect(analyticsRepository.delete).toHaveBeenCalledWith('analytics-1');
      expect(result).toBe(true);
    });

    it('should return false when analytics not found', async () => {
      analyticsRepositoryMock.delete.mockReturnValueOnce(
        Promise.resolve({ affected: 0 }),
      );

      const result = await service.remove('nonexistent-id');

      expect(result).toBe(false);
    });
  });
});
