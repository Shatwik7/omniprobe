import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals';
import * as dotenv from 'dotenv';

import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '@app/database';

dotenv.config();

jest.setTimeout(30000);

describe('Auth Integration (module + service + strategies)', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let localStrategy: LocalStrategy;
  let jwtStrategy: JwtStrategy;
  let usersRepository: Repository<User>;

  const createdUserIds: string[] = [];

  const buildSignupPayload = () => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: `auth-int-${nonce}`,
      email: `auth-int-${nonce}@example.com`,
      password: 'secret123',
    };
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
    }).compile();

    authService = moduleRef.get(AuthService);
    localStrategy = moduleRef.get(LocalStrategy);
    jwtStrategy = moduleRef.get(JwtStrategy);
    usersRepository = moduleRef.get(getRepositoryToken(User));
  }, 30000);

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await usersRepository.delete(createdUserIds);
    }

    await moduleRef.close();
  });

  it('LocalStrategy.validate should return user for valid credentials', async () => {
    const payload = buildSignupPayload();
    const registered = await authService.register(payload);
    createdUserIds.push(registered.id as string);

    const validated = await localStrategy.validate(
      payload.email,
      payload.password,
    );

    expect(validated).toEqual(
      expect.objectContaining({
        id: registered.id,
        email: payload.email,
        name: payload.name,
      }),
    );
  });

  it('LocalStrategy.validate should throw for invalid credentials', async () => {
    const payload = buildSignupPayload();
    const registered = await authService.register(payload);
    createdUserIds.push(registered.id as string);

    await expect(
      localStrategy.validate(payload.email, 'invalid-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('JwtStrategy.validate should return decoded payload', async () => {
    const payload = buildSignupPayload();
    const registered = await authService.register(payload);
    createdUserIds.push(registered.id as string);

    const token = authService.createAccessToken(registered as User);
    const decoded = await authService.decode(token.access_token);
    const validated = await jwtStrategy.validate(decoded);

    expect(validated).toEqual(
      expect.objectContaining({
        id: registered.id,
        email: payload.email,
        name: payload.name,
      }),
    );
  });
});
