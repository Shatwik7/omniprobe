import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { DataSource, Repository } from 'typeorm';
import { Metric, Monitor, Project, Team, User } from '@app/database';
import { ManagementApiModule } from '../src/management-api.module';
import * as dotenv from 'dotenv';
import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals';

dotenv.config();

jest.setTimeout(60000);

describe('Metrics (e2e, real app + real db)', () => {
  let app: INestApplication;
  let metricsRepository: Repository<Metric>;
  let monitorsRepository: Repository<Monitor>;
  let projectsRepository: Repository<Project>;
  let teamsRepository: Repository<Team>;
  let usersRepository: Repository<User>;

  const createdMetricIds: string[] = [];
  const createdMonitorIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdTeamIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildUserPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `e2e-metric-user-${nonce}`,
      email: `e2e-metric-user-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  const buildProjectPayload = () => ({
    name: `e2e-metric-project-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    description: 'Project for metric e2e',
  });

  const buildMonitorPayload = (projectId: string) => ({
    name: `e2e-metric-monitor-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    target: 'https://example.com/health',
    method: 'GET',
    frequencySeconds: 30,
    projectId,
  });

  const buildMetricPayload = (monitorId: string) => ({
    durationMs: 120,
    statusCode: 200,
    dns_response_time_ms: 5,
    tcp_connection_time_ms: 10,
    tls_handshake_time_ms: 15,
    time_to_first_byte_ms: 30,
    server_processing_time_ms: 35,
    content_transfer_time_ms: 40,
    total_time_ms: 120,
    region: 'IN',
    isSuccess: true,
    monitorId,
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

    return { token: signin.body.access_token as string };
  };

  const createTeam = async (token: string) => {
    const created = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `e2e-metric-team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })
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

  const createMonitor = async (token: string, teamId: string, projectId: string) => {
    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/monitors`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildMonitorPayload(projectId))
      .expect(201);

    trackId(createdMonitorIds, created.body.id);
    return created.body.id as string;
  };

  const createMetric = async (token: string, teamId: string, projectId: string, monitorId: string) => {
    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/metrics`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildMetricPayload(monitorId))
      .expect(201);

    trackId(createdMetricIds, created.body.id);
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
    metricsRepository = dataSource.getRepository(Metric);
    monitorsRepository = dataSource.getRepository(Monitor);
    projectsRepository = dataSource.getRepository(Project);
    teamsRepository = dataSource.getRepository(Team);
    usersRepository = dataSource.getRepository(User);
  }, 30000);

  afterAll(async () => {
    if (metricsRepository && createdMetricIds.length > 0) {
      await metricsRepository.delete(createdMetricIds);
    }

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

  it('POST /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics should create metric', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    const created = await createMetric(auth.token, teamId, projectId, monitorId);

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        statusCode: 200,
      }),
    );
  });

  it('GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics should return metrics list', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createMetric(auth.token, teamId, projectId, monitorId);

    const beginDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const list = await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/metrics`)
      .query({ beginDate, endDate, region: 'IN' })
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    const ids = list.body.map((metric: { id: string }) => metric.id);
    expect(ids).toContain(created.body.id);
  });

  it('GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id should return metric', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createMetric(auth.token, teamId, projectId, monitorId);

    const found = await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/metrics/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(found.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        statusCode: 200,
      }),
    );
  });

  it('PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id should update metric', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createMetric(auth.token, teamId, projectId, monitorId);

    const updated = await request(app.getHttpServer())
      .patch(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/metrics/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ statusCode: 503 })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        statusCode: 503,
      }),
    );
  });

  it('DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics/:id should return true then false', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createMetric(auth.token, teamId, projectId, monitorId);

    await request(app.getHttpServer())
      .delete(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/metrics/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'true');

    await request(app.getHttpServer())
      .delete(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/metrics/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'false');
  });

  it('GET /teams/:teamId/projects/:projectId/monitors/:monitorId/metrics should return 401 without token', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    const beginDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/metrics`)
      .query({ beginDate, endDate, region: 'IN' })
      .expect(401);
  });
});
