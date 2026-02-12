import { IsDate, IsDateString, IsEnum, IsISO8601, IsNumber, IsObject, IsOptional, IsPositive, IsString, IsUrl, IsUUID } from "class-validator";
import { HttpMethods } from "../enums/HttpMethods";


export class CheckExecutionRequestedEvent{
    @IsUUID()
    @IsString()
    id!: string;

    @IsUUID()
    @IsString()
    checkId!: string;

    @IsUrl({
        require_protocol: true,
        require_valid_protocol: true,
        protocols: ['http', 'https'],
    })
    url!: string;

    @IsEnum(HttpMethods)
    method!: HttpMethods;

    @IsPositive()
    @IsNumber()
    timeout!: number;

    @IsDateString()
    enqueuedAt!: string;

    @IsOptional()
    @IsObject()
    headers?: Record<string, string>;

    @IsString()
    @IsOptional()
    body?: string;
}