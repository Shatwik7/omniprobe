import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class IncidentTriggeredEvent {

    @IsString()
    title!: string;

    @IsString()
    message!: string;

    @IsString()
    @IsEnum(['email', 'sms', 'slack', 'system'])
    channel!: string;

    @IsString()
    address!: string;

    @IsString()
    @IsUUID()
    Incident!: string;

    @IsString()
    @IsUUID()
    Project!:string
}
