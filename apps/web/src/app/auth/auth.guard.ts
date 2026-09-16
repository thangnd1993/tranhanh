import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Locale, pagePaths } from '../i18n/routes';
import { AuthService } from './auth.service';

export function accountGuard(locale: Locale): CanActivateFn {
  return async () => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
    const auth = inject(AuthService);
    await auth.ready();
    return auth.user()
      ? true
      : inject(Router).createUrlTree([pagePaths.login[locale]], {
          queryParams: { returnTo: pagePaths.account[locale] },
        });
  };
}
