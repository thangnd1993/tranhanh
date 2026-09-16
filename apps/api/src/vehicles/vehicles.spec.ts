import { beforeEach, describe, expect, it } from 'vitest';
import { FakeAuthPrisma } from '../../test/fixtures/auth-prisma.js';
import type { PrismaService } from '../database/prisma.service.js';
import { normalizeFullPlate } from './normalize-saved-vehicle.js';
import { VehiclesService } from './vehicles.service.js';

describe('private vehicles', () => {
  let fake: FakeAuthPrisma;
  let service: VehiclesService;
  beforeEach(() => {
    fake = new FakeAuthPrisma();
    service = new VehiclesService(fake as unknown as PrismaService);
  });
  it('normalizes common Vietnamese full-plate formats without exposing lookup behavior', () => {
    expect(normalizeFullPlate(' 51k-123.45 ')).toEqual({ display: '51K-123.45', normalized: '51K12345' });
    expect(normalizeFullPlate('59-a3 123.45')).toEqual({ display: '59A3-123.45', normalized: '59A312345' });
    expect(() => normalizeFullPlate('51')).toThrow();
  });
  it('makes the first active vehicle primary and enforces plate uniqueness per owner only', async () => {
    const a = await service.create('user-a', { licensePlate: '51K-123.45', vehicleType: 'CAR' });
    expect(a).toMatchObject({ isPrimary: true, displayName: '51K-123.45' });
    await expect(service.create('user-a', { licensePlate: '51K12345', vehicleType: 'CAR' })).rejects.toMatchObject({
      status: 409,
    });
    await expect(service.create('user-b', { licensePlate: '51K12345', vehicleType: 'CAR' })).resolves.toMatchObject({
      isPrimary: true,
    });
  });
  it('scopes list and every id operation to the authenticated owner', async () => {
    const vehicle = await service.create('user-a', {
      licensePlate: '30A-123.45',
      vehicleType: 'CAR',
      currentOdometerKm: 1000,
    });
    expect(await service.list('user-b', 'ALL')).toEqual([]);
    await expect(service.get('user-b', vehicle.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.update('user-b', vehicle.id, { notes: 'stolen' })).rejects.toMatchObject({ status: 404 });
    await expect(service.setPrimary('user-b', vehicle.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.archive('user-b', vehicle.id)).rejects.toMatchObject({ status: 404 });
    await service.archive('user-a', vehicle.id);
    await expect(service.restore('user-b', vehicle.id)).rejects.toMatchObject({ status: 404 });
  });
  it('switches one active primary atomically and restores archived vehicles as non-primary', async () => {
    const first = await service.create('user-a', { licensePlate: '30A-123.45', vehicleType: 'CAR' });
    const second = await service.create('user-a', { licensePlate: '30B-456.78', vehicleType: 'CAR' });
    expect(second.isPrimary).toBe(false);
    await service.setPrimary('user-a', second.id);
    expect((await service.get('user-a', first.id)).isPrimary).toBe(false);
    expect((await service.archive('user-a', second.id)).isPrimary).toBe(false);
    expect(await service.restore('user-a', second.id)).toMatchObject({ status: 'ACTIVE', isPrimary: false });
  });
  it('rejects odometer rollback unless correction is explicit', async () => {
    const vehicle = await service.create('user-a', {
      licensePlate: '29A-111.11',
      vehicleType: 'CAR',
      currentOdometerKm: 5000,
    });
    await expect(service.update('user-a', vehicle.id, { currentOdometerKm: 4000 })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      service.update('user-a', vehicle.id, { currentOdometerKm: 4000, allowOdometerCorrection: true }),
    ).resolves.toMatchObject({ currentOdometerKm: 4000 });
  });
});
