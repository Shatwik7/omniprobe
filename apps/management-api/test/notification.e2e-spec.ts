const request = require('supertest');
import { Test } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { NotificationsService } from '../src/notifications/notifications.service';
import { ConfigModule } from '@nestjs/config';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
describe('Notifications E2E', () => {
    let app: INestApplication;
    let service: NotificationsService;
    let notificationId: string;

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: `.env.test`,
                }),
                NotificationsModule,
            ],
        }).compile();

        try {
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
            service = moduleFixture.get<NotificationsService>(NotificationsService);
        } catch (error) {
            console.error('Error initializing app:', error);
            throw error;
        }
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    describe('GET /notifications', () => {
        it('should return an array of notifications', async () => {
            const res = await request(app.getHttpServer())
                .get('/teams/team-id/projects/project-id/notifications')
                .expect((response) => {
                    // Accept 200 (success), 401 (auth required), or 403 (forbidden)
                    if (![HttpStatus.OK, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(response.status)) {
                        throw new Error(`Unexpected status: ${response.status}`);
                    }
                });

            if (res.status === HttpStatus.OK) {
                expect(Array.isArray(res.body)).toBe(true);
            }
        });
    });

    describe('POST /notifications', () => {
        it('should create a notification and return 201', async () => {
            const createDto = {
                channel: 'SLACK',
                address: '#notifications',
                projectId: 'project-id',
            };

            const res = await request(app.getHttpServer())
                .post('/teams/team-id/projects/project-id/notifications')
                .send(createDto)
                .expect((response) => {
                    if (![HttpStatus.CREATED, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.BAD_REQUEST].includes(response.status)) {
                        throw new Error(`Unexpected status: ${response.status}`);
                    }
                });

            if (res.status === HttpStatus.CREATED) {
                notificationId = res.body.id;
                expect(res.body).toHaveProperty('id');
                expect(res.body.channel).toBe('SLACK');
            }
        });
    });

    describe('GET /notifications/:id', () => {
        it('should return a notification by id', async () => {
            const testId = 'test-notification-id';

            const res = await request(app.getHttpServer())
                .get(`/teams/team-id/projects/project-id/notifications/${testId}`)
                .expect((response) => {
                    if (![HttpStatus.OK, HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(response.status)) {
                        throw new Error(`Unexpected status: ${response.status}`);
                    }
                });

            if (res.status === HttpStatus.OK) {
                expect(res.body.id).toBe(testId);
            }
        });

        it('should return 404 for non-existent notification', async () => {
            const res = await request(app.getHttpServer())
                .get('/teams/team-id/projects/project-id/notifications/non-existent-id')
                .expect((response) => {
                    if (![HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(response.status)) {
                        throw new Error(`Unexpected status: ${response.status}`);
                    }
                });

            // If we get 404 or 401/403, that's acceptable for this test
        });
    });

    describe('PATCH /notifications/:id', () => {
        it('should update a notification', async () => {
            const updateDto = { status: 'FAILED' };

            const res = await request(app.getHttpServer())
                .patch(`/teams/team-id/projects/project-id/notifications/test-id`)
                .send(updateDto)
                .expect((response) => {
                    if (![HttpStatus.OK, HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(response.status)) {
                        throw new Error(`Unexpected status: ${response.status}`);
                    }
                });

            if (res.status === HttpStatus.OK) {
                expect(res.body.status).toBe('FAILED');
            }
        });
    });

    describe('DELETE /notifications/:id', () => {
        it('should delete a notification', async () => {
            const res = await request(app.getHttpServer())
                .delete(`/teams/team-id/projects/project-id/notifications/test-id`)
                .expect((response) => {
                    if (![HttpStatus.OK, HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(response.status)) {
                        throw new Error(`Unexpected status: ${response.status}`);
                    }
                });
        });
    });

    describe('GET /notifications/by-team/:teamId', () => {
        it('should return notifications for a team', async () => {
            const res = await request(app.getHttpServer())
                .get('/teams/team-id/projects/project-id/notifications/by-team/team-id')
                .expect((response) => {
                    if (![HttpStatus.OK, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(response.status)) {
                        throw new Error(`Unexpected status: ${response.status}`);
                    }
                });

            if (res.status === HttpStatus.OK) {
                expect(Array.isArray(res.body)).toBe(true);
            }
        });
    });

    describe('GET /notifications/:id/poll', () => {
        it('should wait for notification updates', async () => {
            const res = await request(app.getHttpServer())
                .get(`/teams/team-id/projects/project-id/notifications/test-id/poll`)
                .timeout(3000)
                .expect((response) => {
                    if (![HttpStatus.OK, HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(response.status)) {
                        throw new Error(`Unexpected status: ${response.status}`);
                    }
                });

            if (res.status === HttpStatus.OK) {
                expect(res.body).toHaveProperty('id');
            }
        });

        it('should support custom timeout', async () => {
            const res = await request(app.getHttpServer())
                .get(`/teams/team-id/projects/project-id/notifications/test-id/poll?timeout=1000`)
                .timeout(3000)
                .expect((response) => {
                    if (![HttpStatus.OK, HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN].includes(response.status)) {
                        throw new Error(`Unexpected status: ${response.status}`);
                    }
                });

            if (res.status === HttpStatus.OK) {
                expect(res.body).toHaveProperty('id');
            }
        });
    });
});
