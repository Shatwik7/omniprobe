import { Injectable } from '@nestjs/common';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { UpdateAlertPolicyDto } from './dto/update-alert-policy.dto';

@Injectable()
export class AlertPolicyService {
  create(createAlertPolicyDto: CreateAlertPolicyDto) {
    return 'This action adds a new alertPolicy';
  }

  findAll() {
    return `This action returns all alertPolicy`;
  }

  findOne(id: number) {
    return `This action returns a #${id} alertPolicy`;
  }

  update(id: number, updateAlertPolicyDto: UpdateAlertPolicyDto) {
    return `This action updates a #${id} alertPolicy`;
  }

  remove(id: number) {
    return `This action removes a #${id} alertPolicy`;
  }
}
