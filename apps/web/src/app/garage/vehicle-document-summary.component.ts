import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { VehicleDocumentListResult } from '@tranhanh/shared';
import { LocaleService } from '../i18n/locale.service';
import { documentPath } from '../i18n/routes';
import { VehicleDocumentService } from './vehicle-document.service';
@Component({
  selector: 'tn-vehicle-document-summary',
  imports: [RouterLink],
  template: ` <section class="monitoring-panel stack">
    <div class="monitoring-heading">
      <div>
        <p class="eyebrow">{{ vi() ? 'GIẤY TỜ XE' : 'VEHICLE DOCUMENTS' }}</p>
        <h2>{{ vi() ? 'Giấy tờ và thời hạn' : 'Documents and expiry dates' }}</h2>
      </div>
      <a [routerLink]="documentPath(i18n.locale(), vehicleId())">{{ vi() ? 'Quản lý giấy tờ' : 'Manage documents' }}</a>
    </div>
    @if (data(); as d) {
      <div class="document-summary">
        <span
          ><strong>{{ d.items.length }}</strong> {{ vi() ? 'giấy tờ' : 'documents' }}</span
        ><span
          ><strong>{{ d.attention.expired }}</strong> {{ vi() ? 'đã hết hạn' : 'expired' }}</span
        ><span
          ><strong>{{ d.attention.expiringSoon }}</strong> {{ vi() ? 'sắp hết hạn' : 'expiring soon' }}</span
        >
      </div>
    } @else {
      <p class="muted">{{ vi() ? 'Chưa có thông tin giấy tờ.' : 'No document information yet.' }}</p>
    }
    <p class="monitoring-notice">
      {{
        vi()
          ? 'Thông tin do bạn tự cung cấp; TraNhanh không xác minh tình trạng pháp lý.'
          : 'This information is user-provided; TraNhanh does not verify legal status.'
      }}
    </p>
  </section>`,
  styleUrls: ['./garage.scss', './vehicle-documents.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDocumentSummaryComponent implements OnInit {
  readonly vehicleId = input.required<string>();
  protected readonly i18n = inject(LocaleService);
  protected readonly documentPath = documentPath;
  private readonly service = inject(VehicleDocumentService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly data = signal<VehicleDocumentListResult | null>(null);
  ngOnInit() {
    if (this.browser)
      void this.service
        .list(this.vehicleId())
        .then((value) => this.data.set(value))
        .catch(() => undefined);
  }
  protected vi() {
    return this.i18n.locale() === 'vi';
  }
}
