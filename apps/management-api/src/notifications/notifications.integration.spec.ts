import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '@app/database';
import { Repository } from 'typeorm';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { LongPollingService } from '@app/common';

describe('Notifications Integration Tests', () => {
    let service: NotificationsService;
    let mockRepository: jest.Mocked<Repository<Notification>>;
    let longPollingService: any;

    const mockNotification = {
        id: 'test-id-1',
        channel: 'SLACK',
        address: '#ops-channel',
        status: 'SENT',
        message: 'Test notification',
        title: 'Test',
        incident_id: 'incident-1',
        alert_id: null,
        sentAt: new Date(),
        project: { id: 'project-1' },
    } as any;

    beforeEach(async () => {
        mockRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            remove: jest.fn(),
        } as any;

        // Create mock long polling service
        const mockLongPollingService: any = {
            publishUpdate: (jest.fn() as any).mockResolvedValue(undefined),
            waitForUpdates: (jest.fn() as any).mockResolvedValue(null),
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: getRepositoryToken(Notification),
                    useValue: mockRepository,
                },
                {
                    provide: LongPollingService,
                    useValue: mockLongPollingService,
                },
            ],
        }).compile();

        service = moduleFixture.get<NotificationsService>(NotificationsService);
        longPollingService = mockLongPollingService;
    });

    describe('NotificationsService Integration', () => {
        describe('create', () => {
            it('should create and save notification', async () => {
                const createDto = {
                    channel: 'SLACK',
                    address: '#notifications',
                    status: 'PENDING',
                    message: 'Integration test notification',
                    projectId: 'test-project',
                };

                const savedNotification: any = {
                    id: 'saved-id',
                    ...createDto,
                    project: { id: 'test-project' },
                    sentAt: new Date(),
                };
                mockRepository.create.mockReturnValue(savedNotification);
                mockRepository.save.mockResolvedValue(savedNotification);

                const notification = await service.create(createDto);

                expect(notification).toBeDefined();
                expect(notification.channel).toBe('SLACK');
                expect(notification.address).toBe('#notifications');
                expect(mockRepository.save).toHaveBeenCalled();
            });

            it('should fail when required fields are missing', async () => {
                const invalidDto = {
                    address: '#notifications',
                    projectId: 'test-project',
                } as any;

                await expect(service.create(invalidDto)).rejects.toThrow(
                    BadRequestException,
                );
            });

            it('should publish to long polling when incident id is provided', async () => {
                const createDto = {
                    channel: 'EMAIL',
                    address: 'test@example.com',
                    incidentId: 'incident-123',
                    projectId: 'test-project',
                };

                const savedNotification: any = {
                    id: 'new-id',
                    channel: 'EMAIL',
                    address: 'test@example.com',
                    incidentId: 'incident-123',
                    projectId: 'test-project',
                    status: 'PENDING',
                    project: { id: 'test-project' },
                    sentAt: new Date(),
                };
                mockRepository.create.mockReturnValue(savedNotification);
                mockRepository.save.mockResolvedValue(savedNotification);

                await service.create(createDto);

                expect(longPollingService.publishUpdate).toHaveBeenCalledWith(
                    `notification:${createDto.incidentId}`,
                    expect.objectContaining({
                        channel: 'EMAIL',
                        address: 'test@example.com',
                        incidentId: 'incident-123',
                        projectId: 'test-project',
                    }),
                );
            });
        });

        describe('findAll', () => {
            it('should retrieve all notifications', async () => {
                const mockQueryBuilder = {
                    where: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    getMany: (jest.fn() as any).mockResolvedValue([mockNotification]),
                } as any;

                mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

                const notifications = await service.findAll();

                expect(Array.isArray(notifications)).toBe(true);
                expect(notifications.length).toBeGreaterThanOrEqual(1);
            });

            it('should order notifications by sentAt descending', async () => {
                const notification2 = { ...mockNotification, id: 'test-id-2', sentAt: new Date(Date.now() - 1000) };
                const mockQueryBuilder = {
                    where: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    getMany: (jest.fn() as any).mockResolvedValue([mockNotification, notification2]),
                } as any;

                mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

                const notifications = await service.findAll();

                expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
                    'notification.sentAt',
                    'DESC',
                );
                expect(notifications.length).toBe(2);
            });
        });

        describe('findOne', () => {
            it('should find a notification by id', async () => {
                mockRepository.findOne.mockResolvedValue(mockNotification);

                const found = await service.findOne(mockNotification.id);

                expect(found).toBeDefined();
                expect(found.id).toBe(mockNotification.id);
                expect(found.channel).toBe('SLACK');
            });

            it('should throw NotFoundException for non-existent id', async () => {
                mockRepository.findOne.mockResolvedValue(null);

                await expect(service.findOne('non-existent-id')).rejects.toThrow();
            });
        });

        describe('update', () => {
            it('should update a notification', async () => {
                const updateDto = {
                    status: 'SENT',
                    message: 'Updated message',
                };
                const updated = { ...mockNotification, ...updateDto };

                mockRepository.findOne.mockResolvedValue(mockNotification);
                mockRepository.save.mockResolvedValue(updated);

                const result = await service.update(mockNotification.id, updateDto);

                expect(result.status).toBe('SENT');
                expect(result.message).toBe('Updated message');
                expect(mockRepository.save).toHaveBeenCalled();
            });
        });

        describe('remove', () => {
            it('should remove a notification', async () => {
                mockRepository.findOne.mockResolvedValue(mockNotification);
                mockRepository.remove.mockResolvedValue(mockNotification);

                await service.remove(mockNotification.id);

                expect(mockRepository.remove).toHaveBeenCalled();
            });
        });

        describe('findByTeamId', () => {
            it('should handle team id queries', async () => {
                const mockQueryBuilder = {
                    leftJoinAndSelect: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    getMany: (jest.fn() as any).mockResolvedValue([mockNotification]),
                } as any;

                mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

                const result = await service.findByTeamId('team-id');

                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('waitForNotification', () => {
            it('should wait for notification via long polling service', async () => {
                const mockNotificationData: any = {
                    id: 'test-id',
                    channel: 'SLACK',
                };

                ((longPollingService.waitForUpdates as jest.Mock).mockResolvedValueOnce as any)(
                    mockNotificationData,
                );

                const result = await service.waitForNotification('incident-123');

                expect(longPollingService.waitForUpdates).toHaveBeenCalledWith(
                    'notification:incident-123',
                );
                expect(result).toEqual(mockNotificationData);
            });
        });
    });
});
