import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { pagePaths } from '../i18n/routes';
import { AuthService } from './auth.service';
@Component({
  selector: 'tn-login-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective],
  template: ` <section class="container auth-page">
    <div class="auth-layout">
      <div class="auth-intro">
        <p class="eyebrow">{{ i18n.t('auth.optional') }}</p>
        <h1>{{ i18n.t('auth.loginTitle') }}</h1>
        <p class="muted">{{ i18n.t('auth.loginIntro') }}</p>
        <p class="security-note small">{{ i18n.t('auth.publicNote') }}</p>
      </div>
      <div class="auth-card">
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          novalidate
        >
          <div class="field">
            <label for="login-email">{{ i18n.t('auth.email') }}</label
            ><input
              class="control"
              id="login-email"
              type="email"
              autocomplete="username"
              formControlName="email"
              [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched"
            />
          </div>
          <div class="field">
            <label for="login-password">{{ i18n.t('auth.password') }}</label
            ><input
              class="control"
              id="login-password"
              type="password"
              autocomplete="current-password"
              formControlName="password"
              [attr.aria-invalid]="form.controls.password.invalid && form.controls.password.touched"
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
            {{ i18n.t('auth.loginAction') }}
          </button>
          <div class="auth-links">
            <a [routerLink]="i18n.path('forgotPassword')">{{ i18n.t('auth.forgotLink') }}</a
            ><a [routerLink]="i18n.path('register')">{{ i18n.t('auth.registerLink') }}</a>
          </div>
        </form>
      </div>
    </div>
  </section>`,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  protected readonly i18n = inject(LocaleService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.form.controls.email.value, this.form.controls.password.value);
      const requested = this.route.snapshot.queryParamMap.get('returnTo');
      const target =
        requested?.startsWith('/') && !requested.startsWith('//') ? requested : pagePaths.account[this.i18n.locale()];
      await this.router.navigateByUrl(target);
    } catch {
      this.error.set(this.i18n.t('auth.invalidCredentials'));
    } finally {
      this.busy.set(false);
    }
  }
}
