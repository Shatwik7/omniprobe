import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CheckExecutionRequestedEvent } from "./CheckExecutionRequestedEvent.dto";
import { HttpCheckError } from "./HttpCheckError.dto";

export class CheckExecutionFailedEvent {
    @ValidateNested()
    @Type(() => CheckExecutionRequestedEvent)
    Request!: CheckExecutionRequestedEvent;

    @ValidateNested()
    @Type(() => HttpCheckError)
    Response!: HttpCheckError;
}