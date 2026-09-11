import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureDatabaseHttp } from './database/configure-database-http.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.enableShutdownHooks();
  configureDatabaseHttp(app);
  app.enableCors({ origin: config.getOrThrow<string>('WEB_ORIGIN') });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));

  const openApiConfig = new DocumentBuilder()
    .setTitle('TraNhanh API')
    .setDescription('Public and administrative APIs for TraNhanh.')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, openApiConfig));

  await app.listen(config.getOrThrow<number>('API_PORT'), config.getOrThrow<string>('API_HOST'));
}

await bootstrap();
