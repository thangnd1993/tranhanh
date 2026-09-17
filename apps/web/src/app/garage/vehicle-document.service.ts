import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  UpdateVehicleDocumentInput,
  VehicleDocumentInput,
  VehicleDocumentListResult,
  VehicleDocumentReminderOffset,
  VehicleDocumentResult,
} from '@tranhanh/shared';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
@Injectable({ providedIn: 'root' })
export class VehicleDocumentService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private base(vehicleId: string) {
    return `/api/v1/vehicles/${encodeURIComponent(vehicleId)}/documents`;
  }
  list(vehicleId: string, status: 'ACTIVE' | 'ARCHIVED' | 'ALL' = 'ACTIVE'): Promise<VehicleDocumentListResult> {
    return firstValueFrom(
      this.http.get<VehicleDocumentListResult>(this.base(vehicleId), { params: { status }, withCredentials: true }),
    );
  }
  get(vehicleId: string, documentId: string): Promise<VehicleDocumentResult> {
    return firstValueFrom(
      this.http.get<VehicleDocumentResult>(`${this.base(vehicleId)}/${encodeURIComponent(documentId)}`, {
        withCredentials: true,
      }),
    );
  }
  create(vehicleId: string, input: VehicleDocumentInput): Promise<VehicleDocumentResult> {
    return firstValueFrom(
      this.http.post<VehicleDocumentResult>(this.base(vehicleId), input, this.auth.privateRequestOptions()),
    );
  }
  update(vehicleId: string, documentId: string, input: UpdateVehicleDocumentInput): Promise<VehicleDocumentResult> {
    return firstValueFrom(
      this.http.patch<VehicleDocumentResult>(
        `${this.base(vehicleId)}/${encodeURIComponent(documentId)}`,
        input,
        this.auth.privateRequestOptions(),
      ),
    );
  }
  archive(vehicleId: string, documentId: string): Promise<VehicleDocumentResult> {
    return firstValueFrom(
      this.http.delete<VehicleDocumentResult>(
        `${this.base(vehicleId)}/${encodeURIComponent(documentId)}`,
        this.auth.privateRequestOptions(),
      ),
    );
  }
  restore(vehicleId: string, documentId: string): Promise<VehicleDocumentResult> {
    return firstValueFrom(
      this.http.post<VehicleDocumentResult>(
        `${this.base(vehicleId)}/${encodeURIComponent(documentId)}/restore`,
        {},
        this.auth.privateRequestOptions(),
      ),
    );
  }
  reminders(
    vehicleId: string,
    documentId: string,
    enabledDaysBefore: VehicleDocumentReminderOffset[],
  ): Promise<VehicleDocumentResult> {
    return firstValueFrom(
      this.http.put<VehicleDocumentResult>(
        `${this.base(vehicleId)}/${encodeURIComponent(documentId)}/reminders`,
        { enabledDaysBefore },
        this.auth.privateRequestOptions(),
      ),
    );
  }
}
