import { HttpCheckError } from '../dtos/HttpCheckError.dto';
import { HttpTimingMetrics } from '../dtos/HttpTimingMetrics.dto';

export type HttpCheckResult =
  | { success: true; metrics: HttpTimingMetrics }
  | { success: false; error: HttpCheckError };
