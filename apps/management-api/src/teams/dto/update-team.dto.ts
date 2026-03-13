import { PartialType } from '@nestjs/mapped-types';
import { CreateTeamDto } from './create-team.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateTeamDto extends PartialType(CreateTeamDto) {
	@ApiPropertyOptional()
	@IsOptional()
	@IsUUID()
	addUserId?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsUUID()
	removeUserId?: string;
}
