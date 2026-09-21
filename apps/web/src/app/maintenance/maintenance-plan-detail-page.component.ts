import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { MaintenancePlanResult } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { maintenancePath, maintenancePlanPath } from '../i18n/routes';
import { MaintenanceService } from './maintenance.service';

@Component({
  selector: 'tn-maintenance-plan-detail-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective],
  template: `<section class="container section stack garage-form-wrap maintenance-detail">
    <a
      class="back-link"
      [routerLink]="maintenancePath(i18n.locale(), vehicleId)"
      >← {{ copy().back }}</a
    >
    @if (loading()) {
      <p
        class="muted"
        role="status"
      >
        {{ copy().loading }}
      </p>
    } @else if (error()) {
      <div
        class="feedback feedback--error stack"
        role="alert"
      >
        <p>{{ error() }}</p>
        <button
          tnButton
          variant="secondary"
          type="button"
          (click)="load()"
        >
          {{ copy().retry }}
        </button>
      </div>
    } @else if (item(); as p) {
      <header class="garage-heading">
        <div>
          <p class="eyebrow">{{ state() }}</p>
          <h1>{{ p.title }}</h1>
          <p class="muted">{{ dueText(p) }}</p>
        </div>
        <div class="cluster">
          @if (p.status !== 'COMPLETED' && !p.completionHistoryId) {
            <a
              tnButton
              variant="secondary"
              [routerLink]="maintenancePlanPath(i18n.locale(), vehicleId, p.id, 'edit')"
              >{{ copy().edit }}</a
            >
          }
        </div>
      </header>
      <dl class="vehicle-facts">
        <div>
          <dt>{{ copy().dueDate }}</dt>
          <dd>{{ p.dueDate || '—' }}</dd>
        </div>
        <div>
          <dt>{{ copy().dueOdometer }}</dt>
          <dd>{{ p.dueOdometerKm === null ? '—' : p.dueOdometerKm.toLocaleString() + ' km' }}</dd>
        </div>
        <div>
          <dt>{{ copy().currentOdometer }}</dt>
          <dd>
            {{ p.currentOdometerKm === null ? copy().unknownMileage : p.currentOdometerKm.toLocaleString() + ' km' }}
          </dd>
        </div>
        <div>
          <dt>{{ copy().notes }}</dt>
          <dd>{{ p.notes || '—' }}</dd>
        </div>
      </dl>
      @if (p.status === 'ACTIVE') {
        <section class="maintenance-section stack">
          <h2>{{ copy().completeTitle }}</h2>
          <p class="muted">{{ copy().completeHelp }}</p>
          <form
            class="garage-form maintenance-form"
            [formGroup]="completeForm"
            (ngSubmit)="complete()"
          >
            <div class="form-pair">
              <label
                >{{ copy().serviceDate
                }}<input
                  type="date"
                  formControlName="serviceDate"
                  required /></label
              ><label
                >{{ copy().category
                }}<input
                  formControlName="category"
                  maxlength="100"
                  required
              /></label>
            </div>
            <div class="form-pair">
              <label
                >{{ copy().odometer
                }}<input
                  type="number"
                  formControlName="odometerKm"
                  min="0"
                  max="10000000" /></label
              ><label
                >{{ copy().cost
                }}<input
                  inputmode="numeric"
                  formControlName="totalCostVnd"
                  pattern="^(0|[1-9][0-9]*)$"
              /></label>
            </div>
            <label
              >{{ copy().workshop
              }}<input
                formControlName="workshop"
                maxlength="200" /></label
            ><label
              >{{ copy().notes
              }}<textarea
                formControlName="notes"
                maxlength="1000"
                rows="3"
              ></textarea></label
            ><button
              tnButton
              type="submit"
              [loading]="busy()"
              [disabled]="completeForm.invalid"
            >
              {{ copy().complete }}
            </button>
          </form>
        </section>
      }
      @if (p.status !== 'ARCHIVED') {
        <div class="cluster">
          <button
            tnButton
            variant="ghost"
            type="button"
            (click)="archive()"
          >
            {{ copy().archive }}
          </button>
        </div>
      } @else {
        <div class="cluster">
          <button
            tnButton
            variant="secondary"
            type="button"
            [loading]="busy()"
            (click)="restore()"
          >
            {{ copy().restore }}
          </button>
        </div>
      }
    }
  </section>`,
  styleUrls: ['../garage/garage.scss', './maintenance.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePlanDetailPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly maintenancePath = maintenancePath;
  protected readonly maintenancePlanPath = maintenancePlanPath;
  private readonly route = inject(ActivatedRoute);
  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  private readonly planId = this.route.snapshot.paramMap.get('planId')!;
  private readonly service = inject(MaintenanceService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly item = signal<MaintenancePlanResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly completeForm = new FormGroup({
    serviceDate: new FormControl(this.today(), { nonNullable: true, validators: [Validators.required] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    odometerKm: new FormControl<number | null>(null, [Validators.min(0), Validators.max(10_000_000)]),
    totalCostVnd: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^(0|[1-9]\d*)$/)] }),
    workshop: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });
  ngOnInit() {
    if (this.browser) void this.load();
  }
  protected async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.item.set(await this.service.getPlan(this.vehicleId, this.planId));
    } catch {
      this.error.set(this.copy().error);
    } finally {
      this.loading.set(false);
    }
  }
  protected async complete() {
    this.completeForm.markAllAsTouched();
    if (this.completeForm.invalid) return;
    if (!confirm(this.copy().completeConfirm)) return;
    this.busy.set(true);
    this.error.set('');
    const v = this.completeForm.getRawValue();
    try {
      const result = await this.service.completePlan(this.vehicleId, this.planId, {
        serviceDate: v.serviceDate,
        category: v.category.trim(),
        odometerKm: v.odometerKm,
        totalCostVnd: v.totalCostVnd || null,
        workshop: v.workshop.trim() || null,
        notes: v.notes.trim() || null,
      });
      this.item.set(result.plan);
    } catch {
      this.error.set(this.copy().completeError);
    } finally {
      this.busy.set(false);
    }
  }
  protected async archive() {
    if (!confirm(this.copy().archiveConfirm)) return;
    await this.change('archive');
  }
  protected async restore() {
    await this.change('restore');
  }
  private async change(action: 'archive' | 'restore') {
    this.busy.set(true);
    this.error.set('');
    try {
      this.item.set(await this.service.planLifecycle(this.vehicleId, this.planId, action));
    } catch {
      this.error.set(this.copy().error);
    } finally {
      this.busy.set(false);
    }
  }
  protected state() {
    const p = this.item();
    const c = this.copy();
    if (!p) return '';
    return p.status === 'ARCHIVED'
      ? c.archived
      : p.status === 'COMPLETED'
        ? c.completed
        : p.dueStatus === 'DUE'
          ? c.due
          : p.dueStatus === 'DUE_SOON'
            ? c.dueSoon
            : p.dueStatus === 'UNKNOWN_MILEAGE'
              ? c.unknownMileage
              : c.notDue;
  }
  protected dueText(p: MaintenancePlanResult) {
    const c = this.copy();
    return p.status !== 'ACTIVE'
      ? p.status === 'COMPLETED'
        ? c.completed
        : c.archived
      : p.dueStatus === 'UNKNOWN_MILEAGE'
        ? c.unknownMileage
        : p.dueDate
          ? c.dueDate + ': ' + p.dueDate
          : c.dueOdometer + ': ' + p.dueOdometerKm + ' km';
  }
  private today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  }
  protected copy() {
    return this.i18n.locale() === 'vi'
      ? {
          back: 'Quay lại bảo dưỡng',
          loading: 'Đang tải…',
          retry: 'Thử lại',
          error: 'Không thể tải kế hoạch.',
          edit: 'Chỉnh sửa',
          dueDate: 'Ngày đến hạn',
          dueOdometer: 'Công-tơ-mét đến hạn',
          currentOdometer: 'Công-tơ-mét hiện tại',
          unknownMileage: 'Chưa biết công-tơ-mét',
          notes: 'Ghi chú',
          completeTitle: 'Ghi nhận đã làm',
          completeHelp: 'Thao tác này tạo đúng một lịch sử và đánh dấu kế hoạch hoàn tất.',
          serviceDate: 'Ngày thực hiện',
          category: 'Danh mục',
          odometer: 'Công-tơ-mét (không bắt buộc)',
          cost: 'Chi phí (không bắt buộc)',
          workshop: 'Xưởng / nơi làm',
          completeNotes: 'Ghi chú',
          complete: 'Hoàn tất kế hoạch',
          completed: 'Đã hoàn tất',
          archived: 'Đã lưu trữ',
          archive: 'Lưu trữ',
          restore: 'Khôi phục',
          due: 'Đến hạn',
          dueSoon: 'Sắp đến hạn',
          notDue: 'Chưa đến hạn',
          completeConfirm: 'Đánh dấu kế hoạch đã làm và tạo lịch sử?',
          completeError: 'Không thể hoàn tất kế hoạch; chưa có thay đổi nào được lưu.',
          archiveConfirm: 'Lưu trữ kế hoạch này?',
        }
      : {
          back: 'Back to maintenance',
          loading: 'Loading…',
          retry: 'Retry',
          error: 'Unable to load plan.',
          edit: 'Edit',
          dueDate: 'Due date',
          dueOdometer: 'Due odometer',
          currentOdometer: 'Current odometer',
          unknownMileage: 'Mileage unknown',
          notes: 'Notes',
          completeTitle: 'Record completion',
          completeHelp: 'This creates exactly one history record and marks the plan completed.',
          serviceDate: 'Service date',
          category: 'Category',
          odometer: 'Odometer (optional)',
          cost: 'Cost (optional)',
          workshop: 'Workshop / place',
          completeNotes: 'Notes',
          complete: 'Complete plan',
          completed: 'Completed',
          archived: 'Archived',
          archive: 'Archive',
          restore: 'Restore',
          due: 'Due',
          dueSoon: 'Due soon',
          notDue: 'Not due',
          completeConfirm: 'Mark this plan complete and create its history?',
          completeError: 'Unable to complete the plan; no change was saved.',
          archiveConfirm: 'Archive this plan?',
        };
  }
}
