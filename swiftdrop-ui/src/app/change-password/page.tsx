"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button, Card, ErrorState } from "@/components/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { normalizeApiError } from "@/lib/api";
import { hasOuterWhitespace } from "@/lib/normalize";
import { resolveRoleRedirect } from "@/lib/routes";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

export default function ChangePasswordPage() {
  const router = useRouter();
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

  useEffect(() => {
    if (!auth.isLoading && auth.user && !auth.user.passwordChangeRequired) {
      router.replace(resolveRoleRedirect(auth.user.role));
    }
  }, [auth.isLoading, auth.user, router]);

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
      router.replace(resolveRoleRedirect(response.role));
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
      <PublicHeader />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-6">
        <Card>
          <h1 className="text-2xl font-semibold text-slate-950">Set a new password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your temporary password must be changed before continuing.
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
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              At least 8 characters with uppercase, lowercase, and number.
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? "Changing..." : "Change password"}
            </Button>
          </form>

          {error ? (
            <div className="mt-4">
              <ErrorState message={error} />
            </div>
          ) : null}
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

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="SwiftDrop home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            SD
          </span>
          <span className="text-base font-semibold text-slate-950">SwiftDrop</span>
        </Link>
      </div>
    </header>
  );
}
