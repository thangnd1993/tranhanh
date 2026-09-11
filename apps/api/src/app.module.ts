import { fileURLToPath } from 'node:url';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';
import { PhonePrefixesModule } from './phone-prefixes/phone-prefixes.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  controllers: [AppController, HealthController],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: fileURLToPath(new URL('../../../.env', import.meta.url)),
      isGlobal: true,
      validate: validateEnvironment,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          port: config.getOrThrow<number>('REDIS_PORT'),
        },
      }),
    }),
    DatabaseModule,
    PhonePrefixesModule,
    RedisModule,
  ],
  providers: [HealthService],
})
export class AppModule {}
