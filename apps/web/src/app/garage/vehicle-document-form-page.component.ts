import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { VehicleDocumentInput, VehicleDocumentReminderOffset, VehicleDocumentType } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { documentPath } from '../i18n/routes';
import { VehicleDocumentService } from './vehicle-document.service';
@Component({
  selector: 'tn-vehicle-document-form-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective],
  template: ` <section class="container section stack garage-form-wrap documents-page">
    <a
      class="back-link"
      [routerLink]="documentPath(i18n.locale(), vehicleId)"
      >← {{ vi() ? 'Quay lại giấy tờ' : 'Back to documents' }}</a
    >
    <div>
      <p class="eyebrow">{{ vi() ? 'TÀI LIỆU RIÊNG TƯ' : 'PRIVATE DOCUMENT' }}</p>
      <h1>
        {{ documentId ? (vi() ? 'Chỉnh sửa giấy tờ' : 'Edit document') : vi() ? 'Thêm giấy tờ' : 'Add document' }}
      </h1>
      <p class="muted">
        {{
          vi()
            ? 'Nhập đúng theo giấy tờ bạn đang giữ. Dữ liệu này không được TraNhanh xác minh.'
            : 'Enter the details from the document you hold. TraNhanh does not verify this data.'
        }}
      </p>
    </div>
    @if (error()) {
      <p
        class="form-error"
        role="alert"
      >
        {{ error() }}
      </p>
    }
    <form
      class="garage-form"
      [formGroup]="form"
      (ngSubmit)="save()"
    >
      <label
        >{{ vi() ? 'Loại giấy tờ' : 'Document type'
        }}<select formControlName="type">
          @for (option of types; track option.value) {
            <option [value]="option.value">{{ vi() ? option.vi : option.en }}</option>
          }
        </select></label
      >
      <label
        >{{ vi() ? 'Tên hiển thị' : 'Display name'
        }}<input
          formControlName="displayName"
          maxlength="150"
          required
      /></label>
      <div class="form-pair">
        <label
          >{{ vi() ? 'Số giấy tờ' : 'Reference number'
          }}<input
            formControlName="referenceNumber"
            maxlength="150" /></label
        ><label
          >{{ vi() ? 'Cơ quan / đơn vị cấp' : 'Issuer'
          }}<input
            formControlName="issuer"
            maxlength="200"
        /></label>
      </div>
      <div class="form-pair">
        <label
          >{{ vi() ? 'Ngày cấp' : 'Issue date'
          }}<input
            type="date"
            formControlName="issuedAt" /></label
        ><label
          >{{ vi() ? 'Có hiệu lực từ' : 'Effective from'
          }}<input
            type="date"
            formControlName="effectiveFrom"
        /></label>
      </div>
      <label
        >{{ vi() ? 'Ngày hết hạn' : 'Expiry date'
        }}<input
          type="date"
          formControlName="expiresAt"
      /></label>
      <fieldset class="reminder-fieldset">
        <legend>{{ vi() ? 'Nhắc trước ngày hết hạn' : 'Remind before expiry' }}</legend>
        <div class="cluster">
          @for (day of offsets; track day) {
            <label class="archive-toggle"
              ><input
                type="checkbox"
                [checked]="selected().includes(day)"
                (change)="toggle(day, $event)"
              />
              {{ day }} {{ vi() ? 'ngày' : 'days' }}</label
            >
          }
        </div>
      </fieldset>
      <label
        >{{ vi() ? 'Ghi chú' : 'Notes'
        }}<textarea
          formControlName="notes"
          maxlength="1000"
          rows="4"
        ></textarea>
      </label>
      <p class="monitoring-notice">
        {{
          vi()
            ? 'Ngày tháng được lưu theo ngày tại Việt Nam, không bị thay đổi do múi giờ.'
            : 'Dates are stored as Vietnam calendar dates and do not shift with time zones.'
        }}
      </p>
      <div class="cluster">
        <button
          tnButton
          type="submit"
          [loading]="saving()"
          [disabled]="form.invalid"
        >
          {{ vi() ? 'Lưu giấy tờ' : 'Save document' }}</button
        ><a
          tnButton
          variant="ghost"
          [routerLink]="documentPath(i18n.locale(), vehicleId)"
          >{{ vi() ? 'Hủy' : 'Cancel' }}</a
        >
      </div>
    </form>
  </section>`,
  styleUrls: ['./garage.scss', './vehicle-documents.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleDocumentFormPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  protected readonly documentPath = documentPath;
  private readonly route = inject(ActivatedRoute);
  protected readonly vehicleId = this.route.snapshot.paramMap.get('id')!;
  protected readonly documentId = this.route.snapshot.paramMap.get('documentId');
  private readonly service = inject(VehicleDocumentService);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly fb = inject(FormBuilder);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly selected = signal<VehicleDocumentReminderOffset[]>([]);
  protected readonly offsets = [30, 15, 7, 1] as const;
  protected readonly types = [
    { value: 'VEHICLE_REGISTRATION', vi: 'Đăng ký xe', en: 'Vehicle registration' },
    { value: 'PERIODIC_INSPECTION', vi: 'Đăng kiểm định kỳ', en: 'Periodic inspection' },
    {
      value: 'COMPULSORY_CIVIL_LIABILITY_INSURANCE',
      vi: 'Bảo hiểm TNDS bắt buộc',
      en: 'Compulsory liability insurance',
    },
    { value: 'VOLUNTARY_VEHICLE_INSURANCE', vi: 'Bảo hiểm tự nguyện', en: 'Voluntary insurance' },
    { value: 'ROAD_USE_FEE', vi: 'Phí sử dụng đường bộ', en: 'Road use fee' },
    { value: 'OTHER', vi: 'Khác', en: 'Other' },
  ] as const;
  protected readonly form = this.fb.nonNullable.group({
    type: 'VEHICLE_REGISTRATION',
    displayName: ['', [Validators.required, Validators.maxLength(150)]],
    referenceNumber: '',
    issuer: '',
    issuedAt: '',
    effectiveFrom: '',
    expiresAt: '',
    notes: '',
  });
  ngOnInit() {
    if (this.browser && this.documentId) void this.load();
  }
  protected vi() {
    return this.i18n.locale() === 'vi';
  }
  protected toggle(day: VehicleDocumentReminderOffset, event: Event) {
    const enabled = (event.target as HTMLInputElement).checked;
    this.selected.update((v) => (enabled ? [...v, day] : v.filter((x) => x !== day)));
  }
  private async load() {
    try {
      const d = await this.service.get(this.vehicleId, this.documentId!);
      this.form.patchValue({
        type: d.type,
        displayName: d.displayName,
        referenceNumber: d.referenceNumber ?? '',
        issuer: d.issuer ?? '',
        issuedAt: d.issuedAt ?? '',
        effectiveFrom: d.effectiveFrom ?? '',
        expiresAt: d.expiresAt ?? '',
        notes: d.notes ?? '',
      });
      this.selected.set(d.reminders.filter((r) => r.enabled).map((r) => r.daysBefore));
    } catch {
      this.error.set(this.vi() ? 'Không thể tải giấy tờ.' : 'Unable to load document.');
    }
  }
  protected async save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const input: VehicleDocumentInput = {
      type: v.type as VehicleDocumentType,
      displayName: v.displayName,
      referenceNumber: v.referenceNumber || null,
      issuer: v.issuer || null,
      issuedAt: v.issuedAt || null,
      effectiveFrom: v.effectiveFrom || null,
      expiresAt: v.expiresAt || null,
      notes: v.notes || null,
      reminderDaysBefore: this.selected(),
    };
    try {
      const saved = this.documentId
        ? await this.service.update(this.vehicleId, this.documentId, input)
        : await this.service.create(this.vehicleId, input);
      await this.router.navigateByUrl(documentPath(this.i18n.locale(), this.vehicleId, saved.id));
    } catch {
      this.error.set(
        this.vi() ? 'Không thể lưu. Hãy kiểm tra ngày và thử lại.' : 'Unable to save. Check the dates and try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
