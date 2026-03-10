import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export interface AlertPolicyDocument_v1 {
  version: '1.0';
  rules: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number | boolean;
    window?: string;
  }[];
  logic: 'AND' | 'OR';
  actions: string[];
  suppression?: {
    cooldown?: string;
    maintenance?: {
      start: string;
      end: string;
    }[];
  };
}

export interface NotificationChannel {
  channelType: 'slack' | 'email' | 'phone' | 'webhook' | 'sms' | 'push' | 'whatsapp';
  address: string;
}

export class CreateAlertPolicyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsOptional()
  rules?: AlertPolicyDocument_v1;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationChannelDto)
  notificationChannels?: NotificationChannel[];
}

export class NotificationChannelDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    channelType: 'slack' | 'email' | 'phone' | 'webhook' | 'sms' | 'push' | 'whatsapp';

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    address: string;
}
