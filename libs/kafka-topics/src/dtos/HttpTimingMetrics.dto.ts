import { IsEnum, IsNumber, IsPositive, IsString } from "class-validator";

export class HttpTimingMetrics {
    @IsPositive()
    @IsNumber()
    dns_lookup_end!: number;

    @IsPositive()
    @IsNumber()
    tcp_beginning_start!: number;

    @IsPositive()
    @IsNumber()
    tcp_end!: number;

    @IsPositive()
    @IsNumber()
    tls_start!: number;

    @IsPositive()
    @IsNumber()
    tls_end!: number;

    @IsPositive()
    @IsNumber()
    ttfb!: number;

    @IsPositive()
    @IsNumber()
    tdt!: number;

    @IsPositive()
    @IsNumber()
    server_processing_time!: number;

    @IsPositive()
    @IsNumber()
    status_code!: number;
}