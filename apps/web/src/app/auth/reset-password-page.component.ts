import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { AuthService } from './auth.service';
@Component({
  selector: 'tn-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective],
  template: `<section class="container auth-page">
    <div class="auth-layout">
      <div class="auth-intro">
        <p class="eyebrow">{{ i18n.t('auth.security') }}</p>
        <h1>{{ i18n.t('auth.resetTitle') }}</h1>
        <p class="muted">{{ i18n.t('auth.resetIntro') }}</p>
      </div>
      <div class="auth-card">
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          novalidate
        >
          <div class="field">
            <label for="reset-password">{{ i18n.t('auth.newPassword') }}</label
            ><input
              class="control"
              id="reset-password"
              type="password"
              autocomplete="new-password"
              formControlName="password"
            /><span class="caption">{{ i18n.t('auth.passwordHint') }}</span>
          </div>
          <div class="field">
            <label for="reset-confirm">{{ i18n.t('auth.confirmPassword') }}</label
            ><input
              class="control"
              id="reset-confirm"
              type="password"
              autocomplete="new-password"
              formControlName="confirmation"
            />
          </div>
          @if (message()) {
            <p
              class="form-success"
              role="status"
            >
              {{ message() }}
            </p>
          }
          @if (error()) {
            <p
              class="form-error"
              role="alert"
            >
              {{ error() }}
            </p>
          }
          <button
            tnButton
            type="submit"
            [loading]="busy()"
          >
            {{ i18n.t('auth.resetAction') }}
          </button>
          <div class="auth-links">
            <a [routerLink]="i18n.path('login')">{{ i18n.t('auth.backLogin') }}</a>
          </div>
        </form>
      </div>
    </div>
  </section>`,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPageComponent {
  protected readonly i18n = inject(LocaleService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(128)],
    }),
    confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected async submit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (this.form.invalid || this.form.controls.password.value !== this.form.controls.confirmation.value) {
      this.form.markAllAsTouched();
      this.error.set(this.i18n.t('auth.passwordMismatch'));
      return;
    }
    if (!token) {
      this.error.set(this.i18n.t('auth.invalidReset'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.resetPassword(token, this.form.controls.password.value);
      this.message.set(this.i18n.t('auth.resetSuccess'));
      this.form.reset();
    } catch {
      this.error.set(this.i18n.t('auth.invalidReset'));
    } finally {
      this.busy.set(false);
    }
  }
}
