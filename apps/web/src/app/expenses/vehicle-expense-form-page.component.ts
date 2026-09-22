import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { VehicleExpenseCategory, VehicleExpenseInput } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { expensePath } from '../i18n/routes';
import { VehicleExpenseService } from './vehicle-expense.service';

@Component({
  selector: 'tn-vehicle-expense-form-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective],
  template: `<section class="container section stack garage-form-wrap expense-form-page">
    <a
      class="back-link"
      [routerLink]="expensePath(i18n.locale(), vehicleId)"
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
        class="expense-form"
        [formGroup]="form"
        (ngSubmit)="save()"
      >
        <label
          >{{ copy().category }}
          <select
            formControlName="category"
            required
          >
            @for (category of categories; track category) {
              <option [value]="category">{{ categoryLabel(category) }}</option>
            }
          </select>
        </label>
        <label
          >{{ copy().title }}
          <input
            formControlName="title"
            maxlength="150"
            required
          />
        </label>
        <div class="form-pair">
          <label
            >{{ copy().date }}
            <input
              type="date"
              formControlName="expenseDate"
              required
            />
          </label>
          <label
            >{{ copy().cost }}
            <input
              inputmode="numeric"
              formControlName="totalCostVnd"
              maxlength="16"
              pattern="^(0|[1-9][0-9]{0,15})$"
              required
            />
          </label>
        </div>
        <small class="muted">{{ copy().costHelp }}</small>
        <label
          >{{ copy().notes }}
          <textarea
            formControlName="notes"
            maxlength="1000"
            rows="4"
          ></textarea>
        </label>
        <div class="form-actions">
          <button
            tnButton
            type="submit"
            [loading]="busy()"
            [disabled]="form.invalid"
          >
            {{ copy().save }}
          </button>
          <a
            tnButton
            variant="ghost"
            [routerLink]="expensePath(i18n.locale(), vehicleId)"
            >{{ copy().cancel }}</a
          >
        </div>
      </form>
    }
  </section>`,
  styleUrls: ['../garage/garage.scss', './vehicle-expenses.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleExpenseFormPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly expensePath = expensePath;
  protected readonly vehicleId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  private readonly expenseId = inject(ActivatedRoute).snapshot.paramMap.get('expenseId');
  protected readonly editing = !!this.expenseId;
  private readonly service = inject(VehicleExpenseService);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly categories: VehicleExpenseCategory[] = ['INSURANCE', 'REGISTRATION', 'TOLL', 'PARKING', 'OTHER'];
  protected readonly busy = signal(false);
  protected readonly loading = signal(!!this.expenseId);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    category: new FormControl<VehicleExpenseCategory>('OTHER', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    expenseDate: new FormControl(this.today(), { nonNullable: true, validators: [Validators.required] }),
    totalCostVnd: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(?:0|[1-9]\d{0,15})$/)],
    }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
  });

  ngOnInit() {
    if (this.browser && this.expenseId) void this.load();
  }

  protected async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const input: VehicleExpenseInput = {
      category: value.category,
      title: value.title.trim(),
      expenseDate: value.expenseDate,
      totalCostVnd: value.totalCostVnd,
      notes: value.notes.trim() || null,
    };
    try {
      const item = this.expenseId
        ? await this.service.update(this.vehicleId, this.expenseId, input)
        : await this.service.create(this.vehicleId, input);
      await this.router.navigateByUrl(expensePath(this.i18n.locale(), this.vehicleId, item.id));
    } catch {
      this.error.set(this.copy().saveError);
    } finally {
      this.busy.set(false);
    }
  }

  protected categoryLabel(category: VehicleExpenseCategory) {
    const labels =
      this.i18n.locale() === 'vi'
        ? { INSURANCE: 'Bảo hiểm', REGISTRATION: 'Đăng ký', TOLL: 'Trạm thu phí', PARKING: 'Đỗ xe', OTHER: 'Khác' }
        : { INSURANCE: 'Insurance', REGISTRATION: 'Registration', TOLL: 'Toll', PARKING: 'Parking', OTHER: 'Other' };
    return labels[category];
  }

  private async load() {
    try {
      const item = await this.service.get(this.vehicleId, this.expenseId!);
      this.form.patchValue({
        category: item.category,
        title: item.title,
        expenseDate: item.expenseDate,
        totalCostVnd: item.totalCostVnd,
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
          back: 'Quay lại sổ chi phí',
          eyebrow: 'KHOẢN CHI RIÊNG TƯ',
          addTitle: 'Thêm chi phí',
          editTitle: 'Sửa chi phí',
          intro:
            'Chỉ nhập bảo hiểm, đăng ký, trạm thu phí, đỗ xe hoặc khoản khác. Nhiên liệu và bảo dưỡng lấy từ sổ gốc.',
          loading: 'Đang tải…',
          category: 'Nhóm',
          title: 'Tên khoản chi',
          date: 'Ngày',
          cost: 'Chi phí (VND)',
          costHelp: 'Số nguyên VND từ 0 đến 9999999999999999; giá trị được lưu chính xác.',
          notes: 'Ghi chú (không bắt buộc)',
          save: 'Lưu chi phí',
          cancel: 'Hủy',
          saveError: 'Không thể lưu chi phí.',
          loadError: 'Không thể tải khoản chi.',
        }
      : {
          back: 'Back to expense ledger',
          eyebrow: 'PRIVATE MANUAL ENTRY',
          addTitle: 'Add expense',
          editTitle: 'Edit expense',
          intro:
            'Enter insurance, registration, toll, parking or another expense. Fuel and maintenance come from their source logs.',
          loading: 'Loading…',
          category: 'Category',
          title: 'Expense title',
          date: 'Date',
          cost: 'Cost (VND)',
          costHelp: 'Integer VND from 0 to 9999999999999999; stored exactly.',
          notes: 'Notes (optional)',
          save: 'Save expense',
          cancel: 'Cancel',
          saveError: 'Unable to save the expense.',
          loadError: 'Unable to load the expense.',
        };
  }
}
