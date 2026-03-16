import { IsNumber, IsOptional, Min } from 'class-validator';

export class HttpTimingMetrics {
  @IsOptional()
  @Min(0)
  @IsNumber()
  dns_lookup_end?: number;

  @IsOptional()
  @Min(0)
  @IsNumber()
  tcp_beginning_start?: number;

  @IsOptional()
  @Min(0)
  @IsNumber()
  tcp_end?: number;

  @IsOptional()
  @Min(0)
  @IsNumber()
  tls_start?: number;

  @IsOptional()
  @Min(0)
  @IsNumber()
  tls_end?: number;

  // Only present on a fully completed response; absent on timeout / connection errors.
  @IsOptional()
  @Min(0)
  @IsNumber()
  ttfb?: number;

  @IsOptional()
  @Min(0)
  @IsNumber()
  tdt?: number;

  @IsOptional()
  @Min(0)
  @IsNumber()
  server_processing_time?: number;

  @IsOptional()
  @Min(0)
  @IsNumber()
  status_code?: number;
}
