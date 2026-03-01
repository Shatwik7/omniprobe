import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { DataSource, Repository } from 'typeorm';
import { Team, User } from '@app/database';
import { ManagementApiModule } from '../src/management-api.module';
import * as dotenv from 'dotenv';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';

dotenv.config();

describe('Teams (e2e, real app + real db)', () => {
  let app: INestApplication;
  let teamsRepository: Repository<Team>;
  let usersRepository: Repository<User>;

  const createdTeamIds: string[] = [];
  const createdUserIds: string[] = [];

  const buildUserPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `e2e-team-user-${nonce}`,
      email: `e2e-team-user-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  const buildTeamName = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return `e2e-team-${nonce}`;
  };

  const trackId = (list: string[], id: unknown) => {
    if (typeof id === 'string' && id.length > 0) {
      list.push(id);
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

  const createTeam = async (token: string, name?: string) => {
    const teamName = name ?? buildTeamName();

    const response = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: teamName })
      .expect(201);

    trackId(createdTeamIds, response.body.id);
    return response;
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
    teamsRepository = dataSource.getRepository(Team);
    usersRepository = dataSource.getRepository(User);
  }, 30000);

  afterAll(async () => {
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

  it('POST /teams should create team for authenticated user', async () => {
    const auth = await createAuthenticatedUser();

    const created = await createTeam(auth.token);

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
      }),
    );
  });

  it('GET /teams should return teams list and count', async () => {
    const auth = await createAuthenticatedUser();
    const created = await createTeam(auth.token);

    const list = await request(app.getHttpServer())
      .get('/teams')
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(list.body).toEqual(
      expect.objectContaining({
        Teams: expect.any(Array),
        Count: expect.any(Number),
      }),
    );

    const ids = list.body.Teams.map((team: { id: string }) => team.id);
    expect(ids).toContain(created.body.id);
  });

  it('GET /teams/:id should return team by id', async () => {
    const auth = await createAuthenticatedUser();
    const created = await createTeam(auth.token);

    const found = await request(app.getHttpServer())
      .get(`/teams/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200);

    expect(found.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        name: created.body.name,
      }),
    );
  });

  it('PUT /teams/:id/addUser should update team data', async () => {
    const auth = await createAuthenticatedUser();
    const created = await createTeam(auth.token);

    const updatedName = `${created.body.name}-updated`;

    const updated = await request(app.getHttpServer())
      .put(`/teams/${created.body.id}/addUser`)
      .set('Authorization', `Bearer ${auth.token}`)
      .send({ name: updatedName })
      .expect(200);

    expect(updated.body).toEqual(
      expect.objectContaining({
        affected: 1,
      }),
    );
  });

  it('DELETE /teams/:id should return true then false on repeated delete', async () => {
    const auth = await createAuthenticatedUser();
    const created = await createTeam(auth.token);

    await request(app.getHttpServer())
      .delete(`/teams/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'true');

    await request(app.getHttpServer())
      .delete(`/teams/${created.body.id}`)
      .set('Authorization', `Bearer ${auth.token}`)
      .expect(200, 'false');
  });

  it('GET /teams should return 401 without bearer token', async () => {
    await request(app.getHttpServer()).get('/teams').expect(401);
  });
});
