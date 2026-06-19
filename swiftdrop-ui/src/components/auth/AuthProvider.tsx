"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  changePassword as changePasswordRequest,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
  register as registerRequest,
} from "@/lib/auth";
import type { AuthResponse, ChangePasswordResponse, CurrentUserResponse } from "@/types/api";

type AuthContextValue = {
  accessToken: string | null;
  user: CurrentUserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string) => Promise<AuthResponse>;
  refresh: () => Promise<AuthResponse | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<ChangePasswordResponse>;
  logout: () => Promise<void>;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuthResponse = useCallback(async <T extends AuthResponse>(response: T) => {
    setAccessToken(response.accessToken);
    const currentUser = await getCurrentUser(response.accessToken).catch(() => ({
      userId: response.userId,
      email: response.email,
      role: response.role,
      enabled: true,
      passwordChangeRequired: response.passwordChangeRequired,
    }));
    setUser(currentUser);
    return response;
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      return await applyAuthResponse(await refreshSession());
    } catch {
      clearSession();
      return null;
    }
  }, [applyAuthResponse, clearSession]);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      const response = await refresh();
      if (mounted && !response) {
        clearSession();
      }
      if (mounted) {
        setIsLoading(false);
      }
    }

    void restore();
    return () => {
      mounted = false;
    };
  }, [clearSession, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      user,
      isLoading,
      isAuthenticated: Boolean(accessToken && user),
      login: async (email, password) =>
        applyAuthResponse(await loginRequest(email, password)),
      register: async (email, password) =>
        applyAuthResponse(await registerRequest(email, password)),
      refresh,
      changePassword: async (currentPassword, newPassword) => {
        if (!accessToken) {
          throw new Error("Please sign in again.");
        }
        return applyAuthResponse(
          await changePasswordRequest(accessToken, currentPassword, newPassword),
        );
      },
      logout: async () => {
        try {
          await logoutRequest();
        } finally {
          clearSession();
        }
      },
      clearSession,
    }),
    [accessToken, applyAuthResponse, clearSession, isLoading, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
