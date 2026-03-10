import { Test, TestingModule } from '@nestjs/testing';
import { AlertPolicyService } from './alert-policy.service';
import { AlertPolicyRepository } from './alert-policy.repository';
import { DatabaseModule } from '@app/database';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { UpdateAlertPolicyDto } from './dto/update-alert-policy.dto';
import { AlertPolicyModule } from './alert-policy.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { jest, describe, it, expect, beforeAll, afterEach } from '@jest/globals';

describe('AlertPolicy Integration Test (service + repository)', () => {
  let service: AlertPolicyService;
  let repository: AlertPolicyRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal:true,
          envFilePath: '.env',
        }),
        DatabaseModule,
        AuthModule,
        AlertPolicyModule,
      ],
    }).compile();

    service = moduleFixture.get<AlertPolicyService>(AlertPolicyService);
    repository = moduleFixture.get<AlertPolicyRepository>(AlertPolicyRepository);
  });

  afterEach(async () => {
    await repository.alertPolicyRepo.query('DELETE FROM "alert_policies";');
  });

  it('should create an alert policy', async () => {
    const createDto: CreateAlertPolicyDto = { name: 'Test Policy' };
    const policy = await service.create(createDto,"someProjectId");
    expect(policy).toBeDefined();
    expect(policy.name).toEqual('Test Policy');

    const policies = await repository.findAllAlertPolicies();
    expect(policies).toHaveLength(1);
  });

  it('should find all alert policies', async () => {
    const createDto: CreateAlertPolicyDto = { name: 'Test Policy'};
    await service.create(createDto,"someProjectId");

    const policies = await service.findAll();
    expect(policies).toHaveLength(1);
    expect(policies[0].name).toEqual('Test Policy');
  });

  it('should find an alert policy by id', async () => {
    const createDto: CreateAlertPolicyDto = { name: 'Test Policy' };
    const policy = await service.create(createDto,"someProjectId");

    const foundPolicy = await service.findOne(policy.id);
    expect(foundPolicy).toBeDefined();
    if (foundPolicy) {
      expect(foundPolicy.name).toEqual('Test Policy');
    }
  });

  it('should update an alert policy', async () => {
    const createDto: CreateAlertPolicyDto = { name: 'Test Policy' };
    const policy = await service.create(createDto,"someProjectId");

    const updateDto: UpdateAlertPolicyDto = { name: 'Updated Policy' };
    const updatedPolicy = await service.update(policy.id, updateDto);

    expect(updatedPolicy).toBeDefined();
    if (updatedPolicy) {
      expect(updatedPolicy.name).toEqual('Updated Policy');
    }
  });

  it('should delete an alert policy', async () => {
    const createDto: CreateAlertPolicyDto = { name: 'Test Policy' };
    const policy = await service.create(createDto,"someProjectId");

    await service.remove(policy.id);
    const policies = await repository.findAllAlertPolicies();
    expect(policies).toHaveLength(0);
  });
});