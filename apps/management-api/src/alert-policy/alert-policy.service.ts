import { Injectable } from '@nestjs/common';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { UpdateAlertPolicyDto } from './dto/update-alert-policy.dto';
import { AlertPolicyRepository } from './alert-policy.repository';

@Injectable()
export class AlertPolicyService {
  constructor(
    private readonly alertPolicyRepository: AlertPolicyRepository,
  ) {}
  create(createAlertPolicyDto: CreateAlertPolicyDto, projectId: string) {
    return this.alertPolicyRepository.createAlertPolicy(createAlertPolicyDto, projectId);
  }

  findAll() {
    return this.alertPolicyRepository.findAllAlertPolicies();
  }

  findOne(id: string) {
    return this.alertPolicyRepository.findAlertPolicyById(id);
  }

  update(id: string, updateAlertPolicyDto: UpdateAlertPolicyDto) {
    return this.alertPolicyRepository.updateAlertPolicy(id, updateAlertPolicyDto);
  }

  remove(id: string) {
    return this.alertPolicyRepository.deleteAlertPolicy(id);
  }
}
