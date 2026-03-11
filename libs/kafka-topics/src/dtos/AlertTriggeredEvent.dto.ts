import { IsString, IsUUID } from "class-validator";

export class AlertTriggeredEvent {

    @IsString()
    title!:string;

    @IsString()
    message!: string;

    @IsString()
    channel!: string;

    @IsString()
    address!: string;

    @IsString()
    @IsUUID()
    Alert!: string;
}
