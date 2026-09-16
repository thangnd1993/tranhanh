import { PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'driver@example.com',
  displayName: 'Driver',
  status: 'ACTIVE' as const,
  createdAt: '2026-09-16T00:00:00.000Z',
};
describe('AuthService browser state', () => {
  it('starts anonymously on SSR without issuing an HTTP request', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    expect(service.state()).toBe('anonymous');
    expect(service.user()).toBeNull();
    http.expectNone('/api/v1/auth/me');
  });
  it('hydrates browser auth state, supports login, and clears state on logout', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    await service.ready();
    expect(service.state()).toBe('anonymous');
    const login = service.login('driver@example.com', 'long enough password');
    http.expectOne('/api/v1/auth/login').flush({ user, accessExpiresAt: '2026-09-16T01:00:00.000Z' });
    await expect(login).resolves.toEqual(user);
    expect(service.user()).toEqual(user);
    const logout = service.logout();
    http.expectOne('/api/v1/auth/logout').flush({ message: 'Signed out.' });
    await logout;
    expect(service.user()).toBeNull();
    expect(service.state()).toBe('anonymous');
  });
});
