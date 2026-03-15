import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { DataSource, Repository } from 'typeorm';
import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  Monitor,
  Project,
  Team,
  User,
} from '@app/database';
import { ManagementApiModule } from '../src/management-api.module';
import * as dotenv from 'dotenv';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';

dotenv.config();

describe('Incidents (e2e, real app + real db)', () => {
  let app: INestApplication;
  let incidentsRepository: Repository<Incident>;
  let monitorsRepository: Repository<Monitor>;
  let projectsRepository: Repository<Project>;
  let teamsRepository: Repository<Team>;
  let usersRepository: Repository<User>;

  const createdIncidentIds: string[] = [];
  const createdMonitorIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdTeamIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildUserPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `e2e-incident-user-${nonce}`,
      email: `e2e-incident-user-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  const buildProjectPayload = () => ({
    name: `e2e-incident-project-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    description: 'Project for incident e2e',
  });

  const buildMonitorPayload = (projectId: string) => ({
    name: `e2e-incident-monitor-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    target: 'https://example.com/health',
    method: 'GET',
    frequencySeconds: 30,
    projectId,
  });

  const buildIncidentPayload = (monitorId: string) => ({
    status: IncidentStatus.OPEN,
    severity: IncidentSeverity.CRITICAL,
    summary: 'Incident from e2e test',
    monitorId,
    notifications: [],
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
        name: `e2e-incident-team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

  const createIncident = async (
    token: string,
    teamId: string,
    projectId: string,
    monitorId: string,
  ) => {
    const created = await request(app.getHttpServer())
      .post(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send(buildIncidentPayload(monitorId))
      .expect(201);

    trackId(createdIncidentIds, created.body.id);
    return created;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ManagementApiModule],
    })
      .overrideProvider('KAFKA_PRODUCER')
      .useValue({ emit: () => undefined })
      .compile();

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
    incidentsRepository = dataSource.getRepository(Incident);
    monitorsRepository = dataSource.getRepository(Monitor);
    projectsRepository = dataSource.getRepository(Project);
    teamsRepository = dataSource.getRepository(Team);
    usersRepository = dataSource.getRepository(User);
  }, 30000);

  afterAll(async () => {
    try {
      if (incidentsRepository && createdIncidentIds.length > 0) {
        await incidentsRepository.delete(createdIncidentIds);
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
    } finally {
      if (app) {
        await app.close();
      }
    }
  }, 30000);

  it('POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents should create incident', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    const created = await createIncident(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: IncidentStatus.OPEN,
        severity: IncidentSeverity.CRITICAL,
        summary: 'Incident from e2e test',
      }),
    );
  });

  it('GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents should return incidents list', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createIncident(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    const list = await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    const ids = list.body.map((incident: { id: string }) => incident.id);
    expect(ids).toContain(created.body.id);
  });

  it('GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id should return incident', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createIncident(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    const found = await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(found.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        summary: 'Incident from e2e test',
      }),
    );
  });

  it('PATCH /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id should return placeholder message', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createIncident(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    const updated = await request(app.getHttpServer())
      .patch(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ summary: 'Updated summary' })
      .expect(200);

    expect(updated.text).toBe('This action updates a #NaN incident');
  });

  it('POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/acknowledge should acknowledge incident', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createIncident(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    await request(app.getHttpServer())
      .post(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents/${created.body.id}/acknowledge`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    const found = await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(found.body.status).toBe(IncidentStatus.ACKNOWLEDGED);
    expect(found.body.acknowledgedBy).not.toBeNull();
    expect(found.body.acknowledgedBy).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
      }),
    );
  });

  it('POST /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id/resolve should resolve incident', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createIncident(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );

    await request(app.getHttpServer())
      .post(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents/${created.body.id}/resolve`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    const found = await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents/${created.body.id}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(found.body.status).toBe(IncidentStatus.RESOLVED);
  });

  it('DELETE /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents/:id should return true then false', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);
    const created = await createIncident(
      auth.token,
      teamId,
      projectId,
      monitorId,
    );
    const incidentId = created.body.id as string;
    const incidentIndex = createdIncidentIds.indexOf(incidentId);
    if (incidentIndex > -1) {
      createdIncidentIds.splice(incidentIndex, 1);
    }

    await request(app.getHttpServer())
      .delete(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents/${incidentId}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'true');

    await request(app.getHttpServer())
      .delete(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents/${incidentId}`,
      )
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'false');
  });

  it('GET /teams/:teamId/projects/:projectId/monitors/:monitorId/incidents should return 401 without token', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const projectId = await createProject(auth.token, teamId);
    const monitorId = await createMonitor(auth.token, teamId, projectId);

    await request(app.getHttpServer())
      .get(
        `/teams/${teamId}/projects/${projectId}/monitors/${monitorId}/incidents`,
      )
      .expect(401);
  });
});
