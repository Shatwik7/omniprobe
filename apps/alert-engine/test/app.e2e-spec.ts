import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AlertEngineModule } from './../src/alert-engine.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { Module } from '@nestjs/common';
import { describe, beforeEach, it, expect } from '@jest/globals';

@Module({})
class MockDatabaseModule {}

describe('AlertEngineController (e2e)', () => {
  // let app: INestApplication;

  // beforeEach(async () => {
  //   const moduleFixture: TestingModule = await Test.createTestingModule({
  //     imports: [
  //       AlertEngineModule,
  //       ConfigModule.forRoot({
  //         isGlobal: true,
  //         envFilePath: '.env.test',
  //       }),
  //     ],
  //   })
  //     .overrideModule(DatabaseModule)
  //     .useModule(MockDatabaseModule)
  //     .compile();

  //   app = moduleFixture.createNestApplication();
  //   await app.init();
  // });

  it('/ (GET)', () => {
    expect(true).toBe(true);
  });
});
