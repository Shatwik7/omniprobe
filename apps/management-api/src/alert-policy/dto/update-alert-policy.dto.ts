import { PartialType } from '@nestjs/mapped-types';
import { CreateAlertPolicyDto } from './create-alert-policy.dto';

export class UpdateAlertPolicyDto extends PartialType(CreateAlertPolicyDto) {}
