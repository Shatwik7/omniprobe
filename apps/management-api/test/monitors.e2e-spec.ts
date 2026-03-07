import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { DataSource, Repository } from 'typeorm';
import { Monitor, Project, Team, User } from '@app/database';
import { ManagementApiModule } from '../src/management-api.module';
import * as dotenv from 'dotenv';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';

dotenv.config();

describe('Monitors (e2e, real app + real db)', () => {
  let app: INestApplication;
  let monitorsRepository: Repository<Monitor>;
  let projectsRepository: Repository<Project>;
  let teamsRepository: Repository<Team>;
  let usersRepository: Repository<User>;

  const createdMonitorIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdTeamIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildUserPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `e2e-monitor-user-${nonce}`,
      email: `e2e-monitor-user-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  const buildTeamName = () =>
    `e2e-monitor-team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const buildProjectPayload = () => ({
    name: `e2e-monitor-project-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    description: 'Project for monitor e2e',
  });

  const buildMonitorPayload = (projectId: string) => ({
    name: `e2e-monitor-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    target: 'https://example.com/health',
    method: 'GET',
    frequencySeconds: 30,
    projectId,
  });

  const trackId = (bucket: string[], id: unknown) => {
    if (typeof id === 'string' && id.length > 0) {
      bucket.push(id);
    }
  };

  const createAuthenticatedUser = async () => {
    const payload = buildUserPayload();

    const created = await request(app.getHttpServer())
      .post('/signup')
      .send(payload)
      .expect(201);
    trackId(createdUserIds, created.body.id);

    const signin = await request(app.getHttpServer())
      .post('/signin')
      .send({ email: payload.email, password: payload.password })
      .expect(201);

    return {
      token: signin.body.access_token as string,
    };
  };

  const createTeam = async (token: string) => {
    const created = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: buildTeamName() })
      .expect(201);

    trackId(createdTeamIds, created.body.id);
    return created.body.id as string;
  };

  const createProject = async (token: string, teamId: string) => {
    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildProjectPayload())
      .expect(201);

    trackId(createdProjectIds, created.body.id);
    return created.body.id as string;
  };

  const createMonitor = async (
    token: string,
    teamId: string,
    projectId: string,
  ) => {
    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/monitors`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildMonitorPayload(projectId))
      .expect(201);

    trackId(createdMonitorIds, created.body.id);
    return created;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ManagementApiModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
        disableErrorMessages: false,
      }),
    );

    await app.init();

    const dataSource = app.get(DataSource);
    monitorsRepository = dataSource.getRepository(Monitor);
    projectsRepository = dataSource.getRepository(Project);
    teamsRepository = dataSource.getRepository(Team);
    usersRepository = dataSource.getRepository(User);
  }, 30000);

  afterAll(async () => {
    if (monitorsRepository && createdMonitorIds.length > 0) {
      await monitorsRepository.delete(createdMonitorIds);
    }

    if (projectsRepository && createdProjectIds.length > 0) {
      await projectsRepository.delete(createdProjectIds);
    }

    if (teamsRepository && createdTeamIds.length > 0) {
      for (const teamId of createdTeamIds) {
        const team = await teamsRepository.findOne({
          where: { id: teamId },
          relations: ['members'],
        });

        if (team) {
          team.members = [];
          await teamsRepository.save(team);
        }
      }

      await teamsRepository.delete(createdTeamIds);
    }

    if (usersRepository && createdUserIds.length > 0) {
      await usersRepository.delete(createdUserIds);
    }

    if (app) {
      await app.close();
    }
  });

  it('POST /teams/:teamId/projects/:projectId/monitors should create monitor', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);

    const created = await createMonitor(auth.token, teamId, projectId);

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        target: 'https://example.com/health',
      }),
    );
  });

  it('GET /teams/:teamId/projects/:projectId/monitors should return monitors list', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const created = await createMonitor(auth.token, teamId, projectId);

    const list = await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/monitors`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    const ids = list.body.map((monitor: { id: string }) => monitor.id);
    expect(ids).toContain(created.body.id);
  });

  it('GET /teams/:teamId/projects/:projectId/monitors/:id should return monitor', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const created = await createMonitor(auth.token, teamId, projectId);

    const found = await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/monitors/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(found.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        name: created.body.name,
      }),
    );
  });

  it('PATCH /teams/:teamId/projects/:projectId/monitors/:id should update monitor', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const created = await createMonitor(auth.token, teamId, projectId);

    const updatedName = `${created.body.name}-updated`;

    const updated = await request(app.getHttpServer())
      .patch(
        `/teams/${teamId}/projects/${projectId}/monitors/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ name: updatedName })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        name: updatedName,
      }),
    );
  });

  it('DELETE /teams/:teamId/projects/:projectId/monitors/:id should return true then false', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const created = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .delete(
        `/teams/${teamId}/projects/${projectId}/monitors/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'true');

    await request(app.getHttpServer())
      .delete(
        `/teams/${teamId}/projects/${projectId}/monitors/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'false');
  });

  it('GET /teams/:teamId/projects/:projectId/monitors should return 401 without token', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);

    await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/monitors`)
      .expect(401);
  });
});
