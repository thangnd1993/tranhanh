import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { FuelLogEntryInput, FuelLogProductKey } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { FieldComponent } from '../design-system/field.component';
import { LocaleService } from '../i18n/locale.service';
import { fuelLogPath } from '../i18n/routes';
import { FuelLogService } from './fuel-log.service';
@Component({
  selector: 'tn-fuel-log-form-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective, FieldComponent],
  templateUrl: './fuel-log-form-page.component.html',
  styleUrls: ['../garage/garage.scss', './fuel-log.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuelLogFormPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly fuelLogPath = fuelLogPath;
  private readonly route = inject(ActivatedRoute);
  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  private readonly entryId = this.route.snapshot.paramMap.get('entryId');
  private readonly service = inject(FuelLogService);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly busy = signal(false);
  protected readonly loading = signal(!!this.entryId);
  protected readonly error = signal('');
  protected readonly editing = !!this.entryId;
  protected readonly form = new FormGroup({
    refueledAt: new FormControl(this.localNow(), { nonNullable: true, validators: [Validators.required] }),
    odometerKm: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(10_000_000),
    ]),
    fuelProductKey: new FormControl<FuelLogProductKey | ''>(''),
    customFuelLabel: new FormControl(''),
    quantity: new FormControl('', [Validators.required, Validators.pattern(/^\d{1,7}(?:\.\d{1,3})?$/)]),
    totalCostVnd: new FormControl('', [Validators.required, Validators.pattern(/^[1-9]\d{0,15}$/)]),
    isFullTank: new FormControl(false, { nonNullable: true }),
    station: new FormControl(''),
    notes: new FormControl(''),
  });
  ngOnInit() {
    if (this.browser && this.entryId) void this.load();
  }
  protected preview() {
    const quantity = Number(this.form.controls.quantity.value);
    const cost = Number(this.form.controls.totalCostVnd.value);
    return quantity > 0 && Number.isSafeInteger(cost) ? Math.round(cost / quantity) : null;
  }
  private async load() {
    try {
      const item = await this.service.get(this.vehicleId, this.entryId!);
      const local = new Date(new Date(item.refueledAt).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
      this.form.patchValue({ ...item, refueledAt: local, fuelProductKey: item.fuelProductKey ?? '' });
    } catch {
      this.error.set(this.copy().loadError);
    } finally {
      this.loading.set(false);
    }
  }
  protected async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    const raw = this.form.getRawValue();
    const input: FuelLogEntryInput = {
      refueledAt: new Date(raw.refueledAt + ':00+07:00').toISOString(),
      odometerKm: raw.odometerKm!,
      quantity: raw.quantity!,
      totalCostVnd: raw.totalCostVnd!,
      fuelProductKey: raw.fuelProductKey || null,
      customFuelLabel: raw.fuelProductKey === 'OTHER' ? raw.customFuelLabel?.trim() || null : null,
      isFullTank: raw.isFullTank,
      station: raw.station?.trim() || null,
      notes: raw.notes?.trim() || null,
      unit: 'LITER',
    };
    try {
      if (this.entryId) await this.service.update(this.vehicleId, this.entryId, input);
      else await this.service.create(this.vehicleId, input);
      await this.router.navigateByUrl(fuelLogPath(this.i18n.locale(), this.vehicleId));
    } catch {
      this.error.set(this.copy().saveError);
    } finally {
      this.busy.set(false);
    }
  }
  private localNow() {
    return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
  }
  protected copy() {
    return this.i18n.locale() === 'vi'
      ? {
          back: 'Quay lại nhật ký',
          titleAdd: 'Thêm lần đổ nhiên liệu',
          titleEdit: 'Sửa lần đổ nhiên liệu',
          date: 'Ngày và giờ',
          odometer: 'Công-tơ-mét (km)',
          fuel: 'Loại nhiên liệu',
          choose: 'Không xác định',
          other: 'Khác',
          custom: 'Tên nhiên liệu',
          quantity: 'Số lít',
          cost: 'Tổng tiền (VND)',
          full: 'Đầy bình',
          fullHelp:
            'Đánh dấu “Đầy bình” khi bạn đổ đến cùng một mức đầy bình để hệ thống có thể tính mức tiêu thụ chính xác giữa các lần đổ.',
          station: 'Trạm / địa điểm (không bắt buộc)',
          notes: 'Ghi chú (không bắt buộc)',
          preview: 'Giá thực tế ước tính',
          submit: 'Lưu lần đổ',
          saving: 'Đang lưu…',
          invalid: 'Vui lòng kiểm tra các trường bắt buộc.',
          saveError: 'Không thể lưu. Kiểm tra thứ tự công-tơ-mét và thử lại.',
          loadError: 'Không thể tải lần đổ nhiên liệu.',
        }
      : {
          back: 'Back to fuel log',
          titleAdd: 'Add refueling',
          titleEdit: 'Edit refueling',
          date: 'Date and time',
          odometer: 'Odometer (km)',
          fuel: 'Fuel type',
          choose: 'Unspecified',
          other: 'Other',
          custom: 'Custom fuel name',
          quantity: 'Liters',
          cost: 'Total cost (VND)',
          full: 'Full tank',
          fullHelp:
            'Mark “Full tank” only when filling to a consistent full level so consumption can be calculated accurately.',
          station: 'Station / location (optional)',
          notes: 'Notes (optional)',
          preview: 'Estimated actual price',
          submit: 'Save refueling',
          saving: 'Saving…',
          invalid: 'Check the required fields.',
          saveError: 'Unable to save. Check odometer chronology and try again.',
          loadError: 'Unable to load the fuel entry.',
        };
  }
}
