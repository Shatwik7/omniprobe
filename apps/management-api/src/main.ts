import { NestFactory } from '@nestjs/core';
import { ManagementApiModule } from './management-api.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config();
const logger = new Logger();


async function bootstrap() {
  const app = await NestFactory.create(ManagementApiModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
      disableErrorMessages: false,
    }),
  );
  app.useLogger(['log', 'error', 'warn', 'debug']);
  const Port = process.env.PORT ?? 3000;
  await app.listen(Port).then(() => logger.log(`Listing on Port : ${Port}`));
}

bootstrap()
  .catch((error) => {
    logger.error(error);
  });
