import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class IncidentTriggeredEvent {

    @IsString()
    title!: string;

    @IsString()
    message!: string;

    @IsString()
    @IsEnum(['email', 'sms', 'slack'])
    channel!: string;

    @IsString()
    address!: string;

    @IsString()
    @IsUUID()
    @IsOptional()
    Alert?: undefined | null;

    @IsString()
    @IsUUID()
    Incident!: string;
}
