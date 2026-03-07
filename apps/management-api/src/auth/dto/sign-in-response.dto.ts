import { ApiProperty, ApiResponseProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignInDtoResponse {
  @ApiProperty()
  // @ApiResponseProperty()
  access_token: string;
}
