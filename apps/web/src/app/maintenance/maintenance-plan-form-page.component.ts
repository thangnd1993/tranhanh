import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { MaintenancePlanInput } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { maintenancePath, maintenancePlanPath } from '../i18n/routes';
import { MaintenanceService } from './maintenance.service';

@Component({
  selector: 'tn-maintenance-plan-form-page',
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
        <div class="form-pair">
          <label
            >{{ copy().dueDate
            }}<input
              type="date"
              formControlName="dueDate" /></label
          ><label
            >{{ copy().dueOdometer
            }}<input
              type="number"
              formControlName="dueOdometerKm"
              min="0"
              max="10000000"
          /></label>
        </div>
        <p class="muted">{{ copy().thresholdHelp }}</p>
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
export class MaintenancePlanFormPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly maintenancePath = maintenancePath;
  private readonly route = inject(ActivatedRoute);
  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  private readonly planId = this.route.snapshot.paramMap.get('planId');
  protected readonly editing = !!this.planId;
  private readonly service = inject(MaintenanceService);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly busy = signal(false);
  protected readonly loading = signal(!!this.planId);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    dueDate: new FormControl('', { nonNullable: true }),
    dueOdometerKm: new FormControl<number | null>(null, [Validators.min(0), Validators.max(10_000_000)]),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });
  ngOnInit() {
    if (this.browser && this.planId) void this.load();
  }
  protected async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (!v.dueDate && v.dueOdometerKm === null) {
      this.error.set(this.copy().thresholdError);
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const input: MaintenancePlanInput = {
      title: v.title.trim(),
      dueDate: v.dueDate || null,
      dueOdometerKm: v.dueOdometerKm,
      notes: v.notes.trim() || null,
    };
    try {
      const item = this.planId
        ? await this.service.updatePlan(this.vehicleId, this.planId, input)
        : await this.service.createPlan(this.vehicleId, input);
      await this.router.navigateByUrl(maintenancePlanPath(this.i18n.locale(), this.vehicleId, item.id));
    } catch {
      this.error.set(this.copy().saveError);
    } finally {
      this.busy.set(false);
    }
  }
  private async load() {
    try {
      const item = await this.service.getPlan(this.vehicleId, this.planId!);
      this.form.patchValue({
        title: item.title,
        dueDate: item.dueDate ?? '',
        dueOdometerKm: item.dueOdometerKm,
        notes: item.notes ?? '',
      });
    } catch {
      this.error.set(this.copy().loadError);
    } finally {
      this.loading.set(false);
    }
  }
  protected copy() {
    return this.i18n.locale() === 'vi'
      ? {
          back: 'Quay lại bảo dưỡng',
          eyebrow: 'KẾ HOẠCH RIÊNG TƯ',
          addTitle: 'Thêm kế hoạch bảo dưỡng',
          editTitle: 'Sửa kế hoạch bảo dưỡng',
          intro: 'Kế hoạch do bạn đặt, không phải lịch khuyến nghị của nhà sản xuất.',
          loading: 'Đang tải…',
          title: 'Tên kế hoạch',
          dueDate: 'Ngày đến hạn (không bắt buộc)',
          dueOdometer: 'Công-tơ-mét đến hạn (không bắt buộc)',
          thresholdHelp: 'Cần nhập ít nhất ngày hoặc công-tơ-mét. Chạm ngưỡng nào trước thì kế hoạch đến hạn.',
          notes: 'Ghi chú',
          save: 'Lưu kế hoạch',
          cancel: 'Hủy',
          thresholdError: 'Hãy nhập ngày hoặc công-tơ-mét đến hạn.',
          saveError: 'Không thể lưu kế hoạch.',
          loadError: 'Không thể tải kế hoạch.',
        }
      : {
          back: 'Back to maintenance',
          eyebrow: 'PRIVATE PLAN',
          addTitle: 'Add maintenance plan',
          editTitle: 'Edit maintenance plan',
          intro: 'Plans are user-defined and do not claim manufacturer intervals.',
          loading: 'Loading…',
          title: 'Plan title',
          dueDate: 'Due date (optional)',
          dueOdometer: 'Due odometer (optional)',
          thresholdHelp: 'Enter at least a date or odometer. Whichever threshold is reached first makes the plan due.',
          notes: 'Notes',
          save: 'Save plan',
          cancel: 'Cancel',
          thresholdError: 'Enter a due date or odometer threshold.',
          saveError: 'Unable to save plan.',
          loadError: 'Unable to load plan.',
        };
  }
}
