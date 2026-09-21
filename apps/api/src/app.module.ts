import { fileURLToPath } from 'node:url';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AreaCodesModule } from './area-codes/area-codes.module.js';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';
import { PhonePrefixesModule } from './phone-prefixes/phone-prefixes.module.js';
import { PostalCodesModule } from './postal-codes/postal-codes.module.js';
import { RedisModule } from './redis/redis.module.js';
import { TrafficFinesModule } from './traffic-fines/traffic-fines.module.js';
import { VehiclePlatesModule } from './vehicle-plates/vehicle-plates.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { VehicleMonitoringModule } from './vehicle-monitoring/vehicle-monitoring.module.js';
import { VehicleDocumentsModule } from './vehicle-documents/vehicle-documents.module.js';
import { FuelPricesModule } from './fuel-prices/fuel-prices.module.js';
import { FuelLogModule } from './fuel-log/fuel-log.module.js';
import { MaintenanceModule } from './maintenance/maintenance.module.js';

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
    AuthModule,
    PhonePrefixesModule,
    PostalCodesModule,
    VehiclePlatesModule,
    VehiclesModule,
    AreaCodesModule,
    RedisModule,
    TrafficFinesModule,
    VehicleMonitoringModule,
    VehicleDocumentsModule,
    FuelPricesModule,
    FuelLogModule,
    MaintenanceModule,
  ],
  providers: [HealthService],
})
export class AppModule {}
