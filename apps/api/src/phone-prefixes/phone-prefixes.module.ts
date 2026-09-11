import { Module } from '@nestjs/common';
import { PhonePrefixesController } from './phone-prefixes.controller.js';
import { PhonePrefixesService } from './phone-prefixes.service.js';

@Module({ controllers: [PhonePrefixesController], providers: [PhonePrefixesService] })
export class PhonePrefixesModule {}
