import { IncidentSeverity, IncidentStatus } from '@app/database';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty({
    type: 'string',
    description:
      'Status of the incident : enums["OPEN", "ACKNOWLEDGED", "RESOLVED]',
    enum: IncidentStatus,
  })
  @IsEnum(IncidentStatus, {
    message: 'Invalid status : ["OPEN", "ACKNOWLEDGED", "RESOLVED]',
  })
  status: IncidentStatus;

  @ApiProperty({
    type: 'string',
    description: 'Status of the incident : enums["CRITICAL", "WARNING]',
    enum: IncidentSeverity,
  })
  @IsEnum(IncidentSeverity, {
    message: 'Invalid severity : ["CRITICAL", "WARNING]',
  })
  severity: IncidentSeverity;

  @ApiProperty()
  @IsString({ message: 'Summary should be a string' })
  summary: string;

  @ApiProperty({ description: 'Incident ' })
  @IsDate()
  @IsOptional()
  resolvedAt: Date;

  @ApiProperty()
  @IsDate()
  @IsOptional()
  acknowledgedAt: Date;

  @ApiProperty()
  @IsDate()
  @IsOptional()
  startedAt: Date;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  acknowledgedBy: string;

  @ApiProperty()
  @IsUUID()
  monitorId: string;

  @ApiProperty()
  @IsString({ each: true })
  notifications: string[];
}
