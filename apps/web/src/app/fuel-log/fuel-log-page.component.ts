import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { FuelLogEntryResult, FuelLogListResult, FuelLogSummary } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { fuelLogPath, garagePath } from '../i18n/routes';
import { FuelLogService } from './fuel-log.service';
@Component({
  selector: 'tn-fuel-log-page',
  imports: [RouterLink, ButtonDirective],
  templateUrl: './fuel-log-page.component.html',
  styleUrls: ['../garage/garage.scss', './fuel-log.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuelLogPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly garagePath = garagePath;
  protected readonly fuelLogPath = fuelLogPath;
  protected readonly vehicleId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  private readonly service = inject(FuelLogService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly data = signal<FuelLogListResult | null>(null);
  protected readonly summary = signal<FuelLogSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly showArchived = signal(false);
  ngOnInit() {
    if (this.browser) void this.load();
  }
  protected async toggle(event: Event) {
    this.showArchived.set((event.target as HTMLInputElement).checked);
    await this.load();
  }
  protected formatDate(value: string) {
    return new Intl.DateTimeFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(value));
  }
  protected money(value: string | null) {
    if (value === null) return '—';
    return new Intl.NumberFormat(this.i18n.locale() === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(BigInt(value));
  }
  protected fuel(item: FuelLogEntryResult) {
    return item.customFuelLabel || item.fuelProductKey || this.copy().unspecified;
  }
  protected async archive(item: FuelLogEntryResult) {
    if (!confirm(this.copy().archiveConfirm)) return;
    await this.changeStatus(item, 'archive');
  }
  protected async restore(item: FuelLogEntryResult) {
    await this.changeStatus(item, 'restore');
  }
  private async changeStatus(item: FuelLogEntryResult, action: 'archive' | 'restore') {
    try {
      await this.service.lifecycle(this.vehicleId, item.id, action);
      await this.load();
    } catch {
      this.error.set(this.copy().error);
    }
  }
  private async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [data, summary] = await Promise.all([
        this.service.list(this.vehicleId, this.showArchived() ? 'ALL' : 'ACTIVE'),
        this.service.summary(this.vehicleId),
      ]);
      this.data.set(data);
      this.summary.set(summary);
    } catch {
      this.error.set(this.copy().error);
    } finally {
      this.loading.set(false);
    }
  }
  protected copy() {
    return this.i18n.locale() === 'vi'
      ? {
          back: 'Quay lại xe',
          eyebrow: 'DỮ LIỆU RIÊNG TƯ',
          title: 'Nhật ký nhiên liệu',
          intro: 'Theo dõi lượng nhiên liệu, chi phí và mức tiêu thụ bằng phương pháp đầy bình.',
          add: 'Thêm lần đổ nhiên liệu',
          loading: 'Đang tải…',
          error: 'Không thể tải nhật ký nhiên liệu.',
          empty: 'Chưa có lần đổ nhiên liệu nào.',
          emptyBody: 'Thêm lần đổ đầu tiên để bắt đầu theo dõi.',
          monthCost: 'Chi phí tháng này',
          monthFuel: 'Nhiên liệu tháng này',
          economy: 'Mức tiêu thụ trung bình',
          costKm: 'Chi phí nhiên liệu/km',
          insufficient: 'Chưa đủ dữ liệu để tính mức tiêu thụ.',
          full: 'Đầy bình',
          partial: 'Đổ một phần',
          odometer: 'Công-tơ-mét',
          actualPrice: 'Giá thực tế/lít',
          edit: 'Sửa',
          archive: 'Lưu trữ',
          restore: 'Khôi phục',
          archived: 'Đã lưu trữ',
          showArchived: 'Hiện bản ghi đã lưu trữ',
          unspecified: 'Không xác định',
          archiveConfirm: 'Bản ghi lưu trữ sẽ bị loại khỏi mọi phép tính. Tiếp tục?',
        }
      : {
          back: 'Back to vehicle',
          eyebrow: 'PRIVATE DATA',
          title: 'Fuel log',
          intro: 'Track fuel volume, spending and full-tank fuel economy.',
          add: 'Add refueling',
          loading: 'Loading…',
          error: 'Unable to load the fuel log.',
          empty: 'No refueling entries yet.',
          emptyBody: 'Add the first entry to begin tracking.',
          monthCost: 'Cost this month',
          monthFuel: 'Fuel this month',
          economy: 'Average consumption',
          costKm: 'Fuel cost/km',
          insufficient: 'Not enough data to calculate fuel economy.',
          full: 'Full tank',
          partial: 'Partial fill',
          odometer: 'Odometer',
          actualPrice: 'Actual price/liter',
          edit: 'Edit',
          archive: 'Archive',
          restore: 'Restore',
          archived: 'Archived',
          showArchived: 'Show archived records',
          unspecified: 'Unspecified',
          archiveConfirm: 'Archived records are excluded from calculations. Continue?',
        };
  }
}
