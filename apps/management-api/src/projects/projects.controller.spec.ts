import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamMemberGuard } from '../auth/guards/teamMember.guard';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const projectsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: projectsServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get(ProjectsService);

    projectsServiceMock.create.mockReset();
    projectsServiceMock.findAll.mockReset();
    projectsServiceMock.findOne.mockReset();
    projectsServiceMock.update.mockReset();
    projectsServiceMock.remove.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to projectsService.create', async () => {
    const created = { id: 'project-1', name: 'P1' };
    projectsService.create.mockReturnValueOnce(Promise.resolve(created));

    const response = await controller.create(
      'team-1',
      { name: 'P1', description: 'Desc' },
      { user: { id: 'user-1' } },
    );

    expect(projectsService.create).toHaveBeenCalledWith(
      { name: 'P1', description: 'Desc' },
      'team-1',
      'user-1',
    );
    expect(response).toEqual(created);
  });

  it('findAll should delegate to projectsService.findAll', async () => {
    const projects = [{ id: 'project-1', name: 'P1' }];
    projectsService.findAll.mockReturnValueOnce(Promise.resolve(projects));

    const response = await controller.findAll('team-1', {
      user: { id: 'user-1' },
    });

    expect(projectsService.findAll).toHaveBeenCalledWith('team-1', 'user-1');
    expect(response).toEqual(projects);
  });

  it('findOne should throw NotFoundException when service returns null', async () => {
    projectsService.findOne.mockReturnValueOnce(Promise.resolve(null));

    await expect(controller.findOne('project-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findOne should return project when found', async () => {
    const project = { id: 'project-1', name: 'P1' };
    projectsService.findOne.mockReturnValueOnce(Promise.resolve(project));

    const response = await controller.findOne('project-1');

    expect(response).toEqual(project);
  });

  it('update should delegate to projectsService.update with numeric coercion', () => {
    projectsService.update.mockReturnValueOnce('updated');

    const response = controller.update('42', { name: 'Next' });

    expect(projectsService.update).toHaveBeenCalledWith(42, { name: 'Next' });
    expect(response).toBe('updated');
  });

  it('remove should delegate to projectsService.remove', async () => {
    projectsService.remove.mockReturnValueOnce(Promise.resolve(true));

    const response = await controller.remove('project-1', {
      user: { id: 'user-1' },
    });

    expect(projectsService.remove).toHaveBeenCalledWith('project-1', 'user-1');
    expect(response).toBe(true);
  });
});
