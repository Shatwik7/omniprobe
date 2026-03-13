import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ForecastDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  totalPrediction: number[];

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  confidenceUpper: number[];

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  confidenceLower: number[];
}

export class CreateAnalyticsDto {
  @ApiProperty()
  @IsUUID()
  monitorId: string;

  @ApiProperty()
  @IsString()
  region: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rollingAverage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rollingStdDev?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  variance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  p95?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  p99?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  anomalyDetected?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  degradingComponent?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  networkRatio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  backendRatio?: number;

  @ApiPropertyOptional({ type: ForecastDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ForecastDto)
  forecast?: ForecastDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  predictedSlaBreach?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  errorRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trend?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  recentMetrics?: any[];
}
