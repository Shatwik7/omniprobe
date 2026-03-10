import { Test, TestingModule } from '@nestjs/testing';
import { AlertPolicyController } from './alert-policy.controller';
import { AlertPolicyService } from './alert-policy.service';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { UpdateAlertPolicyDto } from './dto/update-alert-policy.dto';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database/database.module';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
const mockAlertPolicyService = () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

describe('AlertPolicyController', () => {
  let controller: AlertPolicyController;
  let service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports:[
        ConfigModule.forRoot({
          isGlobal:true,
          envFilePath: '.env',
        }),
        AuthModule,
        DatabaseModule,
      ],
      controllers: [AlertPolicyController],
      providers: [
        {
          provide: AlertPolicyService,
          useFactory: mockAlertPolicyService,
        },
      ],
    }).compile();

    controller = module.get<AlertPolicyController>(AlertPolicyController);
    service = module.get<AlertPolicyService>(AlertPolicyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an alert policy', async () => {
      const createAlertPolicyDto: CreateAlertPolicyDto = { name: 'Test Policy' };
      service.create.mockResolvedValue('somePolicy');
      expect(service.create).not.toHaveBeenCalled();
      const result = await controller.create(createAlertPolicyDto);
      expect(service.create).toHaveBeenCalledWith(createAlertPolicyDto);
      expect(result).toEqual('somePolicy');
    });
  });

  describe('findAll', () => {
    it('should find all alert policies', async () => {
      service.findAll.mockResolvedValue(['somePolicies']);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(['somePolicies']);
    });
  });

  describe('findOne', () => {
    it('should find one alert policy', async () => {
      service.findOne.mockResolvedValue('somePolicy');
      const result = await controller.findOne('someId');
      expect(service.findOne).toHaveBeenCalledWith('someId');
      expect(result).toEqual('somePolicy');
    });
  });

  describe('update', () => {
    it('should update an alert policy', async () => {
      const updateAlertPolicyDto: UpdateAlertPolicyDto = { name: 'Updated Policy' };
      service.update.mockResolvedValue('updatedPolicy');
      const result = await controller.update('someId', updateAlertPolicyDto);
      expect(service.update).toHaveBeenCalledWith('someId', updateAlertPolicyDto);
      expect(result).toEqual('updatedPolicy');
    });
  });

  describe('remove', () => {
    it('should remove an alert policy', async () => {
      service.remove.mockResolvedValue(undefined);
      await controller.remove('someId');
      expect(service.remove).toHaveBeenCalledWith('someId');
    });
  });
});
