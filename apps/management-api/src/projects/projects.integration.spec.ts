import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, Team } from '@app/database';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('Projects Integration (controller + service + repositories)', () => {
  let controller: ProjectsController;
  let projectsRepository: Pick<
    Repository<Project>,
    'create' | 'save' | 'find' | 'findOne' | 'delete'
  >;

  const projectsRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepositoryMock,
        },
        {
          provide: getRepositoryToken(Team),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get(ProjectsController);
    projectsRepository = module.get(getRepositoryToken(Project));

    projectsRepositoryMock.create.mockReset();
    projectsRepositoryMock.save.mockReset();
    projectsRepositoryMock.find.mockReset();
    projectsRepositoryMock.findOne.mockReset();
    projectsRepositoryMock.delete.mockReset();
  });

  it('create should flow through to repository.create/save', async () => {
    const created = { name: 'P1' } as Project;
    const saved = { id: 'project-1', name: 'P1' } as Project;
    projectsRepositoryMock.create.mockReturnValueOnce(created);
    projectsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const response = await controller.create(
      'team-1',
      { name: 'P1', description: 'Desc' },
      { user: { id: 'user-1' } },
    );

    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: 'P1',
      team: { id: 'team-1' },
      description: 'Desc',
    });
    expect(projectsRepository.save).toHaveBeenCalledWith(created);
    expect(response).toEqual(saved);
  });

  it('findAll should flow through to repository.find', async () => {
    projectsRepositoryMock.find.mockReturnValueOnce(
      Promise.resolve([{ id: 'project-1', name: 'P1' }]),
    );

    const response = await controller.findAll('team-1', { user: { id: 'user-1' } });

    expect(projectsRepository.find).toHaveBeenCalledWith({ where: { team: { id: 'team-1' } } });
    expect(response).toEqual([{ id: 'project-1', name: 'P1' }]);
  });

  it('findOne should flow through to repository.findOne', async () => {
    projectsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'project-1', name: 'P1' }),
    );

    const response = await controller.findOne('project-1');

    expect(projectsRepository.findOne).toHaveBeenCalled();
    expect(response).toEqual({ id: 'project-1', name: 'P1' });
  });

  it('remove should enforce owner and then delete', async () => {
    projectsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({
        id: 'project-1',
        team: { createdBy: { id: 'user-1' } },
      } as unknown as Project),
    );
    projectsRepositoryMock.delete.mockReturnValueOnce(Promise.resolve({ affected: 1 }));

    const response = await controller.remove('project-1', { user: { id: 'user-1' } });

    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      relations: ['team', 'team.createdBy'],
    });
    expect(projectsRepository.delete).toHaveBeenCalledWith('project-1');
    expect(response).toBe(true);
  });
});
