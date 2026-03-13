import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { DataSource, Repository } from 'typeorm';
import { Project, Team, User } from '@app/database';
import { ManagementApiModule } from '../src/management-api.module';
import * as dotenv from 'dotenv';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';

dotenv.config();

describe('Projects (e2e, real app + real db)', () => {
  let app: INestApplication;
  let projectsRepository: Repository<Project>;
  let teamsRepository: Repository<Team>;
  let usersRepository: Repository<User>;

  const createdProjectIds: string[] = [];
  const createdTeamIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildUserPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `e2e-project-user-${nonce}`,
      email: `e2e-project-user-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  const buildTeamName = () =>
    `e2e-project-team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const buildProjectPayload = () => ({
    name: `e2e-project-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    description: 'Project description for e2e',
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
      userId: created.body.id as string,
      token: signin.body.access_token as string,
    };
  };

  const createTeam = async (token: string) => {
    const response = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: buildTeamName() })
      .expect(201);

    trackId(createdTeamIds, response.body.id);
    return response.body.id as string;
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
    projectsRepository = dataSource.getRepository(Project);
    teamsRepository = dataSource.getRepository(Team);
    usersRepository = dataSource.getRepository(User);
  }, 30000);

  afterAll(async () => {
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

  it('POST /teams/:teamId/projects should create project', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const payload = buildProjectPayload();

    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send(payload)
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: payload.name,
        description: payload.description,
      }),
    );

    trackId(createdProjectIds, created.body.id);
  });

  it('POST /teams/:teamId/projects should return 403 for team member who is not creator', async () => {
    const owner = await createAuthenticatedUser();
    const member = await createAuthenticatedUser();
    const teamId = await createTeam(owner.token);

    await request(app.getHttpServer())
      .put(`/teams/${teamId}/addUser`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ addUserId: member.userId })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${member.token}`)
      .send(buildProjectPayload())
      .expect(403);
  });

  it('GET /teams/:teamId/projects should return projects for team', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);
    const payload = buildProjectPayload();

    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send(payload)
      .expect(201);
    trackId(createdProjectIds, created.body.id);

    const list = await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    const ids = list.body.map((project: { id: string }) => project.id);
    expect(ids).toContain(created.body.id);
  });

  it('GET /teams/:teamId/projects/:id should return a project', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);

    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send(buildProjectPayload())
      .expect(201);
    trackId(createdProjectIds, created.body.id);

    const found = await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(found.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        name: created.body.name,
      }),
    );
  });

  it('PATCH /teams/:teamId/projects/:id should return current placeholder message', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);

    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send(buildProjectPayload())
      .expect(201);
    trackId(createdProjectIds, created.body.id);

    const updated = await request(app.getHttpServer())
      .patch(`/teams/${teamId}/projects/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ name: 'renamed' })
      .expect(200);

    expect(updated.text).toBe('This action updates a #NaN project');
  });

  it('DELETE /teams/:teamId/projects/:id should return true then false on repeated delete', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);

    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send(buildProjectPayload())
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/teams/${teamId}/projects/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'true');

    await request(app.getHttpServer())
      .delete(`/teams/${teamId}/projects/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'false');
  });

  it('DELETE /teams/:teamId/projects/:id should return 403 for team member who is not creator', async () => {
    const owner = await createAuthenticatedUser();
    const member = await createAuthenticatedUser();
    const teamId = await createTeam(owner.token);

    await request(app.getHttpServer())
      .put(`/teams/${teamId}/addUser`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ addUserId: member.userId })
      .expect(200);

    const created = await request(app.getHttpServer())
      .post(`/teams/${teamId}/projects`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send(buildProjectPayload())
      .expect(201);
    trackId(createdProjectIds, created.body.id);

    await request(app.getHttpServer())
      .delete(`/teams/${teamId}/projects/${created.body.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('GET /teams/:teamId/projects should return 401 without token', async () => {
    const auth = await createAuthenticatedUser();
    const teamId = await createTeam(auth.token);

    await request(app.getHttpServer())
      .get(`/teams/${teamId}/projects`)
      .expect(401);
  });
});
