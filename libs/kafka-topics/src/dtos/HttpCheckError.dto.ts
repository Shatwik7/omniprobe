import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HttpErrorType } from '../enums/HttpError';
import { HttpTimingMetrics } from './HttpTimingMetrics.dto';

export class HttpCheckError {
  @IsEnum(HttpErrorType)
  error_type!: HttpErrorType;

  @IsOptional()
  @IsString()
  error_code?: string; // e.g., 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED'

  @IsString()
  error_message!: string;

  @IsNumber()
  timestamp!: number;

  @IsUrl({
    require_protocol: true,
    require_valid_protocol: true,
    protocols: ['http', 'https'],
  })
  url!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => HttpTimingMetrics)
  partial_timings?: Partial<HttpTimingMetrics>; // Capture any timings we got before failure
}
