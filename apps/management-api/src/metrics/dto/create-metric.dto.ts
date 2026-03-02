import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsJSON, IsObject, IsString, IsUUID, ValidateNested } from "class-validator";

export class CreateMetricDto {
    @ApiProperty()
    @IsInt()
    durationMs: number;

    @ApiProperty()
    @IsInt()
    statusCode: number;

    @ApiProperty()
    @IsInt()
    dns_response_time_ms: number;

    @ApiProperty()
    @IsInt()
    tcp_connection_time_ms: number;

    @ApiProperty()
    @IsInt()
    tls_handshake_time_ms: number;

    @ApiProperty()
    @IsInt()
    time_to_first_byte_ms: number;

    @ApiProperty()
    @IsInt()
    server_processing_time_ms: number;

    @ApiProperty()
    @IsInt()
    content_transfer_time_ms: number;

    @ApiProperty()
    @IsInt()
    total_time_ms: number;


    @ApiProperty()
    @IsString()
    @IsEnum(['NA', 'EU', 'IN', 'AU'])
    region: string;

    @ApiProperty()
    @IsBoolean()
    isSuccess: boolean;

    @ApiProperty()
    @IsString()
    @IsUUID()
    monitorId: string;
}
