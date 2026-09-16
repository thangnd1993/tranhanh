import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import type { AuthMessageResponse, AuthSessionResponse, AuthUser, RegisterRequest } from '@tranhanh/shared';
import { firstValueFrom } from 'rxjs';

export type AuthState = 'loading' | 'anonymous' | 'authenticated';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly currentUser = signal<AuthUser | null>(null);
  private readonly currentState = signal<AuthState>(this.browser ? 'loading' : 'anonymous');
  private initialization?: Promise<void>;
  readonly user = this.currentUser.asReadonly();
  readonly state = this.currentState.asReadonly();
  constructor() {
    if (this.browser) this.initialization = this.loadMe();
  }
  async ready(): Promise<void> {
    await this.initialization;
  }
  async login(email: string, password: string): Promise<AuthUser> {
    const result = await firstValueFrom(
      this.http.post<AuthSessionResponse>('/api/v1/auth/login', { email, password }, { withCredentials: true }),
    );
    return this.accept(result.user);
  }
  async register(input: RegisterRequest): Promise<AuthUser> {
    const result = await firstValueFrom(
      this.http.post<AuthSessionResponse>('/api/v1/auth/register', input, { withCredentials: true }),
    );
    return this.accept(result.user);
  }
  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post('/api/v1/auth/logout', {}, { headers: this.csrfHeaders(), withCredentials: true }),
      );
    } finally {
      this.currentUser.set(null);
      this.currentState.set('anonymous');
    }
  }
  forgotPassword(email: string): Promise<AuthMessageResponse> {
    return firstValueFrom(this.http.post<AuthMessageResponse>('/api/v1/auth/forgot-password', { email }));
  }
  resetPassword(token: string, password: string): Promise<AuthMessageResponse> {
    return firstValueFrom(this.http.post<AuthMessageResponse>('/api/v1/auth/reset-password', { token, password }));
  }
  async updateProfile(displayName: string | null): Promise<AuthUser> {
    const user = await firstValueFrom(
      this.http.patch<AuthUser>(
        '/api/v1/auth/me',
        { displayName },
        { headers: this.csrfHeaders(), withCredentials: true },
      ),
    );
    return this.accept(user);
  }
  changePassword(currentPassword: string, newPassword: string): Promise<AuthMessageResponse> {
    return firstValueFrom(
      this.http.post<AuthMessageResponse>(
        '/api/v1/auth/change-password',
        { currentPassword, newPassword },
        { headers: this.csrfHeaders(), withCredentials: true },
      ),
    ).then((result) => {
      this.currentUser.set(null);
      this.currentState.set('anonymous');
      return result;
    });
  }
  message(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') return error.error.message;
    return 'Unable to complete the request.';
  }
  privateRequestOptions(): { headers: HttpHeaders; withCredentials: true } {
    return { headers: this.csrfHeaders(), withCredentials: true };
  }
  private accept(user: AuthUser): AuthUser {
    this.currentUser.set(user);
    this.currentState.set('authenticated');
    return user;
  }
  private async loadMe(): Promise<void> {
    try {
      this.accept(await firstValueFrom(this.http.get<AuthUser>('/api/v1/auth/me', { withCredentials: true })));
    } catch {
      this.currentUser.set(null);
      this.currentState.set('anonymous');
    }
  }
  private csrfHeaders(): HttpHeaders {
    if (!this.browser) return new HttpHeaders();
    const csrf = document.cookie
      .split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith('tn_csrf='))
      ?.slice(8);
    return csrf ? new HttpHeaders({ 'X-CSRF-Token': decodeURIComponent(csrf) }) : new HttpHeaders();
  }
}
