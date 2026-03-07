import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  channel: string;

  @ApiProperty()
  @IsString()
  recipient: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty()
  @IsUUID()
  incidentId: string;
}
