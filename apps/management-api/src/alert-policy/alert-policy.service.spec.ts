import { Test, TestingModule } from '@nestjs/testing';
import { AlertPolicyService } from './alert-policy.service';
import { AlertPolicyRepository } from './alert-policy.repository';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { UpdateAlertPolicyDto } from './dto/update-alert-policy.dto';

const mockAlertPolicyRepository = () => ({
  createAlertPolicy: jest.fn(),
  findAllAlertPolicies: jest.fn(),
  findAlertPolicyById: jest.fn(),
  updateAlertPolicy: jest.fn(),
  deleteAlertPolicy: jest.fn(),
});

describe('AlertPolicyService', () => {
  let service: AlertPolicyService;
  let repository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertPolicyService,
        {
          provide: AlertPolicyRepository,
          useFactory: mockAlertPolicyRepository,
        },
      ],
    }).compile();

    service = module.get<AlertPolicyService>(AlertPolicyService);
    repository = module.get<AlertPolicyRepository>(AlertPolicyRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an alert policy', async () => {
      const createAlertPolicyDto: CreateAlertPolicyDto = { name: 'Test Policy' };
      repository.createAlertPolicy.mockResolvedValue('somePolicy');
      expect(repository.createAlertPolicy).not.toHaveBeenCalled();
      const result = await service.create(createAlertPolicyDto);
      expect(repository.createAlertPolicy).toHaveBeenCalledWith(createAlertPolicyDto);
      expect(result).toEqual('somePolicy');
    });
  });

  describe('findAll', () => {
    it('should find all alert policies', async () => {
      repository.findAllAlertPolicies.mockResolvedValue(['somePolicies']);
      const result = await service.findAll();
      expect(repository.findAllAlertPolicies).toHaveBeenCalled();
      expect(result).toEqual(['somePolicies']);
    });
  });

  describe('findOne', () => {
    it('should find one alert policy', async () => {
      repository.findAlertPolicyById.mockResolvedValue('somePolicy');
      const result = await service.findOne('someId');
      expect(repository.findAlertPolicyById).toHaveBeenCalledWith('someId');
      expect(result).toEqual('somePolicy');
    });
  });

  describe('update', () => {
    it('should update an alert policy', async () => {
      const updateAlertPolicyDto: UpdateAlertPolicyDto = { name: 'Updated Policy' };
      repository.updateAlertPolicy.mockResolvedValue('updatedPolicy');
      const result = await service.update('someId', updateAlertPolicyDto);
      expect(repository.updateAlertPolicy).toHaveBeenCalledWith('someId', updateAlertPolicyDto);
      expect(result).toEqual('updatedPolicy');
    });
  });

  describe('remove', () => {
    it('should remove an alert policy', async () => {
      repository.deleteAlertPolicy.mockResolvedValue(undefined);
      await service.remove('someId');
      expect(repository.deleteAlertPolicy).toHaveBeenCalledWith('someId');
    });
  });
});
