import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  VehicleExpenseInput,
  VehicleExpenseLedgerResult,
  VehicleExpenseListResult,
  VehicleExpenseResult,
  VehicleExpenseStatus,
  VehicleExpenseSummary,
  UpdateVehicleExpenseInput,
} from '@tranhanh/shared';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class VehicleExpenseService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private base(vehicleId: string) {
    return `/api/v1/vehicles/${encodeURIComponent(vehicleId)}/expenses`;
  }

  ledger(vehicleId: string, status: VehicleExpenseStatus | 'ALL', month: string, page = 1, pageSize = 20) {
    return firstValueFrom(
      this.http.get<VehicleExpenseLedgerResult>(this.base(vehicleId), {
        params: { status, month, page, pageSize },
        withCredentials: true,
      }),
    );
  }

  summary(vehicleId: string, month: string) {
    return firstValueFrom(
      this.http.get<VehicleExpenseSummary>(`${this.base(vehicleId)}/summary`, {
        params: { month },
        withCredentials: true,
      }),
    );
  }

  manual(vehicleId: string, status: VehicleExpenseStatus | 'ALL', month: string, page = 1, pageSize = 20) {
    return firstValueFrom(
      this.http.get<VehicleExpenseListResult>(`${this.base(vehicleId)}/manual`, {
        params: { status, month, page, pageSize },
        withCredentials: true,
      }),
    );
  }

  get(vehicleId: string, expenseId: string) {
    return firstValueFrom(
      this.http.get<VehicleExpenseResult>(`${this.base(vehicleId)}/manual/${encodeURIComponent(expenseId)}`, {
        withCredentials: true,
      }),
    );
  }

  create(vehicleId: string, input: VehicleExpenseInput) {
    return firstValueFrom(
      this.http.post<VehicleExpenseResult>(`${this.base(vehicleId)}/manual`, input, this.auth.privateRequestOptions()),
    );
  }

  update(vehicleId: string, expenseId: string, input: UpdateVehicleExpenseInput) {
    return firstValueFrom(
      this.http.patch<VehicleExpenseResult>(
        `${this.base(vehicleId)}/manual/${encodeURIComponent(expenseId)}`,
        input,
        this.auth.privateRequestOptions(),
      ),
    );
  }

  lifecycle(vehicleId: string, expenseId: string, action: 'archive' | 'restore') {
    return firstValueFrom(
      this.http.post<VehicleExpenseResult>(
        `${this.base(vehicleId)}/manual/${encodeURIComponent(expenseId)}/${action}`,
        {},
        this.auth.privateRequestOptions(),
      ),
    );
  }
}
