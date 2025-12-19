import { NestFactory } from '@nestjs/core';
import { AlertEngineModule } from './alert-engine.module';

async function bootstrap() {
  const app = await NestFactory.create(AlertEngineModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
