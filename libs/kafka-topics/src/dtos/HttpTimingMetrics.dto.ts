import { IsEnum, IsNumber, IsString, Min } from 'class-validator';

export class HttpTimingMetrics {
  @Min(0)
  @IsNumber()
  dns_lookup_end!: number;

  @Min(0)
  @IsNumber()
  tcp_beginning_start!: number;

  @Min(0)
  @IsNumber()
  tcp_end!: number;

  @Min(0)
  @IsNumber()
  tls_start!: number;

  @Min(0)
  @IsNumber()
  tls_end!: number;

  @Min(0)
  @IsNumber()
  ttfb!: number;

  @Min(0)
  @IsNumber()
  tdt!: number;

  @Min(0)
  @IsNumber()
  server_processing_time!: number;

  @Min(0)
  @IsNumber()
  status_code!: number;
}
