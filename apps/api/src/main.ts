import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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
