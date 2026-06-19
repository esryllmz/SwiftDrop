import { getJson, postJson } from "@/lib/api";
import type {
  AuthResponse,
  ChangePasswordResponse,
  CurrentUserResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from "@/types/api";

export function login(email: string, password: string) {
  return postJson<AuthResponse>("/api/v1/auth/login", { email, password });
}

export function register(email: string, password: string) {
  return postJson<AuthResponse>("/api/v1/auth/register", { email, password });
}

export function refreshSession() {
  return postJson<AuthResponse>("/api/v1/auth/refresh");
}

export function logout() {
  return postJson<void>("/api/v1/auth/logout");
}

export function getCurrentUser(accessToken: string) {
  return getJson<CurrentUserResponse>(
    "/api/v1/auth/me",
    undefined,
    accessToken,
  );
}

export function changePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
) {
  return postJson<ChangePasswordResponse>(
    "/api/v1/auth/change-password",
    { currentPassword, newPassword },
    undefined,
    accessToken,
  );
}

export function forgotPassword(email: string, portal: string) {
  return postJson<ForgotPasswordResponse>("/api/v1/auth/forgot-password", {
    email,
    portal,
  }, undefined, null);
}

export function resetPassword(token: string, newPassword: string, confirmPassword: string) {
  return postJson<ResetPasswordResponse>("/api/v1/auth/reset-password", {
    token,
    newPassword,
    confirmPassword,
  }, undefined, null);
}
