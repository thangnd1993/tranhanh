import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { UpdateVehicleInput, VehicleInput, VehicleResult, VehicleStatus } from '@tranhanh/shared';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class GarageService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  list(status: VehicleStatus | 'ALL' = 'ACTIVE'): Promise<VehicleResult[]> {
    return firstValueFrom(
      this.http.get<VehicleResult[]>('/api/v1/vehicles', { params: { status }, withCredentials: true }),
    );
  }
  get(id: string): Promise<VehicleResult> {
    return firstValueFrom(
      this.http.get<VehicleResult>(`/api/v1/vehicles/${encodeURIComponent(id)}`, { withCredentials: true }),
    );
  }
  create(input: VehicleInput): Promise<VehicleResult> {
    return firstValueFrom(this.http.post<VehicleResult>('/api/v1/vehicles', input, this.auth.privateRequestOptions()));
  }
  update(id: string, input: UpdateVehicleInput): Promise<VehicleResult> {
    return firstValueFrom(
      this.http.patch<VehicleResult>(
        `/api/v1/vehicles/${encodeURIComponent(id)}`,
        input,
        this.auth.privateRequestOptions(),
      ),
    );
  }
  archive(id: string): Promise<VehicleResult> {
    return firstValueFrom(
      this.http.delete<VehicleResult>(`/api/v1/vehicles/${encodeURIComponent(id)}`, this.auth.privateRequestOptions()),
    );
  }
  restore(id: string): Promise<VehicleResult> {
    return firstValueFrom(
      this.http.post<VehicleResult>(
        `/api/v1/vehicles/${encodeURIComponent(id)}/restore`,
        {},
        this.auth.privateRequestOptions(),
      ),
    );
  }
  setPrimary(id: string): Promise<VehicleResult> {
    return firstValueFrom(
      this.http.post<VehicleResult>(
        `/api/v1/vehicles/${encodeURIComponent(id)}/primary`,
        {},
        this.auth.privateRequestOptions(),
      ),
    );
  }
}
