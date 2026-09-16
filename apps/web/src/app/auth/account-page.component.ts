import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { LocaleService } from '../i18n/locale.service';
import { pagePaths } from '../i18n/routes';
import { AuthService } from './auth.service';
@Component({
  selector: 'tn-account-page',
  imports: [ReactiveFormsModule, ButtonDirective],
  template: `<section class="container section">
    <div class="auth-intro">
      <p class="eyebrow">{{ i18n.t('auth.privateArea') }}</p>
      <h1>{{ i18n.t('auth.accountTitle') }}</h1>
      <p class="muted">{{ i18n.t('auth.accountIntro') }}</p>
    </div>
    @if (auth.user(); as user) {
      <div class="account-grid section">
        <article class="account-card stack">
          <h2>{{ i18n.t('auth.profile') }}</h2>
          <p class="small">
            <strong>{{ i18n.t('auth.email') }}:</strong> {{ user.email }}
          </p>
          <form
            [formGroup]="profile"
            (ngSubmit)="saveProfile()"
          >
            <div class="field">
              <label for="account-name">{{ i18n.t('auth.displayName') }}</label
              ><input
                class="control"
                id="account-name"
                autocomplete="name"
                formControlName="displayName"
              />
            </div>
            @if (profileMessage()) {
              <p
                class="form-success"
                role="status"
              >
                {{ profileMessage() }}
              </p>
            }
            <button
              tnButton
              type="submit"
              [loading]="busy()"
            >
              {{ i18n.t('auth.save') }}
            </button>
          </form>
        </article>
        <article class="account-card stack">
          <h2>{{ i18n.t('auth.security') }}</h2>
          <form
            [formGroup]="password"
            (ngSubmit)="changePassword()"
          >
            <div class="field">
              <label for="current-password">{{ i18n.t('auth.currentPassword') }}</label
              ><input
                class="control"
                id="current-password"
                type="password"
                autocomplete="current-password"
                formControlName="currentPassword"
              />
            </div>
            <div class="field">
              <label for="new-password">{{ i18n.t('auth.newPassword') }}</label
              ><input
                class="control"
                id="new-password"
                type="password"
                autocomplete="new-password"
                formControlName="newPassword"
              />
            </div>
            @if (securityMessage()) {
              <p
                class="form-success"
                role="status"
              >
                {{ securityMessage() }}
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
              variant="secondary"
              [loading]="busy()"
            >
              {{ i18n.t('auth.changePassword') }}
            </button>
          </form>
          <button
            tnButton
            type="button"
            variant="ghost"
            (click)="logout()"
          >
            {{ i18n.t('auth.logout') }}
          </button>
        </article>
      </div>
    } @else {
      <p
        class="muted section"
        role="status"
      >
        {{ i18n.t('common.loading') }}
      </p>
    }
  </section>`,
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPageComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly profileMessage = signal('');
  protected readonly securityMessage = signal('');
  protected readonly profile = new FormGroup({
    displayName: new FormControl(this.auth.user()?.displayName ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
  });
  protected readonly password = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(128)],
    }),
  });
  protected async saveProfile(): Promise<void> {
    if (this.profile.invalid) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.updateProfile(this.profile.controls.displayName.value.trim() || null);
      this.profileMessage.set(this.i18n.t('auth.saved'));
    } catch (error) {
      this.error.set(this.auth.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async changePassword(): Promise<void> {
    if (this.password.invalid) {
      this.password.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.changePassword(
        this.password.controls.currentPassword.value,
        this.password.controls.newPassword.value,
      );
      this.password.reset();
      this.securityMessage.set(this.i18n.t('auth.passwordChanged'));
      await this.router.navigateByUrl(pagePaths.login[this.i18n.locale()]);
    } catch (error) {
      this.error.set(this.auth.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl(pagePaths.login[this.i18n.locale()]);
  }
}
