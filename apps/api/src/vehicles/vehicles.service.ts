import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateVehicleInput, VehicleInput, VehicleResult, VehicleStatus } from '@tranhanh/shared';
import type { Vehicle } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { normalizeVehicleInput } from './normalize-saved-vehicle.js';

function result(vehicle: Vehicle): VehicleResult {
  return {
    id: vehicle.id,
    displayName: vehicle.displayName,
    licensePlate: vehicle.licensePlate,
    vehicleType: vehicle.vehicleType,
    make: vehicle.make,
    model: vehicle.model,
    modelYear: vehicle.modelYear,
    currentOdometerKm: vehicle.currentOdometerKm,
    notes: vehicle.notes,
    isPrimary: vehicle.isPrimary,
    status: vehicle.status,
    archivedAt: vehicle.archivedAt?.toISOString() ?? null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

function isUniqueFailure(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, status: VehicleStatus | 'ALL' = 'ACTIVE'): Promise<VehicleResult[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId, ...(status === 'ALL' ? {} : { status }) },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
    return vehicles.map(result);
  }

  async get(userId: string, id: string): Promise<VehicleResult> {
    return result(await this.owned(userId, id));
  }

  async create(userId: string, input: VehicleInput): Promise<VehicleResult> {
    const data = normalizeVehicleInput(input);
    try {
      const vehicle = await this.prisma.$transaction(async (tx) => {
        const activeCount = await tx.vehicle.count({ where: { userId, status: 'ACTIVE' } });
        return tx.vehicle.create({ data: { ...data, userId, isPrimary: activeCount === 0 } });
      });
      return result(vehicle);
    } catch (error) {
      if (!isUniqueFailure(error)) throw error;
      const duplicate = await this.prisma.vehicle.findFirst({
        where: { userId, normalizedLicensePlate: data.normalizedLicensePlate },
      });
      if (duplicate) throw new ConflictException('This vehicle plate is already in your garage.');
      try {
        return result(await this.prisma.vehicle.create({ data: { ...data, userId, isPrimary: false } }));
      } catch (retryError) {
        if (isUniqueFailure(retryError)) throw new ConflictException('This vehicle plate is already in your garage.');
        throw retryError;
      }
    }
  }

  async update(userId: string, id: string, input: UpdateVehicleInput): Promise<VehicleResult> {
    const current = await this.owned(userId, id);
    if (
      input.currentOdometerKm != null &&
      current.currentOdometerKm != null &&
      input.currentOdometerKm < current.currentOdometerKm &&
      input.allowOdometerCorrection !== true
    )
      throw new BadRequestException('A lower odometer needs explicit correction confirmation.');

    const merged = normalizeVehicleInput({
      displayName: input.displayName === undefined ? current.displayName : input.displayName,
      licensePlate: input.licensePlate ?? current.licensePlate,
      vehicleType: input.vehicleType ?? current.vehicleType,
      make: input.make === undefined ? current.make : input.make,
      model: input.model === undefined ? current.model : input.model,
      modelYear: input.modelYear === undefined ? current.modelYear : input.modelYear,
      currentOdometerKm: input.currentOdometerKm === undefined ? current.currentOdometerKm : input.currentOdometerKm,
      notes: input.notes === undefined ? current.notes : input.notes,
    });
    try {
      return result(await this.prisma.vehicle.update({ where: { id: current.id, userId }, data: merged }));
    } catch (error) {
      if (isUniqueFailure(error)) throw new ConflictException('This vehicle plate is already in your garage.');
      throw error;
    }
  }

  async setPrimary(userId: string, id: string): Promise<VehicleResult> {
    return result(
      await this.prisma.$transaction(async (tx) => {
        const target = await tx.vehicle.findFirst({ where: { id, userId, status: 'ACTIVE' } });
        if (!target) throw new NotFoundException('Vehicle not found.');
        await tx.vehicle.updateMany({
          where: { userId, status: 'ACTIVE', isPrimary: true },
          data: { isPrimary: false },
        });
        return tx.vehicle.update({ where: { id: target.id, userId }, data: { isPrimary: true } });
      }),
    );
  }

  async archive(userId: string, id: string): Promise<VehicleResult> {
    const current = await this.owned(userId, id);
    if (current.status === 'ARCHIVED') return result(current);
    return result(
      await this.prisma.vehicle.update({
        where: { id: current.id, userId },
        data: { status: 'ARCHIVED', archivedAt: new Date(), isPrimary: false },
      }),
    );
  }

  async restore(userId: string, id: string): Promise<VehicleResult> {
    const current = await this.owned(userId, id);
    if (current.status === 'ACTIVE') return result(current);
    return result(
      await this.prisma.vehicle.update({
        where: { id: current.id, userId },
        data: { status: 'ACTIVE', archivedAt: null, isPrimary: false },
      }),
    );
  }

  private async owned(userId: string, id: string): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, userId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    return vehicle;
  }
}
