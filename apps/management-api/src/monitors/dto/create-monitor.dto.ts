import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreateMonitorDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsUrl()
  target!: string;

  @ApiProperty()
  @IsString()
  @IsEnum(['GET', 'POST', 'PATCH', 'DELETE', 'PUT'])
  method!: string;

  @ApiProperty()
  @IsInt()
  frequencySeconds!: number;

  @ApiProperty()
  @IsString()
  @IsUUID()
  projectId!: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  alertPolicyId?: string;
}
