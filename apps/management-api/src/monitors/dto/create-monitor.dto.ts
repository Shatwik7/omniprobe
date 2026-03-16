import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';

const HTTP_METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'] as const;

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
  @IsIn(HTTP_METHODS)
  method!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  frequencySeconds!: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isLive?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, type: Object, default: {} })
  @IsOptional()
  @IsObject()
  headers?: Record<string, any>;

  @ApiProperty({ required: false, default: '' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiProperty({ required: false, default: [] })
  @IsOptional()
  @Min(1)
  @IsInt({ each: true })
  timeout?: number = 30000; // in milliseconds


  @ApiProperty({ required: false, type: [Object], nullable: true })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  maintencePeriods?: Record<string, any>[] | null;

  @ApiProperty({ required: false, default: 200 })
  @IsOptional()
  @IsInt()
  expectedStatus?: number;

  @ApiProperty({ required: false, type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  expectedBody?: Record<string, any>;

  @ApiProperty()
  @IsString()
  @IsUUID()
  projectId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  @IsOptional()
  alertPolicyId?: string;
}
