import { getJson, postJson } from "@/lib/api";
import type { AuthResponse, CurrentUserResponse } from "@/types/api";

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
