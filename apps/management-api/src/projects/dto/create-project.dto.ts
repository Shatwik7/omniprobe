import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";


export class CreateProjectDto {
    @ApiProperty()
    @IsString()
    @MinLength(3)
    name:string;

    @ApiProperty()
    @IsString()
    @MaxLength(255)
    description:string;
    
}
