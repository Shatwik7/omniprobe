import { IsNumber, IsPositive, IsString, IsUUID} from "class-validator";

export class CheckExecutionAddEvent {
    @IsString()
    @IsUUID()
    id!: string;


    @IsNumber()
    @IsPositive()
    frequency!: number; // in seconds
}