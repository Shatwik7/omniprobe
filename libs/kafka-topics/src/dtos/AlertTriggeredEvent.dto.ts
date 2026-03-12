import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class AlertTriggeredEvent {

    @IsString()
    title!:string;

    @IsString()
    message!: string;

    @IsString()
    @IsEnum(['email', 'sms', 'slack'])
    channel!: string;

    @IsString()
    address!: string;

    @IsString()
    @IsUUID()
    Alert!: string;

    @IsString()
    @IsUUID()
    Project!: string;
}
