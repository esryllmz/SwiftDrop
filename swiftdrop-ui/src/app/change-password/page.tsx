"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button, Card, ErrorState } from "@/components/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { normalizeApiError } from "@/lib/api";
import { hasOuterWhitespace } from "@/lib/normalize";
import { getPortalTheme, type PortalThemeKey } from "@/lib/portal-theme";
import { resolveRoleRedirect } from "@/lib/routes";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { UserRole } from "@/types/api";

function themeForRole(role?: UserRole): PortalThemeKey {
  switch (role) {
    case "CUSTOMER":
      return "customer";
    case "MERCHANT":
      return "merchant";
    case "DRIVER":
      return "courier";
    default:
      return "admin";
  }
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<ChangePasswordShell />}>
      <ChangePasswordForm />
    </Suspense>
  );
}

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.replace("/auth");
    }
  }, [auth.isLoading, auth.user, router]);

  const returnTo = resolveSafeReturnTo(searchParams.get("returnTo"), auth.user?.role);
  const theme = getPortalTheme(themeForRole(auth.user?.role));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validatePasswordForm(newPassword, confirmPassword);
    if (validationError) {
      setError(validationError);
      showErrorToast(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await auth.changePassword(currentPassword, newPassword);
      showSuccessToast(response.message ?? "Password changed successfully.");
      router.replace(returnTo ?? resolveRoleRedirect(response.role));
    } catch (err) {
      const message = normalizeApiError(err, "Password change failed.");
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <PublicHeader accent={theme.accent} />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-6">
        <Card className={theme.card}>
          <h1 className="text-2xl font-semibold text-slate-950">Change password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {auth.user?.passwordChangeRequired
              ? "Your temporary password must be changed before continuing."
              : "Keep your account secure by updating your password."}
          </p>

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <PasswordInput
              id="current-password"
              name="currentPassword"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter your current password"
              autoComplete="current-password"
              required
              disabled={loading}
              focusRingClassName={`border-slate-200 ${theme.focus}`}
            />
            <PasswordInput
              id="new-password"
              name="newPassword"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 8 characters, uppercase, lowercase and number"
              autoComplete="new-password"
              required
              disabled={loading}
              focusRingClassName={`border-slate-200 ${theme.focus}`}
            />
            <PasswordInput
              id="confirm-new-password"
              name="confirmNewPassword"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              required
              disabled={loading}
              focusRingClassName={`border-slate-200 ${theme.focus}`}
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              At least 8 characters with uppercase, lowercase, and number.
            </div>
            <Button type="submit" disabled={loading} className={`h-11 w-full ${theme.button}`}>
              {loading ? "Changing..." : "Update password"}
            </Button>
          </form>

          {error ? (
            <div className="mt-4">
              <ErrorState message={error} />
            </div>
          ) : null}

          <Link
            href={returnTo ?? "/"}
            className={`mt-5 inline-flex text-sm font-semibold ${theme.accentText} hover:underline`}
          >
            Back to profile
          </Link>
        </Card>
      </section>
    </main>
  );
}

function ChangePasswordShell() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <PublicHeader />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-6">
        <Card>
          <h1 className="text-2xl font-semibold text-slate-950">Set a new password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Loading account context.</p>
        </Card>
      </section>
    </main>
  );
}

function validatePasswordForm(newPassword: string, confirmPassword: string) {
  if (newPassword !== confirmPassword) {
    return "New password and confirmation do not match.";
  }
  if (hasOuterWhitespace(newPassword) || hasOuterWhitespace(confirmPassword)) {
    return "Password cannot start or end with a space.";
  }
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return "New password must include at least 8 characters, uppercase, lowercase, and number.";
  }
  return null;
}

function resolveSafeReturnTo(value: string | null, role?: UserRole) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return role ? resolveRoleRedirect(role) : null;
  }

  return value;
}

function PublicHeader({ accent = "bg-blue-600" }: { accent?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="SwiftDrop home">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm ${accent}`}>
            SD
          </span>
          <span className="text-base font-semibold text-slate-950">SwiftDrop</span>
        </Link>
      </div>
    </header>
  );
}
