import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project, Team } from '@app/database';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: Pick<
    Repository<Project>,
    'create' | 'save' | 'find' | 'findOne' | 'delete'
  >;
  let teamsRepository: Pick<Repository<Team>, 'findOne'>;

  const projectsRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const teamsRepositoryMock = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepositoryMock,
        },
        {
          provide: getRepositoryToken(Team),
          useValue: teamsRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectsRepository = module.get(getRepositoryToken(Project));
    teamsRepository = module.get(getRepositoryToken(Team));

    projectsRepositoryMock.create.mockReset();
    projectsRepositoryMock.save.mockReset();
    projectsRepositoryMock.find.mockReset();
    projectsRepositoryMock.findOne.mockReset();
    projectsRepositoryMock.delete.mockReset();
    teamsRepositoryMock.findOne.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should create and save a project for a team', async () => {
    const dto = { name: 'P1', description: 'Desc' };
    const created = { name: 'P1' } as Project;
    const saved = { id: 'project-1', name: 'P1' } as Project;

    teamsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'team-1', createdBy: { id: 'user-1' } }),
    );
    projectsRepositoryMock.create.mockReturnValueOnce(created);
    projectsRepositoryMock.save.mockReturnValueOnce(Promise.resolve(saved));

    const response = await service.create(dto, 'team-1', 'user-1');

    expect(teamsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      relations: ['createdBy'],
    });

    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: 'P1',
      team: { id: 'team-1' },
      description: 'Desc',
    });
    expect(projectsRepository.save).toHaveBeenCalledWith(created);
    expect(response).toEqual(saved);
  });

  it('create should throw NotFoundException when team is missing', async () => {
    teamsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    await expect(service.create({ name: 'P1', description: 'Desc' }, 'team-1', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('create should throw ForbiddenException when requester is not team creator', async () => {
    teamsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({ id: 'team-1', createdBy: { id: 'owner-1' } }),
    );

    await expect(service.create({ name: 'P1', description: 'Desc' }, 'team-1', 'user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('findAll should query projects by team id', async () => {
    const projects = [{ id: 'project-1', name: 'P1' }] as Project[];
    projectsRepositoryMock.find.mockReturnValueOnce(Promise.resolve(projects));

    const response = await service.findAll('team-1', 'user-1');

    expect(projectsRepository.find).toHaveBeenCalledWith({
      where: { team: { id: 'team-1' } },
    });
    expect(response).toEqual(projects);
  });

  it('findOne should query with relations and selective fields', async () => {
    const project = { id: 'project-1', name: 'P1' } as Project;
    projectsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve(project),
    );

    const response = await service.findOne('project-1');

    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        team: {
          id: true,
          members: {
            id: true,
          },
        },
        monitors: {
          id: true,
          name: true,
          target: true,
          method: true,
          frequencySeconds: true,
        },
      },
      relations: ['team', 'monitors'],
    });
    expect(response).toEqual(project);
  });

  it('update should return current placeholder message', () => {
    const response = service.update(10, { name: 'updated' });

    expect(response).toBe('This action updates a #10 project');
  });

  it('remove should return false when project is not found', async () => {
    projectsRepositoryMock.findOne.mockReturnValueOnce(Promise.resolve(null));

    const response = await service.remove('project-1', 'user-1');

    expect(response).toBe(false);
    expect(projectsRepository.delete).not.toHaveBeenCalled();
  });

  it('remove should throw when user is not owner', async () => {
    projectsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({
        id: 'project-1',
        team: { createdBy: { id: 'owner-1' } },
      } as unknown as Project),
    );

    await expect(service.remove('project-1', 'user-2')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('remove should delete and return true for owner', async () => {
    projectsRepositoryMock.findOne.mockReturnValueOnce(
      Promise.resolve({
        id: 'project-1',
        team: { createdBy: { id: 'user-1' } },
      } as unknown as Project),
    );
    projectsRepositoryMock.delete.mockReturnValueOnce(
      Promise.resolve({ affected: 1 }),
    );

    const response = await service.remove('project-1', 'user-1');

    expect(projectsRepository.delete).toHaveBeenCalledWith('project-1');
    expect(response).toBe(true);
  });
});
