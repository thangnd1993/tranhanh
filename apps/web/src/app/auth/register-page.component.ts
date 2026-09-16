import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { pagePaths } from '../i18n/routes';
import { AuthService } from './auth.service';
@Component({
  selector: 'tn-register-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective],
  template: `<section class="container auth-page">
    <div class="auth-layout">
      <div class="auth-intro">
        <p class="eyebrow">{{ i18n.t('auth.optional') }}</p>
        <h1>{{ i18n.t('auth.registerTitle') }}</h1>
        <p class="muted">{{ i18n.t('auth.registerIntro') }}</p>
        <p class="security-note small">{{ i18n.t('auth.publicNote') }}</p>
      </div>
      <div class="auth-card">
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          novalidate
        >
          <div class="field">
            <label for="register-name">{{ i18n.t('auth.displayName') }}</label
            ><input
              class="control"
              id="register-name"
              autocomplete="name"
              formControlName="displayName"
            />
          </div>
          <div class="field">
            <label for="register-email">{{ i18n.t('auth.email') }}</label
            ><input
              class="control"
              id="register-email"
              type="email"
              autocomplete="username"
              formControlName="email"
            />
          </div>
          <div class="field">
            <label for="register-password">{{ i18n.t('auth.password') }}</label
            ><input
              class="control"
              id="register-password"
              type="password"
              autocomplete="new-password"
              formControlName="password"
              aria-describedby="password-hint"
            /><span
              id="password-hint"
              class="caption"
              >{{ i18n.t('auth.passwordHint') }}</span
            >
          </div>
          <div class="field">
            <label for="register-confirm">{{ i18n.t('auth.confirmPassword') }}</label
            ><input
              class="control"
              id="register-confirm"
              type="password"
              autocomplete="new-password"
              formControlName="confirmation"
            />
          </div>
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
            {{ i18n.t('auth.registerAction') }}
          </button>
          <div class="auth-links">
            <a [routerLink]="i18n.path('login')">{{ i18n.t('auth.loginLink') }}</a>
          </div>
        </form>
      </div>
    </div>
  </section>`,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  protected readonly i18n = inject(LocaleService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(128)],
    }),
    confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected async submit(): Promise<void> {
    if (this.form.invalid || this.form.controls.password.value !== this.form.controls.confirmation.value) {
      this.form.markAllAsTouched();
      this.error.set(this.i18n.t('auth.passwordMismatch'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.register({
        email: this.form.controls.email.value,
        password: this.form.controls.password.value,
        ...(this.form.controls.displayName.value.trim()
          ? { displayName: this.form.controls.displayName.value.trim() }
          : {}),
      });
      await this.router.navigateByUrl(pagePaths.account[this.i18n.locale()]);
    } catch (error) {
      this.error.set(this.auth.message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
