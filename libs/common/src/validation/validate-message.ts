import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export async function transformAndValidate<T>(
  cls: new () => T,
  payload: unknown,
): Promise<T | null> {

  const instance = plainToInstance(cls, payload, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = await validate(instance as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    validationError: { target: false },
  });

  if (errors.length > 0) {
    return null;
  }

  return instance;
}