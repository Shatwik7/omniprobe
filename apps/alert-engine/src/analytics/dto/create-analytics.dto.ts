import { IsString, IsUUID } from "class-validator";

export class CreateAnalyticsDto {
    @IsUUID()
    @IsString()
    MonitorId!: string;

    @IsUUID()
    @IsString()
    Region!: string;

    @IsUUID()
    @IsString()
    MetricId!:string;
}
