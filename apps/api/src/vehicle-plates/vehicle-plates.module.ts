import { Module } from '@nestjs/common';
import { VehiclePlatesController } from './vehicle-plates.controller.js';
import { VehiclePlatesService } from './vehicle-plates.service.js';
@Module({ controllers: [VehiclePlatesController], providers: [VehiclePlatesService] })
export class VehiclePlatesModule {}
