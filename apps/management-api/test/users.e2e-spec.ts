import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { DataSource, Repository } from 'typeorm';
import { User } from '@app/database';
import { ManagementApiModule } from '../src/management-api.module';
import * as dotenv from 'dotenv';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';

dotenv.config();

describe('Users (e2e, real app + real db)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;

  const createdUserIds: string[] = [];

  const buildUserPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `e2e-user-${nonce}`,
      email: `e2e-user-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  const trackUserId = (id: unknown) => {
    if (typeof id === 'string' && id.length > 0) {
      createdUserIds.push(id);
    }
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
    usersRepository = dataSource.getRepository(User);
  }, 30000);

  afterAll(async () => {
    if (usersRepository && createdUserIds.length > 0) {
      await usersRepository.delete(createdUserIds);
    }

    if (app) {
      await app.close();
    }
  });

  it('POST /signup should create a user', async () => {
    const payload = buildUserPayload();

    const response = await request(app.getHttpServer())
      .post('/signup')
      .send(payload)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: payload.name,
        email: payload.email,
      }),
    );
    expect(response.body.password).toBeUndefined();

    trackUserId(response.body.id);
  });

  it('POST /signup should reject duplicate email', async () => {
    const payload = buildUserPayload();

    const first = await request(app.getHttpServer())
      .post('/signup')
      .send(payload)
      .expect(201);
    trackUserId(first.body.id);

    const second = await request(app.getHttpServer())
      .post('/signup')
      .send(payload)
      .expect(401);

    expect(second.body.message).toBe('User already exists');
  });

  it('POST /signin should return an access token', async () => {
    const payload = buildUserPayload();

    const created = await request(app.getHttpServer())
      .post('/signup')
      .send(payload)
      .expect(201);
    trackUserId(created.body.id);

    const signin = await request(app.getHttpServer())
      .post('/signin')
      .send({ email: payload.email, password: payload.password })
      .expect(201);

    expect(signin.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
      }),
    );
  });

  it('GET /me should return current user for a valid bearer token', async () => {
    const payload = buildUserPayload();

    const created = await request(app.getHttpServer())
      .post('/signup')
      .send(payload)
      .expect(201);
    trackUserId(created.body.id);

    const signin = await request(app.getHttpServer())
      .post('/signin')
      .send({ email: payload.email, password: payload.password })
      .expect(201);

    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${signin.body.access_token}`)
      .expect(200);

    expect(me.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        email: payload.email,
        name: payload.name,
      }),
    );
  });

  it('GET /users/:id should return user by id', async () => {
    const payload = buildUserPayload();

    const created = await request(app.getHttpServer())
      .post('/signup')
      .send(payload)
      .expect(201);
    trackUserId(created.body.id);

    const found = await request(app.getHttpServer())
      .get(`/users/${created.body.id}`)
      .expect(200);

    expect(found.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        email: payload.email,
        name: payload.name,
      }),
    );
  });

  it('DELETE /users/:id should remove user and return false when deleting again', async () => {
    const payload = buildUserPayload();

    const created = await request(app.getHttpServer())
      .post('/signup')
      .send(payload)
      .expect(201);

    await request(app.getHttpServer()).delete(`/users/${created.body.id}`).expect(200, 'true');
    await request(app.getHttpServer()).delete(`/users/${created.body.id}`).expect(200, 'false');
  });

  it('PATCH /users/:id should return current update placeholder message', async () => {
    const payload = buildUserPayload();

    const created = await request(app.getHttpServer())
      .post('/signup')
      .send(payload)
      .expect(201);
    trackUserId(created.body.id);

    const updated = await request(app.getHttpServer())
      .patch(`/users/${created.body.id}`)
      .send({ name: 'renamed-user' })
      .expect(200);

    expect(updated.text).toBe('This action updates a #NaN user');
  });

  it('GET / should return 403 when take is greater than 100', async () => {
    await request(app.getHttpServer()).get('/?take=101&skip=0').expect(403);
  });
});
