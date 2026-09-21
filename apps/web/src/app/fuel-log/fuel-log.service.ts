import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  FuelLogEntryInput,
  FuelLogEntryResult,
  FuelLogListResult,
  FuelLogSummary,
  UpdateFuelLogEntryInput,
} from '@tranhanh/shared';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
@Injectable({ providedIn: 'root' })
export class FuelLogService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private base(vehicleId: string) {
    return `/api/v1/vehicles/${encodeURIComponent(vehicleId)}/fuel-logs`;
  }
  list(vehicleId: string, status: 'ACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE'): Promise<FuelLogListResult> {
    return firstValueFrom(
      this.http.get<FuelLogListResult>(this.base(vehicleId), { params: { status }, withCredentials: true }),
    );
  }
  summary(vehicleId: string, month?: string): Promise<FuelLogSummary> {
    return firstValueFrom(
      this.http.get<FuelLogSummary>(this.base(vehicleId) + '/summary', {
        params: month ? { month } : {},
        withCredentials: true,
      }),
    );
  }
  get(vehicleId: string, entryId: string): Promise<FuelLogEntryResult> {
    return firstValueFrom(
      this.http.get<FuelLogEntryResult>(`${this.base(vehicleId)}/${encodeURIComponent(entryId)}`, {
        withCredentials: true,
      }),
    );
  }
  create(vehicleId: string, input: FuelLogEntryInput): Promise<FuelLogEntryResult> {
    return firstValueFrom(
      this.http.post<FuelLogEntryResult>(this.base(vehicleId), input, this.auth.privateRequestOptions()),
    );
  }
  update(vehicleId: string, entryId: string, input: UpdateFuelLogEntryInput): Promise<FuelLogEntryResult> {
    return firstValueFrom(
      this.http.patch<FuelLogEntryResult>(
        `${this.base(vehicleId)}/${encodeURIComponent(entryId)}`,
        input,
        this.auth.privateRequestOptions(),
      ),
    );
  }
  lifecycle(vehicleId: string, entryId: string, action: 'archive' | 'restore'): Promise<FuelLogEntryResult> {
    return firstValueFrom(
      this.http.post<FuelLogEntryResult>(
        `${this.base(vehicleId)}/${encodeURIComponent(entryId)}/${action}`,
        {},
        this.auth.privateRequestOptions(),
      ),
    );
  }
}
