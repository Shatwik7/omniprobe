import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import * as dotenv from 'dotenv';

import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { User } from '@app/database';

dotenv.config();

describe('AuthService (unit-style, real dependencies)', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let usersRepository: Repository<User>;

  const createdUserIds: string[] = [];

  const buildSignupPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `auth-unit-${nonce}`,
      email: `auth-unit-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
    }).compile();

    authService = moduleRef.get(AuthService);
    usersRepository = moduleRef.get(getRepositoryToken(User));
  }, 30000);

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await usersRepository.delete(createdUserIds);
    }

    await moduleRef.close();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  it('register should create user and not expose password in response', async () => {
    const payload = buildSignupPayload();

    const registered = await authService.register(payload);

    expect(registered).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: payload.name,
        email: payload.email,
      }),
    );
    expect((registered as { password?: string }).password).toBeUndefined();

    createdUserIds.push(registered.id as string);

    const stored = await usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: registered.id })
      .getOne();

    expect(stored).toBeTruthy();
    expect(stored?.password).toBeDefined();
    expect(stored?.password).not.toBe(payload.password);
  });

  it('register should reject duplicate email', async () => {
    const payload = buildSignupPayload();
    const first = await authService.register(payload);
    createdUserIds.push(first.id as string);

    await expect(authService.register(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('validateEmailPassword should return user for valid credentials', async () => {
    const payload = buildSignupPayload();
    const registered = await authService.register(payload);
    createdUserIds.push(registered.id as string);

    const validated = await authService.validateEmailPassword({
      email: payload.email,
      password: payload.password,
    });

    expect(validated).toEqual(
      expect.objectContaining({
        id: registered.id,
        email: payload.email,
        name: payload.name,
      }),
    );
    expect((validated as { password?: string }).password).toBeUndefined();
  });

  it('validateEmailPassword should return null for wrong password and unknown email', async () => {
    const payload = buildSignupPayload();
    const registered = await authService.register(payload);
    createdUserIds.push(registered.id as string);

    const wrongPassword = await authService.validateEmailPassword({
      email: payload.email,
      password: 'wrong-password',
    });
    const unknownUser = await authService.validateEmailPassword({
      email: `missing-${Date.now()}@example.com`,
      password: 'secret123',
    });

    expect(wrongPassword).toBeNull();
    expect(unknownUser).toBeNull();
  });

  it('createAccessToken and decode should round-trip user payload', async () => {
    const payload = buildSignupPayload();
    const registered = await authService.register(payload);
    createdUserIds.push(registered.id as string);

    const token = authService.createAccessToken(registered as User);
    const decoded = await authService.decode(token.access_token);

    expect(token).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
      }),
    );
    expect(decoded).toEqual(
      expect.objectContaining({
        id: registered.id,
        email: payload.email,
        name: payload.name,
      }),
    );
  });
});
