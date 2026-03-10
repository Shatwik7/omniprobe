import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertPolicy } from '@app/database';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { UpdateAlertPolicyDto } from './dto/update-alert-policy.dto';

@Injectable()
export class AlertPolicyRepository {
  constructor(
    @InjectRepository(AlertPolicy)
    public readonly alertPolicyRepo: Repository<AlertPolicy>,
  ) {}

  async createAlertPolicy(
    createAlertPolicyDto: CreateAlertPolicyDto,
  ): Promise<AlertPolicy> {
    const newAlertPolicy = this.alertPolicyRepo.create(createAlertPolicyDto);
    return this.alertPolicyRepo.save(newAlertPolicy);
  }

  async findAllAlertPolicies(): Promise<AlertPolicy[]> {
    return this.alertPolicyRepo.find();
  }

  async findAlertPolicyById(id: string): Promise<AlertPolicy | null> {
    return this.alertPolicyRepo.findOneBy({ id });
  }

  async updateAlertPolicy(
    id: string,
    updateAlertPolicyDto: UpdateAlertPolicyDto,
  ): Promise<AlertPolicy | null> {
    await this.alertPolicyRepo.update(id, updateAlertPolicyDto);
    return this.findAlertPolicyById(id);
  }

  async deleteAlertPolicy(id: string): Promise<void> {
    await this.alertPolicyRepo.delete(id);
  }
}
