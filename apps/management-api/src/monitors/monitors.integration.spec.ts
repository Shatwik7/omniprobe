import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Monitor, Project, Team } from '@app/database';
import { MonitorsController } from './monitors.controller';
import { MonitorsService } from './monitors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

describe('Monitors Integration (controller + service + repository)', () => {
  let controller: MonitorsController;
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
      controllers: [MonitorsController],
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
        {
          provide: 'KAFKA_PRODUCER',
          useValue: { emit: jest.fn() },
        }
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MonitorsController);
    monitorRepository = module.get(getRepositoryToken(Monitor));

    monitorRepositoryMock.create.mockReset();
    monitorRepositoryMock.save.mockReset();
    monitorRepositoryMock.find.mockReset();
    monitorRepositoryMock.findOne.mockReset();
    monitorRepositoryMock.delete.mockReset();
  });

  it('create should flow to repository.create/save', async () => {
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

    const response = await controller.create(dto);

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

  it('findAll should flow to repository.find by project id', async () => {
    monitorRepositoryMock.find.mockReturnValueOnce(
      Promise.resolve([{ id: 'monitor-1', name: 'API Health' }]),
    );

    const response = await controller.findAll('project-1');

    expect(monitorRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { project: { id: 'project-1' } } }),
    );
    expect(response).toEqual([{ id: 'monitor-1', name: 'API Health' }]);
  });

  it('findOne should flow to repository.findOne with project scope', async () => {
    monitorRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'monitor-1', name: 'API Health' }),
    );

    const response = await controller.findOne('project-1', 'monitor-1');

    expect(monitorRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'monitor-1',
          project: { id: 'project-1' },
        },
      }),
    );
    expect(response).toEqual({ id: 'monitor-1', name: 'API Health' });
  });

  it('update and remove should flow through save/delete', async () => {
    monitorRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({
        id: 'monitor-1',
        name: 'Old Name',
        project: { id: 'project-1' },
      } as unknown as Monitor),
    );
    monitorRepositoryMock.save.mockReturnValueOnce(
      Promise.resolve({ id: 'monitor-1', name: 'New Name' } as Monitor),
    );
    monitorRepositoryMock.delete.mockReturnValueOnce(
      Promise.resolve({ affected: 1 }),
    );

    const updateResponse = await controller.update('project-1', 'monitor-1', {
      name: 'New Name',
      isActive: false,
      headers: { authorization: 'Bearer updated' },
      body: '{"check":"updated"}',
      expectedStatus: 201,
    });
    const removeResponse = await controller.remove('project-1', 'monitor-1');

    expect(monitorRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Name',
        isActive: false,
        headers: { authorization: 'Bearer updated' },
        body: '{"check":"updated"}',
        expectedStatus: 201,
      }),
    );
    expect(monitorRepository.delete).toHaveBeenCalledWith({
      id: 'monitor-1',
      project: { id: 'project-1' },
    });
    expect(updateResponse).toEqual({ id: 'monitor-1', name: 'New Name' });
    expect(removeResponse).toBe(true);
  });
});
