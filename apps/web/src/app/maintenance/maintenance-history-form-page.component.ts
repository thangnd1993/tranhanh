import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { MaintenanceHistoryInput } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { maintenanceHistoryPath, maintenancePath } from '../i18n/routes';
import { MaintenanceService } from './maintenance.service';

@Component({
  selector: 'tn-maintenance-history-form-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective],
  template: `<section class="container section stack garage-form-wrap maintenance-detail">
    <a
      class="back-link"
      [routerLink]="maintenancePath(i18n.locale(), vehicleId)"
      >← {{ copy().back }}</a
    >
    <div>
      <p class="eyebrow">{{ copy().eyebrow }}</p>
      <h1>{{ editing ? copy().editTitle : copy().addTitle }}</h1>
      <p class="muted">{{ copy().intro }}</p>
    </div>
    @if (loading()) {
      <p
        class="muted"
        role="status"
      >
        {{ copy().loading }}
      </p>
    } @else {
      @if (error()) {
        <p
          class="form-error"
          role="alert"
        >
          {{ error() }}
        </p>
      }
      <form
        class="garage-form maintenance-form"
        [formGroup]="form"
        (ngSubmit)="save()"
      >
        <label
          >{{ copy().title
          }}<input
            formControlName="title"
            maxlength="150"
            required
        /></label>
        <label
          >{{ copy().category
          }}<input
            formControlName="category"
            maxlength="100"
            required
        /></label>
        <div class="form-pair">
          <label
            >{{ copy().date
            }}<input
              type="date"
              formControlName="serviceDate"
              required /></label
          ><label
            >{{ copy().odometer
            }}<input
              type="number"
              formControlName="odometerKm"
              min="0"
              max="10000000"
          /></label>
        </div>
        <label
          >{{ copy().cost
          }}<input
            inputmode="numeric"
            formControlName="totalCostVnd"
            pattern="^(0|[1-9][0-9]*)$"
          /><small class="muted">{{ copy().costHelp }}</small></label
        >
        <label
          >{{ copy().workshop
          }}<input
            formControlName="workshop"
            maxlength="200"
        /></label>
        <label
          >{{ copy().notes
          }}<textarea
            formControlName="notes"
            maxlength="1000"
            rows="4"
          ></textarea>
        </label>
        <div class="cluster">
          <button
            tnButton
            type="submit"
            [loading]="busy()"
            [disabled]="form.invalid"
          >
            {{ copy().save }}</button
          ><a
            tnButton
            variant="ghost"
            [routerLink]="maintenancePath(i18n.locale(), vehicleId)"
            >{{ copy().cancel }}</a
          >
        </div>
      </form>
    }
  </section>`,
  styleUrls: ['../garage/garage.scss', './maintenance.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceHistoryFormPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly maintenancePath = maintenancePath;
  private readonly route = inject(ActivatedRoute);
  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  private readonly historyId = this.route.snapshot.paramMap.get('historyId');
  protected readonly editing = !!this.historyId;
  private readonly service = inject(MaintenanceService);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly busy = signal(false);
  protected readonly loading = signal(!!this.historyId);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    serviceDate: new FormControl(this.today(), { nonNullable: true, validators: [Validators.required] }),
    odometerKm: new FormControl<number | null>(null, [Validators.min(0), Validators.max(10_000_000)]),
    totalCostVnd: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^(0|[1-9]\d*)$/)] }),
    workshop: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });
  ngOnInit() {
    if (this.browser && this.historyId) void this.load();
  }
  protected async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const input: MaintenanceHistoryInput = {
      title: value.title.trim(),
      category: value.category.trim(),
      serviceDate: value.serviceDate,
      odometerKm: value.odometerKm,
      totalCostVnd: value.totalCostVnd || null,
      workshop: value.workshop.trim() || null,
      notes: value.notes.trim() || null,
    };
    try {
      const item = this.historyId
        ? await this.service.updateHistory(this.vehicleId, this.historyId, input)
        : await this.service.createHistory(this.vehicleId, input);
      await this.router.navigateByUrl(maintenanceHistoryPath(this.i18n.locale(), this.vehicleId, item.id));
    } catch {
      this.error.set(this.copy().saveError);
    } finally {
      this.busy.set(false);
    }
  }
  private async load() {
    try {
      const item = await this.service.getHistory(this.vehicleId, this.historyId!);
      this.form.patchValue({
        title: item.title,
        category: item.category,
        serviceDate: item.serviceDate,
        odometerKm: item.odometerKm,
        totalCostVnd: item.totalCostVnd ?? '',
        workshop: item.workshop ?? '',
        notes: item.notes ?? '',
      });
    } catch {
      this.error.set(this.copy().loadError);
    } finally {
      this.loading.set(false);
    }
  }
  private today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  }
  protected copy() {
    return this.i18n.locale() === 'vi'
      ? {
          back: 'Quay lại bảo dưỡng',
          eyebrow: 'LỊCH SỬ RIÊNG TƯ',
          addTitle: 'Thêm lịch sử bảo dưỡng',
          editTitle: 'Sửa lịch sử bảo dưỡng',
          intro: 'Chi phí để trống nếu bạn không biết; 0 là chi phí chính xác bằng không.',
          loading: 'Đang tải…',
          title: 'Hạng mục',
          category: 'Danh mục',
          date: 'Ngày thực hiện',
          odometer: 'Công-tơ-mét (km, không bắt buộc)',
          cost: 'Tổng chi phí (VND, không bắt buộc)',
          costHelp: 'Giá trị được lưu chính xác bằng VND.',
          workshop: 'Xưởng / nơi làm',
          notes: 'Ghi chú',
          save: 'Lưu lịch sử',
          cancel: 'Hủy',
          saveError: 'Không thể lưu lịch sử.',
          loadError: 'Không thể tải lịch sử.',
        }
      : {
          back: 'Back to maintenance',
          eyebrow: 'PRIVATE HISTORY',
          addTitle: 'Add service history',
          editTitle: 'Edit service history',
          intro: 'Leave cost blank when unknown; 0 means an exact zero cost.',
          loading: 'Loading…',
          title: 'Service title',
          category: 'Category',
          date: 'Service date',
          odometer: 'Odometer (km, optional)',
          cost: 'Total cost (VND, optional)',
          costHelp: 'The exact VND value is stored.',
          workshop: 'Workshop / place',
          notes: 'Notes',
          save: 'Save history',
          cancel: 'Cancel',
          saveError: 'Unable to save history.',
          loadError: 'Unable to load history.',
        };
  }
}
