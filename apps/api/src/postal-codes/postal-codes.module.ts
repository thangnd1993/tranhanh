import { Module } from '@nestjs/common';
import { PostalCodesController } from './postal-codes.controller.js';
import { PostalCodesService } from './postal-codes.service.js';
@Module({ controllers: [PostalCodesController], providers: [PostalCodesService] })
export class PostalCodesModule {}
