import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  CompleteMaintenancePlanInput,
  MaintenanceCompletionResult,
  MaintenanceHistoryInput,
  MaintenanceHistoryListResult,
  MaintenanceHistoryResult,
  MaintenancePlanInput,
  MaintenancePlanListResult,
  MaintenancePlanResult,
  MaintenanceSummary,
  UpdateMaintenanceHistoryInput,
  UpdateMaintenancePlanInput,
} from '@tranhanh/shared';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private base(vehicleId: string) {
    return `/api/v1/vehicles/${encodeURIComponent(vehicleId)}/maintenance`;
  }

  history(vehicleId: string, status: 'ACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE', page = 1, pageSize = 20) {
    return firstValueFrom(
      this.http.get<MaintenanceHistoryListResult>(`${this.base(vehicleId)}/history`, {
        params: { status, page, pageSize },
        withCredentials: true,
      }),
    );
  }

  getHistory(vehicleId: string, historyId: string) {
    return firstValueFrom(
      this.http.get<MaintenanceHistoryResult>(`${this.base(vehicleId)}/history/${encodeURIComponent(historyId)}`, {
        withCredentials: true,
      }),
    );
  }

  createHistory(vehicleId: string, input: MaintenanceHistoryInput) {
    return firstValueFrom(
      this.http.post<MaintenanceHistoryResult>(
        `${this.base(vehicleId)}/history`,
        input,
        this.auth.privateRequestOptions(),
      ),
    );
  }

  updateHistory(vehicleId: string, historyId: string, input: UpdateMaintenanceHistoryInput) {
    return firstValueFrom(
      this.http.patch<MaintenanceHistoryResult>(
        `${this.base(vehicleId)}/history/${encodeURIComponent(historyId)}`,
        input,
        this.auth.privateRequestOptions(),
      ),
    );
  }

  historyLifecycle(vehicleId: string, historyId: string, action: 'archive' | 'restore') {
    return firstValueFrom(
      this.http.post<MaintenanceHistoryResult>(
        `${this.base(vehicleId)}/history/${encodeURIComponent(historyId)}/${action}`,
        {},
        this.auth.privateRequestOptions(),
      ),
    );
  }

  plans(vehicleId: string, status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'ALL' = 'ACTIVE', page = 1, pageSize = 20) {
    return firstValueFrom(
      this.http.get<MaintenancePlanListResult>(`${this.base(vehicleId)}/plans`, {
        params: { status, page, pageSize },
        withCredentials: true,
      }),
    );
  }

  getPlan(vehicleId: string, planId: string) {
    return firstValueFrom(
      this.http.get<MaintenancePlanResult>(`${this.base(vehicleId)}/plans/${encodeURIComponent(planId)}`, {
        withCredentials: true,
      }),
    );
  }

  createPlan(vehicleId: string, input: MaintenancePlanInput) {
    return firstValueFrom(
      this.http.post<MaintenancePlanResult>(`${this.base(vehicleId)}/plans`, input, this.auth.privateRequestOptions()),
    );
  }

  updatePlan(vehicleId: string, planId: string, input: UpdateMaintenancePlanInput) {
    return firstValueFrom(
      this.http.patch<MaintenancePlanResult>(
        `${this.base(vehicleId)}/plans/${encodeURIComponent(planId)}`,
        input,
        this.auth.privateRequestOptions(),
      ),
    );
  }

  planLifecycle(vehicleId: string, planId: string, action: 'archive' | 'restore') {
    return firstValueFrom(
      this.http.post<MaintenancePlanResult>(
        `${this.base(vehicleId)}/plans/${encodeURIComponent(planId)}/${action}`,
        {},
        this.auth.privateRequestOptions(),
      ),
    );
  }

  completePlan(vehicleId: string, planId: string, input: CompleteMaintenancePlanInput) {
    return firstValueFrom(
      this.http.post<MaintenanceCompletionResult>(
        `${this.base(vehicleId)}/plans/${encodeURIComponent(planId)}/complete`,
        input,
        this.auth.privateRequestOptions(),
      ),
    );
  }

  summary(vehicleId: string) {
    return firstValueFrom(
      this.http.get<MaintenanceSummary>(`${this.base(vehicleId)}/summary`, { withCredentials: true }),
    );
  }
}
