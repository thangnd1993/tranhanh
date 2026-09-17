import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { VehicleDocumentListResult, VehicleDocumentResult } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { documentPath, garagePath } from '../i18n/routes';
import { VehicleDocumentService } from './vehicle-document.service';
@Component({
  selector: 'tn-vehicle-documents-page',
  imports: [RouterLink, ButtonDirective],
  template: `<section class="container section stack garage-detail documents-page">
    <a
      class="back-link"
      [routerLink]="garagePath(i18n.locale(), vehicleId)"
      >← {{ copy().back }}</a
    >
    <header class="garage-heading">
      <div>
        <p class="eyebrow">{{ copy().eyebrow }}</p>
        <h1>{{ copy().title }}</h1>
        <p class="muted">{{ copy().intro }}</p>
      </div>
      <a
        tnButton
        [routerLink]="documentPath(i18n.locale(), vehicleId, undefined, 'add')"
        >{{ copy().add }}</a
      >
    </header>
    @if (loading()) {
      <p
        class="muted"
        role="status"
      >
        {{ copy().loading }}
      </p>
    } @else if (error()) {
      <p
        class="form-error"
        role="alert"
      >
        {{ error() }}
      </p>
    } @else if (data(); as result) {
      @if (result.items.length === 0) {
        <div class="garage-empty stack">
          <h2>{{ copy().empty }}</h2>
          <p>{{ copy().emptyBody }}</p>
          <a
            tnButton
            [routerLink]="documentPath(i18n.locale(), vehicleId, undefined, 'add')"
            >{{ copy().add }}</a
          >
        </div>
      } @else {
        <div class="document-attention">
          <strong>{{ result.attention.expired }}</strong> {{ copy().expired }} ·
          <strong>{{ result.attention.expiringSoon }}</strong> {{ copy().soon }}
        </div>
        <div class="garage-grid">
          @for (item of result.items; track item.id) {
            <a
              class="vehicle-card document-card"
              [routerLink]="documentPath(i18n.locale(), vehicleId, item.id)"
            >
              <div class="cluster">
                <span
                  class="badge"
                  [attr.data-tone]="tone(item)"
                  >{{ state(item) }}</span
                ><span class="muted">{{ type(item) }}</span>
              </div>
              <h2>{{ item.displayName }}</h2>
              <p>{{ item.expiresAt ? copy().expires + ': ' + format(item.expiresAt) : copy().noExpiry }}</p>
              <small class="muted">{{ copy().userProvided }}</small>
            </a>
          }
        </div>
      }
    }
  </section>`,
  styleUrls: ['./garage.scss', './vehicle-documents.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDocumentsPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly garagePath = garagePath;
  protected readonly documentPath = documentPath;
  protected readonly vehicleId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  private readonly service = inject(VehicleDocumentService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly data = signal<VehicleDocumentListResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  ngOnInit() {
    if (this.browser) void this.load();
  }
  private async load() {
    try {
      this.data.set(await this.service.list(this.vehicleId));
    } catch {
      this.error.set(this.copy().error);
    } finally {
      this.loading.set(false);
    }
  }
  protected format(value: string) {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-GB').format(
      new Date(value + 'T00:00:00'),
    );
  }
  protected tone(item: VehicleDocumentResult) {
    return item.expiryState === 'EXPIRED' ? 'danger' : item.expiryState === 'EXPIRING_SOON' ? 'warning' : 'success';
  }
  protected state(item: VehicleDocumentResult) {
    const c = this.copy();
    return item.expiryState === 'EXPIRED'
      ? c.expiredState
      : item.expiryState === 'EXPIRING_SOON'
        ? c.soonState
        : item.expiryState === 'NO_EXPIRY'
          ? c.noExpiry
          : c.valid;
  }
  protected type(item: VehicleDocumentResult) {
    return this.i18n.locale() === 'vi'
      ? (
          {
            VEHICLE_REGISTRATION: 'Đăng ký xe',
            PERIODIC_INSPECTION: 'Đăng kiểm định kỳ',
            COMPULSORY_CIVIL_LIABILITY_INSURANCE: 'Bảo hiểm TNDS bắt buộc',
            VOLUNTARY_VEHICLE_INSURANCE: 'Bảo hiểm tự nguyện',
            ROAD_USE_FEE: 'Phí sử dụng đường bộ',
            OTHER: 'Khác',
          } as const
        )[item.type]
      : (
          {
            VEHICLE_REGISTRATION: 'Vehicle registration',
            PERIODIC_INSPECTION: 'Periodic inspection',
            COMPULSORY_CIVIL_LIABILITY_INSURANCE: 'Compulsory liability insurance',
            VOLUNTARY_VEHICLE_INSURANCE: 'Voluntary insurance',
            ROAD_USE_FEE: 'Road use fee',
            OTHER: 'Other',
          } as const
        )[item.type];
  }
  protected copy() {
    return this.i18n.locale() === 'vi'
      ? {
          back: 'Quay lại xe',
          eyebrow: 'TÀI LIỆU RIÊNG TƯ',
          title: 'Giấy tờ và thời hạn',
          intro: 'Quản lý giấy tờ do bạn nhập và các mốc nhắc hạn.',
          add: 'Thêm giấy tờ',
          loading: 'Đang tải…',
          empty: 'Chưa có giấy tờ',
          emptyBody: 'Thêm đăng ký xe, đăng kiểm hoặc bảo hiểm để theo dõi thời hạn.',
          expired: 'đã hết hạn',
          soon: 'sắp hết hạn',
          expires: 'Hết hạn',
          noExpiry: 'Không có ngày hết hạn',
          userProvided: 'Thông tin do người dùng cung cấp',
          expiredState: 'Đã hết hạn',
          soonState: 'Sắp hết hạn',
          valid: 'Còn hiệu lực',
          error: 'Không thể tải giấy tờ.',
        }
      : {
          back: 'Back to vehicle',
          eyebrow: 'PRIVATE DOCUMENTS',
          title: 'Documents and expiry dates',
          intro: 'Manage user-provided documents and reminder dates.',
          add: 'Add document',
          loading: 'Loading…',
          empty: 'No documents yet',
          emptyBody: 'Add registration, inspection, or insurance details to track expiry dates.',
          expired: 'expired',
          soon: 'expiring soon',
          expires: 'Expires',
          noExpiry: 'No expiry date',
          userProvided: 'User-provided information',
          expiredState: 'Expired',
          soonState: 'Expiring soon',
          valid: 'Valid',
          error: 'Unable to load documents.',
        };
  }
}
