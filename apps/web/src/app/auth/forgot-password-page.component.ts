import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { AuthService } from './auth.service';
@Component({
  selector: 'tn-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective],
  template: `<section class="container auth-page">
    <div class="auth-layout">
      <div class="auth-intro">
        <p class="eyebrow">{{ i18n.t('auth.security') }}</p>
        <h1>{{ i18n.t('auth.forgotTitle') }}</h1>
        <p class="muted">{{ i18n.t('auth.forgotIntro') }}</p>
      </div>
      <div class="auth-card">
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          novalidate
        >
          <div class="field">
            <label for="forgot-email">{{ i18n.t('auth.email') }}</label
            ><input
              class="control"
              id="forgot-email"
              type="email"
              autocomplete="username"
              formControlName="email"
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
            {{ i18n.t('auth.forgotAction') }}
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
export class ForgotPasswordPageComponent {
  protected readonly i18n = inject(LocaleService);
  private readonly auth = inject(AuthService);
  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.forgotPassword(this.form.controls.email.value);
      this.message.set(this.i18n.t('auth.forgotGeneric'));
    } catch (error) {
      this.error.set(this.auth.message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
