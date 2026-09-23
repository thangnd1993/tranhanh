import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { VehicleDashboardResult } from '@tranhanh/shared';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  get(vehicleId?: string, month?: string): Promise<VehicleDashboardResult> {
    let params = new HttpParams();
    if (vehicleId) params = params.set('vehicleId', vehicleId);
    if (month) params = params.set('month', month);
    return firstValueFrom(
      this.http.get<VehicleDashboardResult>('/api/v1/vehicles/dashboard', { params, withCredentials: true }),
    );
  }
}
