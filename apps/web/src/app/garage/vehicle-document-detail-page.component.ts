import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { VehicleDocumentResult } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { documentPath } from '../i18n/routes';
import { VehicleDocumentService } from './vehicle-document.service';
@Component({
  selector: 'tn-vehicle-document-detail-page',
  imports: [RouterLink, ButtonDirective],
  template: ` <section class="container section stack garage-detail documents-page">
    <a
      class="back-link"
      [routerLink]="documentPath(i18n.locale(), vehicleId)"
      >← {{ vi() ? 'Quay lại giấy tờ' : 'Back to documents' }}</a
    >
    @if (loading()) {
      <p class="muted">{{ vi() ? 'Đang tải…' : 'Loading…' }}</p>
    } @else if (error()) {
      <p
        class="form-error"
        role="alert"
      >
        {{ error() }}
      </p>
    } @else if (document(); as d) {
      <header class="garage-heading">
        <div>
          <div class="cluster">
            <span
              class="badge"
              [attr.data-tone]="
                d.expiryState === 'EXPIRED' ? 'danger' : d.expiryState === 'EXPIRING_SOON' ? 'warning' : 'success'
              "
              >{{ state(d) }}</span
            >
            @if (d.status === 'ARCHIVED') {
              <span class="badge">{{ vi() ? 'Đã lưu trữ' : 'Archived' }}</span>
            }
          </div>
          <h1>{{ d.displayName }}</h1>
          <p class="muted">{{ vi() ? 'Thông tin do người dùng cung cấp' : 'User-provided information' }}</p>
        </div>
        <a
          tnButton
          variant="secondary"
          [routerLink]="documentPath(i18n.locale(), vehicleId, d.id, 'edit')"
          >{{ vi() ? 'Chỉnh sửa' : 'Edit' }}</a
        >
      </header>
      <dl class="vehicle-facts">
        <div>
          <dt>{{ vi() ? 'Loại' : 'Type' }}</dt>
          <dd>{{ d.type }}</dd>
        </div>
        <div>
          <dt>{{ vi() ? 'Số giấy tờ' : 'Reference number' }}</dt>
          <dd>{{ d.referenceNumber || '—' }}</dd>
        </div>
        <div>
          <dt>{{ vi() ? 'Đơn vị cấp' : 'Issuer' }}</dt>
          <dd>{{ d.issuer || '—' }}</dd>
        </div>
        <div>
          <dt>{{ vi() ? 'Ngày cấp' : 'Issue date' }}</dt>
          <dd>{{ format(d.issuedAt) }}</dd>
        </div>
        <div>
          <dt>{{ vi() ? 'Có hiệu lực từ' : 'Effective from' }}</dt>
          <dd>{{ format(d.effectiveFrom) }}</dd>
        </div>
        <div>
          <dt>{{ vi() ? 'Hết hạn' : 'Expires' }}</dt>
          <dd>{{ format(d.expiresAt) }}</dd>
        </div>
        <div>
          <dt>{{ vi() ? 'Ghi chú' : 'Notes' }}</dt>
          <dd>{{ d.notes || '—' }}</dd>
        </div>
      </dl>
      <section class="monitoring-panel stack">
        <h2>{{ vi() ? 'Nhắc hạn' : 'Expiry reminders' }}</h2>
        <div class="cluster">
          @for (r of d.reminders; track r.id) {
            @if (r.enabled) {
              <span class="badge">{{ r.daysBefore }} {{ vi() ? 'ngày trước' : 'days before' }}</span>
            }
          }
        </div>
        <p class="muted">
          {{
            vi()
              ? 'Các mốc nhắc được ghi nhận trong hệ thống; chưa gửi email hoặc thông báo đẩy.'
              : 'Reminder events are recorded in the system; email and push delivery are not enabled yet.'
          }}
        </p>
      </section>
      <div class="cluster">
        @if (d.status === 'ACTIVE') {
          <button
            tnButton
            variant="ghost"
            [loading]="busy()"
            (click)="archive()"
          >
            {{ vi() ? 'Lưu trữ' : 'Archive' }}
          </button>
        } @else {
          <button
            tnButton
            variant="secondary"
            [loading]="busy()"
            (click)="restore()"
          >
            {{ vi() ? 'Khôi phục' : 'Restore' }}
          </button>
        }
      </div>
    }
  </section>`,
  styleUrls: ['./garage.scss', './vehicle-documents.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDocumentDetailPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly documentPath = documentPath;
  private readonly route = inject(ActivatedRoute);
  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  private readonly documentId = this.route.snapshot.paramMap.get('documentId')!;
  private readonly service = inject(VehicleDocumentService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly document = signal<VehicleDocumentResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  ngOnInit() {
    if (this.browser) void this.load();
  }
  protected vi() {
    return this.i18n.locale() === 'vi';
  }
  protected format(v: string | null) {
    return v ? new Intl.DateTimeFormat(this.vi() ? 'vi-VN' : 'en-GB').format(new Date(v + 'T00:00:00')) : '—';
  }
  protected state(d: VehicleDocumentResult) {
    return d.expiryState === 'EXPIRED'
      ? this.vi()
        ? 'Đã hết hạn'
        : 'Expired'
      : d.expiryState === 'EXPIRING_SOON'
        ? this.vi()
          ? 'Sắp hết hạn'
          : 'Expiring soon'
        : d.expiryState === 'NO_EXPIRY'
          ? this.vi()
            ? 'Không có hạn'
            : 'No expiry'
          : this.vi()
            ? 'Còn hiệu lực'
            : 'Valid';
  }
  private async load() {
    try {
      this.document.set(await this.service.get(this.vehicleId, this.documentId));
    } catch {
      this.error.set(this.vi() ? 'Không thể tải giấy tờ.' : 'Unable to load document.');
    } finally {
      this.loading.set(false);
    }
  }
  protected async archive() {
    await this.act(() => this.service.archive(this.vehicleId, this.documentId));
  }
  protected async restore() {
    await this.act(() => this.service.restore(this.vehicleId, this.documentId));
  }
  private async act(run: () => Promise<VehicleDocumentResult>) {
    this.busy.set(true);
    try {
      this.document.set(await run());
    } catch {
      this.error.set(this.vi() ? 'Không thể cập nhật.' : 'Unable to update.');
    } finally {
      this.busy.set(false);
    }
  }
}
