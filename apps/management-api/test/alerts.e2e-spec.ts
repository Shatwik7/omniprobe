import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { DataSource, Repository } from 'typeorm';
import { Alert, AlertType, Monitor, Project, Team, User } from '@app/database';
import { ManagementApiModule } from '../src/management-api.module';
import * as dotenv from 'dotenv';
import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals';

dotenv.config();

jest.setTimeout(90000);

describe('Alerts (e2e, real app + real db)', () => {
  let app: INestApplication;
  let alertsRepository: Repository<Alert>;
  let monitorsRepository: Repository<Monitor>;
  let projectsRepository: Repository<Project>;
  let teamsRepository: Repository<Team>;
  let usersRepository: Repository<User>;

  const createdAlertIds: string[] = [];
  const createdMonitorIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdTeamIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildUserPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `e2e-alert-user-${nonce}`,
      email: `e2e-alert-user-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  const buildProjectPayload = () => ({
    name: `e2e-alert-project-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    description: 'Project for alert e2e',
  });

  const buildMonitorPayload = (projectId: string) => ({
    name: `e2e-alert-monitor-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    target: 'https://example.com/health',
    method: 'GET',
    frequencySeconds: 30,
    projectId,
  });

  const buildAlertPayload = (monitorId: string) => ({
    type: AlertType.ANOMALY,
    message: 'Latency anomaly detected',
    metadata: { score: 3.14 },
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
      .send({
        name: `e2e-alert-team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

  const createAlert = async (
    token: string,
    teamId: string,
    projectId: string,
    monitorId: string,
  ) => {
    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildAlertPayload(monitorId))
      .expect(201);

    trackId(createdAlertIds, created.body.id);
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
    alertsRepository = dataSource.getRepository(Alert);
    monitorsRepository = dataSource.getRepository(Monitor);
    projectsRepository = dataSource.getRepository(Project);
    teamsRepository = dataSource.getRepository(Team);
    usersRepository = dataSource.getRepository(User);
  }, 30000);

  afterAll(async () => {
    if (alertsRepository && createdAlertIds.length > 0) {
      await alertsRepository.delete(createdAlertIds);
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

  it('POST .../alerts should create alert', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    const created = await createAlert(auth.token, teamId, projectId, monitorId);

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: AlertType.ANOMALY,
        message: 'Latency anomaly detected',
      }),
    );
  });

  it('POST .../alerts should return 406 for monitor/project mismatch', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const otherProjectId = await createProject(auth.token, teamId);

    await request(app.getHttpServer())
      .post(
        `/teams/${teamId}/projects/${otherProjectId}/monitors/${monitorId}/alerts`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .send(buildAlertPayload(monitorId))
      .expect(406);
  });

  it('POST .../alerts should return 400 for invalid payload', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ monitorId, message: 'missing type' })
      .expect(400);
  });

  it('GET .../alerts should return alerts list', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createAlert(auth.token, teamId, projectId, monitorId);

    const list = await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    const ids = list.body.map((alert: { id: string }) => alert.id);
    expect(ids).toContain(created.body.id);
  });

  it('GET .../alerts/:id should return alert by id', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createAlert(auth.token, teamId, projectId, monitorId);

    const found = await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(found.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        type: AlertType.ANOMALY,
      }),
    );
  });

  it('GET .../alerts/:id should return 404 for missing alert', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts/00000000-0000-0000-0000-000000000000`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(404);
  });

  it('PATCH .../alerts/:id should update alert', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createAlert(auth.token, teamId, projectId, monitorId);

    const updated = await request(app.getHttpServer())
      .patch(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ message: 'Updated alert message' })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        message: 'Updated alert message',
      }),
    );
  });

  it('PATCH .../alerts/:id should return 404 for missing alert', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .patch(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts/00000000-0000-0000-0000-000000000000`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ message: 'Updated alert message' })
      .expect(404);
  });

  it('GET .../alerts/poll should return 404 when no updates are published', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts/poll`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(404);
  });

  it('DELETE .../alerts/:id should delete alert', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createAlert(auth.token, teamId, projectId, monitorId);

    const idx = createdAlertIds.indexOf(created.body.id);
    if (idx !== -1) createdAlertIds.splice(idx, 1);

    const deleted = await request(app.getHttpServer())
      .delete(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(deleted.body).toEqual({ deleted: true });
  });

  it('DELETE .../alerts/:id should return 404 for missing alert', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .delete(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/alerts/00000000-0000-0000-0000-000000000000`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(404);
  });

  it('GET .../alerts should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .get(
        '/teams/00000000-0000-0000-0000-000000000001/projects/00000000-0000-0000-0000-000000000002/monitors/00000000-0000-0000-0000-000000000003/alerts',
      )
      .expect(401);
  });
});
