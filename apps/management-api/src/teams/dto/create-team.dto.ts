import { Team } from "@app/database";
import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateTeamDto{
    @ApiProperty()
    @IsString()
    name: string ;
}
