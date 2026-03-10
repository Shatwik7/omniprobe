import { PartialType } from '@nestjs/swagger';
import { CreateAlertPolicyDto } from './create-alert-policy.dto';

export class UpdateAlertPolicyDto extends PartialType(CreateAlertPolicyDto) {}
