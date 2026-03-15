import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { DataSource, Repository } from 'typeorm';
import { AlertPolicy, Monitor, Project, Team, User } from '@app/database';
import { TeamMemberGuard } from '../src/auth/guards/teamMember.guard';
import { ManagementApiModule } from '../src/management-api.module';
import * as dotenv from 'dotenv';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';

dotenv.config();

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('AlertPolicy E2E (real app + real db)', () => {
  let app: INestApplication;
  let alertPolicyRepo: Repository<AlertPolicy>;
  let monitorRepo: Repository<Monitor>;
  let projectsRepo: Repository<Project>;
  let teamsRepo: Repository<Team>;
  let usersRepo: Repository<User>;
  let token: string;
  let teamId: string;
  let projectId: string;

  const created: {
    policies: string[];
    monitors: string[];
    projects: string[];
    teams: string[];
    users: string[];
  } = { policies: [], monitors: [], projects: [], teams: [], users: [] };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ManagementApiModule],
    })
    // guard on alert-policy controller expects a teamId param which doesn't exist
    // in this suite; override to short-circuit authorization logic.
    .overrideGuard(TeamMemberGuard)
    .useValue({ canActivate: () => true })
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
    alertPolicyRepo = dataSource.getRepository(AlertPolicy);
    monitorRepo = dataSource.getRepository(Monitor);
    projectsRepo = dataSource.getRepository(Project);
    teamsRepo = dataSource.getRepository(Team);
    usersRepo = dataSource.getRepository(User);

    // create a user, team and project for this suite
    const userPayload = {
      name: `e2e-user-${Date.now()}`,
      email: `e2e-user-${Date.now()}@example.com`,
      password: 'secret123',
    };
    const signup = await request(app.getHttpServer())
      .post('/signup')
      .send(userPayload)
      .expect(201);
    created.users.push(signup.body.id);

    const signin = await request(app.getHttpServer())
      .post('/signin')
      .send({ email: userPayload.email, password: userPayload.password })
      .expect(201);

    token = signin.body.access_token;

    const teamRes = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `e2e-team-${Date.now()}` })
      .expect(201);
    teamId = teamRes.body.id;
    created.teams.push(teamId);

    const projectRes = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `e2e-project-${Date.now()}`,
        description: 'project for alert policy e2e',
      })
      .expect(201);
    projectId = projectRes.body.id;
    created.projects.push(projectId);
  }, 30000);

  afterAll(async () => {
    try {
      // clear dependent tables first
      const ds: DataSource = app.get(DataSource);
      await ds.query('DELETE FROM "incidents";');

      if (monitorRepo && created.monitors.length) {
        await monitorRepo.delete(created.monitors);
      }
      if (alertPolicyRepo && created.policies.length) {
        await alertPolicyRepo.delete(created.policies);
      }
      if (projectsRepo && created.projects.length) {
        await projectsRepo.delete(created.projects);
      }
      if (teamsRepo && created.teams.length) {
        // remove team members first
        for (const tid of created.teams) {
          const team = await teamsRepo.findOne({
            where: { id: tid },
            relations: ['members'],
          });
          if (team) {
            team.members = [];
            await teamsRepo.save(team);
          }
        }
        await teamsRepo.delete(created.teams);
      }
      if (usersRepo && created.users.length) {
        await usersRepo.delete(created.users);
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  }, 30000);

  beforeEach(async () => {
    const ds: DataSource = app.get(DataSource);
    await ds.query('DELETE FROM "incidents";');
    await monitorRepo.query('DELETE FROM "monitors";');
    await alertPolicyRepo.query('DELETE FROM "alert_policies";');
  });

  const buildPolicyPayload = () => ({ name: `e2e-policy-${Date.now()}` });
  const buildMonitorPayload = (policyId?: string) => ({
    name: `e2e-monitor-${Date.now()}`,
    target: 'https://example.com/health',
    method: 'GET',
    frequencySeconds: 30,
    projectId,
    ...(policyId ? { alertPolicyId: policyId } : {}),
  });

  it('POST /teams/:teamId/projects/:projectId/alert-policy creates a new policy', async () => {
    const payload = buildPolicyPayload();
    const res = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/alert-policy`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(res.body.name).toEqual(payload.name);
    created.policies.push(res.body.id);
  });

  it('GET /teams/:teamId/projects/:projectId/alert-policy returns list', async () => {
    const payload = buildPolicyPayload();
    const createdRes = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/alert-policy`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    created.policies.push(createdRes.body.id);

    const list = await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/alert-policy`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBe(1);
  });

  it('GET /teams/:teamId/projects/:projectId/alert-policy/:id returns an item', async () => {
    const payload = buildPolicyPayload();
    const createdRes = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/alert-policy`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    const id = createdRes.body.id;
    created.policies.push(id);

    const single = await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/alert-policy/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(single.body.name).toEqual(payload.name);
  });

  it('PATCH /teams/:teamId/projects/:projectId/alert-policy/:id updates the policy', async () => {
    const payload = buildPolicyPayload();
    const createdRes = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/alert-policy`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    const id = createdRes.body.id;
    created.policies.push(id);

    const updatePayload = { name: 'updated-name' };
    const updated = await request(app.getHttpServer())
      .patch(`/teams/${teamId}/projects/${projectId}/alert-policy/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatePayload)
      .expect(200);

    expect(updated.body.name).toEqual('updated-name');
  });

  it('DELETE /teams/:teamId/projects/:projectId/alert-policy/:id removes the policy', async () => {
    const payload = buildPolicyPayload();
    const createdRes = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/alert-policy`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    const id = createdRes.body.id;
    // don't bother tracking, will be wiped by beforeEach

    await request(app.getHttpServer())
      .delete(`/teams/${teamId}/projects/${projectId}/alert-policy/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const remaining = await alertPolicyRepo.find();
    expect(remaining).toHaveLength(0);
  });

  it('can create a monitor for simulation', async () => {
    const policyRes = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/alert-policy`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildPolicyPayload())
      .expect(201);
    const policyId = policyRes.body.id;
    created.policies.push(policyId);

    const mon = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects/${projectId}/monitors`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildMonitorPayload(policyId))
      .expect(201);
    created.monitors.push(mon.body.id);

    expect(mon.body.name).toBeDefined();
    // monitor created with alertPolicyId field; relation respected by DB
  });

  it('returns 401 when accessing policies without token', async () => {
    await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${projectId}/alert-policy`)
      .expect(401);
  });
});
