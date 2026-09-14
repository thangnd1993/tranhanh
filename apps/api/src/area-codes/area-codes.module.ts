import { Module } from '@nestjs/common';
import { AreaCodesController } from './area-codes.controller.js';
import { AreaCodesService } from './area-codes.service.js';

@Module({ controllers: [AreaCodesController], providers: [AreaCodesService] })
export class AreaCodesModule {}
