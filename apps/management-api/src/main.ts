import { NestFactory } from '@nestjs/core';
import { ManagementApiModule } from './management-api.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  const config = new DocumentBuilder()
    .setTitle('API Examples')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/doc', app, documentFactory);
  SwaggerModule.setup('api/doc', app, documentFactory, {
    jsonDocumentUrl: 'api/doc/json',
  });
  app.useLogger(['log', 'error', 'warn', 'debug']);
  const Port = process.env.PORT ?? 3000;
  await app.listen(Port).then(() => logger.log(`Listing on Port : ${Port}`));
}

bootstrap()
  .catch((error) => {
    logger.error(error);
  });
