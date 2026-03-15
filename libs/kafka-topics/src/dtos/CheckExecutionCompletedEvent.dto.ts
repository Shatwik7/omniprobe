import { IsEnum, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CheckExecutionRequestedEvent } from './CheckExecutionRequestedEvent.dto';
import { HttpTimingMetrics } from './HttpTimingMetrics.dto';

export class CheckExecutionCompletedEvent {
  @ValidateNested()
  @Type(() => CheckExecutionRequestedEvent)
  Request!: CheckExecutionRequestedEvent;

  @ValidateNested()
  @Type(() => HttpTimingMetrics)
  Response!: HttpTimingMetrics;

  @IsEnum(['EU', 'IN', 'NA', 'AU'], { message: 'Region must be one of EU, IN, NA, AU' })
  @IsString()
  region: string = 'IN';
}
