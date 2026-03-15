import { Test, TestingModule } from '@nestjs/testing';
import { MonitorsService } from './monitors.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Monitor } from '@app/database';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Project, Team } from '@app/database';
import { Repository } from 'typeorm';

describe('MonitorsService', () => {
  let service: MonitorsService;
  let monitorRepository: Pick<
    Repository<Monitor>,
    'create' | 'save' | 'find' | 'findOne' | 'delete'
  >;

  const monitorRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitorsService,
        {
          provide: getRepositoryToken(Monitor),
          useValue: monitorRepositoryMock,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Team),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MonitorsService>(MonitorsService);
    monitorRepository = module.get(getRepositoryToken(Monitor));

    monitorRepositoryMock.create.mockReset();
    monitorRepositoryMock.save.mockReset();
    monitorRepositoryMock.find.mockReset();
    monitorRepositoryMock.findOne.mockReset();
    monitorRepositoryMock.delete.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should create and save monitor', async () => {
    const dto = {
      name: 'API Health',
      target: 'https://example.com/health',
      method: 'GET',
      frequencySeconds: 60,
      isLive: true,
      isActive: true,
      headers: { authorization: 'Bearer token' },
      body: '{"check":"health"}',
      maintencePeriods: [{ start: '2026-03-15T01:00:00Z', end: '2026-03-15T02:00:00Z' }],
      expectedStatus: 200,
      expectedBody: { ok: true },
      projectId: 'project-1',
      alertPolicyId: '11111111-1111-1111-1111-111111111111',
    };
    const created = { name: 'API Health' } as Monitor;
    const saved = { id: 'monitor-1', name: 'API Health' } as Monitor;

    monitorRepositoryMock.create.mockReturnValueOnce(created);
    monitorRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const response = await service.create(dto);

    expect(monitorRepository.create).toHaveBeenCalledWith({
      name: dto.name,
      target: dto.target,
      method: dto.method,
      frequencySeconds: dto.frequencySeconds,
      isLive: dto.isLive,
      isActive: dto.isActive,
      headers: dto.headers,
      body: dto.body,
      maintencePeriods: dto.maintencePeriods,
      expectedStatus: dto.expectedStatus,
      expectedBody: dto.expectedBody,
      project: { id: dto.projectId },
      alertPolicy: { id: dto.alertPolicyId },
    });
    expect(monitorRepository.save).toHaveBeenCalledWith(created);
    expect(response).toEqual(saved);
  });

  it('findAll should return selected monitor fields for project', async () => {
    const monitors = [{ id: 'monitor-1', name: 'API Health' }] as Monitor[];
    monitorRepositoryMock.find.mockReturnValueOnce(Promise.resolve(monitors));

    const response = await service.findAll('project-1');

    expect(monitorRepository.find).toHaveBeenCalledWith({
      where: { project: { id: 'project-1' } },
      select: {
        id: true,
        name: true,
        target: true,
        method: true,
        frequencySeconds: true,
        isLive: true,
        isActive: true,
        createdAt: true,
      },
      relations: ['project'],
    });
    expect(response).toEqual(monitors);
  });

  it('findOne should return monitor for project with relations', async () => {
    const monitor = { id: 'monitor-1', name: 'API Health' } as Monitor;
    monitorRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(monitor));

    const response = await service.findOne('project-1', 'monitor-1');

    expect(monitorRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: 'monitor-1',
        project: { id: 'project-1' },
      },
      select: {
        id: true,
        name: true,
        target: true,
        method: true,
        frequencySeconds: true,
        isLive: true,
        isActive: true,
        createdAt: true,
        project: { id: true, name: true },
        alertPolicy: {
          id: true,
          name: true,
          rules: true,
          notificationChannels: true,
        },
      },
      relations: ['project', 'alertPolicy'],
    });
    expect(response).toEqual(monitor);
  });

  it('update should return null when monitor is missing', async () => {
    monitorRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    const response = await service.update('project-1', 'monitor-1', {
      name: 'Updated',
    });

    expect(response).toBeNull();
    expect(monitorRepository.save).not.toHaveBeenCalled();
  });

  it('update should merge updates and save when monitor exists', async () => {
    const existing = {
      id: 'monitor-1',
      name: 'API Health',
      target: 'https://example.com/health',
      project: { id: 'project-1' },
    } as unknown as Monitor;
    const saved = { ...existing, name: 'API Health Updated' } as Monitor;

    monitorRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve(existing),
    );
    monitorRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const response = await service.update('project-1', 'monitor-1', {
      name: 'API Health Updated',
      isActive: false,
      headers: { authorization: 'Bearer updated' },
      body: '{"check":"updated"}',
      expectedStatus: 201,
    });

    expect(monitorRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'API Health Updated',
        isActive: false,
        headers: { authorization: 'Bearer updated' },
        body: '{"check":"updated"}',
        expectedStatus: 201,
      }),
    );
    expect(response).toEqual(saved);
  });

  it('remove should return true when row is deleted', async () => {
    monitorRepositoryMock.delete.mockReturnValueOnce(
      Promise.resolve({ affected: 1 }),
    );

    const response = await service.remove('project-1', 'monitor-1');

    expect(monitorRepository.delete).toHaveBeenCalledWith({
      id: 'monitor-1',
      project: { id: 'project-1' },
    });
    expect(response).toBe(true);
  });

  it('remove should return false when nothing is deleted', async () => {
    monitorRepositoryMock.delete.mockReturnValueOnce(
      Promise.resolve({ affected: 0 }),
    );

    const response = await service.remove('project-1', 'monitor-1');

    expect(response).toBe(false);
  });
});
