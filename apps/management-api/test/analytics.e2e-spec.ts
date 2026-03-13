import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { DataSource, Repository } from 'typeorm';
import { Analytics, Monitor, Project, Team, User } from '@app/database';
import { ManagementApiModule } from '../src/management-api.module';
import * as dotenv from 'dotenv';
import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals';

dotenv.config();

jest.setTimeout(60000);

describe('Analytics (e2e, real app + real db)', () => {
  let app: INestApplication;
  let analyticsRepository: Repository<Analytics>;
  let monitorsRepository: Repository<Monitor>;
  let projectsRepository: Repository<Project>;
  let teamsRepository: Repository<Team>;
  let usersRepository: Repository<User>;

  const createdAnalyticsIds: string[] = [];
  const createdMonitorIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdTeamIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildUserPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `e2e-analytics-user-${nonce}`,
      email: `e2e-analytics-user-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  const buildProjectPayload = () => ({
    name: `e2e-analytics-project-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 5)}`,
    description: 'Project for analytics e2e',
  });

  const buildMonitorPayload = (projectId: string) => ({
    name: `e2e-analytics-monitor-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 5)}`,
    target: 'https://example.com/health',
    method: 'GET',
    frequencySeconds: 30,
    projectId,
  });

  const buildAnalyticsPayload = (monitorId: string) => ({
    monitorId,
    region: 'EU',
    rollingAverage: 120.5,
    rollingStdDev: 15.2,
    variance: 231.04,
    p95: 180.0,
    p99: 210.0,
    anomalyDetected: false,
    degradingComponent: null,
    networkRatio: 0.4,
    backendRatio: 0.6,
    forecast: {
      totalPrediction: [125, 130, 128],
      confidenceUpper: [140, 145, 143],
      confidenceLower: [110, 115, 113],
    },
    predictedSlaBreach: false,
    errorRate: 0.02,
    trend: 'stable',
    recentMetrics: [],
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
      .send({
        name: `e2e-analytics-team-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
      })
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
    return created.body.id as string;
  };

  const createAnalytics = async (
    token: string,
    teamId: string,
    projectId: string,
    monitorId: string,
  ) => {
    const created = await request(app.getHttpServer())
      .post(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send(buildAnalyticsPayload(monitorId))
      .expect(201);

    trackId(createdAnalyticsIds, created.body.id);
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
    analyticsRepository = dataSource.getRepository(Analytics);
    monitorsRepository = dataSource.getRepository(Monitor);
    projectsRepository = dataSource.getRepository(Project);
    teamsRepository = dataSource.getRepository(Team);
    usersRepository = dataSource.getRepository(User);
  }, 30000);

  afterAll(async () => {
    if (analyticsRepository && createdAnalyticsIds.length > 0) {
      await analyticsRepository.delete(createdAnalyticsIds);
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

  it('POST .../analytics should create analytics', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    const created = await createAnalytics(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        region: 'EU',
        anomalyDetected: false,
        trend: 'stable',
      }),
    );
  });

  it('POST .../analytics should return 406 with invalid monitorId (wrong project)', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    const otherProjectId = await createProject(auth.token, teamId);

    await request(app.getHttpServer())
      .post(
        `/teams/${teamId}/projects/${otherProjectId}/monitors/${monitorId}/analytics`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .send(buildAnalyticsPayload(monitorId))
      .expect(406);
  });

  it('POST .../analytics should return 400 when required fields are missing', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .post(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ region: 'EU' }) // missing monitorId
      .expect(400);
  });

  it('GET .../analytics should return list of analytics for monitor', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createAnalytics(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    const list = await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    const ids = list.body.map((a: { id: string }) => a.id);
    expect(ids).toContain(created.body.id);
  });

  it('GET .../analytics/availability should return monitor availability and downtime', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    const response = await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics/availability`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        availability: expect.any(Number),
        downtime: expect.any(Number),
      }),
    );
  });

  it('GET .../analytics/availability should return 400 when only one date is provided', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics/availability?startTime=2026-01-01T00:00:00.000Z`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(400);
  });

  it('GET .../analytics/:id should return analytics by id', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createAnalytics(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    const found = await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(found.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        region: 'EU',
      }),
    );
  });

  it('GET .../analytics/:id should return 404 for nonexistent id', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics/00000000-0000-0000-0000-000000000000`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(404);
  });

  it('PATCH .../analytics/:id should update analytics', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createAnalytics(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    const updated = await request(app.getHttpServer())
      .patch(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ trend: 'increasing', anomalyDetected: true })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        trend: 'increasing',
        anomalyDetected: true,
      }),
    );
  });

  it('PATCH .../analytics/:id should return 404 for nonexistent id', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .patch(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics/00000000-0000-0000-0000-000000000000`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ trend: 'stable' })
      .expect(404);
  });

  it('DELETE .../analytics/:id should delete analytics', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createAnalytics(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    // Remove from cleanup list since we're deleting it in the test
    const idx = createdAnalyticsIds.indexOf(created.body.id);
    if (idx !== -1) createdAnalyticsIds.splice(idx, 1);

    const deleted = await request(app.getHttpServer())
      .delete(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(deleted.body).toEqual({ deleted: true });
  });

  it('DELETE .../analytics/:id should return 404 for nonexistent id', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .delete(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/analytics/00000000-0000-0000-0000-000000000000`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(404);
  });

  it('GET .../analytics should return 401 without auth token', async () => {
    await request(app.getHttpServer())
      .get(
        `/teams/00000000-0000-0000-0000-000000000001/projects/00000000-0000-0000-0000-000000000002/monitors/00000000-0000-0000-0000-000000000003/analytics`,
      )
      .expect(401);
  });
});
