import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
    @ApiProperty()
    name:string;

    @ApiProperty()
    pass:string;

    @ApiProperty()
    email:string;
}
