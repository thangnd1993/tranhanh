import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  const user = signal<null | { id: string; email: string; displayName: null; status: 'ACTIVE'; createdAt: string }>(
    null,
  );
  const auth = { user: user.asReadonly(), logout: vi.fn(async () => undefined) };
  beforeEach(async () => {
    user.set(null);
    auth.logout.mockClear();
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });
  it('opens and closes the mobile navigation', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.menu-toggle');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#mobile-navigation').hidden).toBe(false);
    fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
  it('shows anonymous account actions and switches to account/logout for an authenticated user', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Đăng nhập');
    expect(fixture.nativeElement.textContent).toContain('Đăng ký');
    user.set({
      id: '1',
      email: 'driver@example.com',
      displayName: null,
      status: 'ACTIVE',
      createdAt: '2026-09-16T00:00:00Z',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tài khoản');
    expect(fixture.nativeElement.textContent).toContain('Đăng xuất');
  });
});
