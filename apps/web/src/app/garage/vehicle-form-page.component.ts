import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { VehicleInput, VehicleType } from '@tranhanh/shared';
import { AuthService } from '../auth/auth.service';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { garagePath, pagePaths } from '../i18n/routes';
import { GarageService } from './garage.service';

@Component({
  selector: 'tn-vehicle-form-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective],
  template: `<section class="container section garage-form-wrap stack">
    <div>
      <p class="eyebrow">{{ i18n.t('garage.private') }}</p>
      <h1>{{ i18n.t(editing ? 'garage.editTitle' : 'garage.addTitle') }}</h1>
      <p class="muted">{{ i18n.t('garage.formIntro') }}</p>
    </div>
    @if (loading()) {
      <p
        role="status"
        class="muted"
      >
        {{ i18n.t('common.loading') }}
      </p>
    } @else {
      <form
        class="garage-form"
        [formGroup]="form"
        (ngSubmit)="submit()"
      >
        <label
          >{{ i18n.t('garage.plate')
          }}<input
            class="control"
            autocomplete="off"
            formControlName="licensePlate"
            placeholder="51K-123.45"
        /></label>
        <label
          >{{ i18n.t('garage.displayName')
          }}<input
            class="control"
            formControlName="displayName"
        /></label>
        <label
          >{{ i18n.t('garage.type')
          }}<select
            class="control"
            formControlName="vehicleType"
          >
            <option value="CAR">{{ i18n.t('garage.type.CAR') }}</option>
            <option value="MOTORCYCLE">{{ i18n.t('garage.type.MOTORCYCLE') }}</option>
            <option value="TRUCK">{{ i18n.t('garage.type.TRUCK') }}</option>
            <option value="VAN">{{ i18n.t('garage.type.VAN') }}</option>
            <option value="OTHER">{{ i18n.t('garage.type.OTHER') }}</option>
          </select></label
        >
        <div class="form-pair">
          <label
            >{{ i18n.t('garage.make')
            }}<input
              class="control"
              formControlName="make" /></label
          ><label
            >{{ i18n.t('garage.model')
            }}<input
              class="control"
              formControlName="model"
          /></label>
        </div>
        <div class="form-pair">
          <label
            >{{ i18n.t('garage.year')
            }}<input
              class="control"
              type="number"
              inputmode="numeric"
              formControlName="modelYear" /></label
          ><label
            >{{ i18n.t('garage.odometer')
            }}<input
              class="control"
              type="number"
              inputmode="numeric"
              formControlName="currentOdometerKm"
          /></label>
        </div>
        <label
          >{{ i18n.t('garage.notes')
          }}<textarea
            class="control"
            rows="4"
            formControlName="notes"
          ></textarea>
        </label>
        @if (editing) {
          <label class="archive-toggle"
            ><input
              type="checkbox"
              formControlName="allowOdometerCorrection"
            />
            {{ i18n.t('garage.odometerCorrection') }}</label
          >
        }
        @if (error()) {
          <p
            class="form-error"
            role="alert"
          >
            {{ error() }}
          </p>
        }
        <div class="cluster">
          <button
            tnButton
            type="submit"
            [loading]="busy()"
          >
            {{ i18n.t('garage.save') }}</button
          ><a
            tnButton
            variant="ghost"
            [routerLink]="cancelPath"
            >{{ i18n.t('garage.cancel') }}</a
          >
        </div>
      </form>
    }
  </section>`,
  styleUrl: './garage.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleFormPageComponent implements OnInit {
  protected readonly i18n = inject(LocaleService);
  private readonly garage = inject(GarageService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly editing = Boolean(this.route.snapshot.paramMap.get('id'));
  private readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly cancelPath = this.id ? garagePath(this.i18n.locale(), this.id) : garagePath(this.i18n.locale());
  protected readonly form = new FormGroup({
    licensePlate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20)],
    }),
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    vehicleType: new FormControl<VehicleType>('CAR', { nonNullable: true }),
    make: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    model: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    modelYear: new FormControl<number | null>(null),
    currentOdometerKm: new FormControl<number | null>(null),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    allowOdometerCorrection: new FormControl(false, { nonNullable: true }),
  });
  ngOnInit(): void {
    if (this.browser) void this.start();
  }
  private async start(): Promise<void> {
    await this.auth.ready();
    if (!this.auth.user()) {
      location.assign(pagePaths.login[this.i18n.locale()] + '?returnTo=' + encodeURIComponent(this.router.url));
      return;
    }
    if (this.id) await this.load(this.id);
    else this.loading.set(false);
  }
  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const input: VehicleInput = {
      licensePlate: value.licensePlate,
      vehicleType: value.vehicleType,
      ...(value.displayName.trim() ? { displayName: value.displayName.trim() } : {}),
      make: value.make.trim() || null,
      model: value.model.trim() || null,
      modelYear: value.modelYear || null,
      currentOdometerKm: value.currentOdometerKm ?? null,
      notes: value.notes.trim() || null,
    };
    try {
      const saved = this.id
        ? await this.garage.update(this.id, { ...input, allowOdometerCorrection: value.allowOdometerCorrection })
        : await this.garage.create(input);
      await this.router.navigateByUrl(garagePath(this.i18n.locale(), saved.id));
    } catch (error) {
      this.error.set(this.auth.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  private async load(id: string): Promise<void> {
    try {
      const v = await this.garage.get(id);
      this.form.patchValue({
        licensePlate: v.licensePlate,
        displayName: v.displayName,
        vehicleType: v.vehicleType,
        make: v.make ?? '',
        model: v.model ?? '',
        modelYear: v.modelYear,
        currentOdometerKm: v.currentOdometerKm,
        notes: v.notes ?? '',
      });
    } catch (error) {
      this.error.set(this.auth.message(error));
    } finally {
      this.loading.set(false);
    }
  }
}
