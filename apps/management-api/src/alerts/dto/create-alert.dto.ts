import { AlertType } from '@app/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsEnum,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
} from 'class-validator';

export class CreateAlertDto {
	@ApiProperty({ enum: AlertType })
	@IsEnum(AlertType)
	type!: AlertType;

	@ApiProperty()
	@IsString()
	message!: string;

	@ApiPropertyOptional({ type: Object })
	@IsOptional()
	@IsObject()
	metadata?: Record<string, any>;

	@ApiProperty()
	@IsString()
	@IsUUID()
	monitorId!: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@IsUUID()
	metricId?: string;
}
