export type AccountStatus = 'ACTIVE' | 'DISABLED' | 'PENDING_DELETION';

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface ForgotPasswordRequest {
  email: string;
}
export interface ResetPasswordRequest {
  token: string;
  password: string;
}
export interface UpdateProfileRequest {
  displayName: string | null;
}
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
export interface DeleteAccountRequest {
  password: string;
}
export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  status: AccountStatus;
  createdAt: string;
}
export interface AuthSessionResponse {
  user: AuthUser;
  accessExpiresAt: string;
}
export interface AuthMessageResponse {
  message: string;
}
