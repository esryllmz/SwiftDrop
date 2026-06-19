"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button, Card, ErrorState, Field, LoadingState } from "@/components/ui";
import { resetPassword } from "@/lib/auth";
import { ApiError, normalizeApiError } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

type PortalKey = "customer" | "merchant" | "courier" | "staff";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = resolvePortal(searchParams.get("portal"));
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const response = await resetPassword(token, newPassword, confirmPassword);
      showSuccessToast(response.message);
      router.replace(resolveLoginHref(portal));
    } catch (err) {
      const message = normalizeResetPasswordError(err);
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6">
        <Card>
          <h1 className="text-2xl font-semibold text-slate-950">Reset password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Set a new password for your SwiftDrop account.
          </p>
          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} />
            <Field label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              At least 8 characters with uppercase, lowercase, and number.
            </div>
            <Button type="submit" disabled={loading || !token} className="h-11 w-full">
              {loading ? "Resetting..." : "Reset password"}
            </Button>
          </form>
          {!token ? (
            <div className="mt-4"><ErrorState message="Reset token is missing." /></div>
          ) : null}
          {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
          <Link href={resolveLoginHref(portal)} className="mt-5 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
            Back to login
          </Link>
        </Card>
      </section>
    </main>
  );
}

function validatePasswordForm(newPassword: string, confirmPassword: string) {
  if (newPassword !== confirmPassword) {
    return "New password and confirmation do not match.";
  }
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return "New password must include at least 8 characters, uppercase, lowercase, and number.";
  }
  return null;
}

function resolvePortal(value: string | null): PortalKey {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "merchant" || normalized === "courier" || normalized === "staff") {
    return normalized;
  }
  return "customer";
}

function resolveLoginHref(portal: PortalKey) {
  return `/auth?portal=${portal}`;
}

function normalizeResetPasswordError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "Reset link is invalid or expired.";
  }
  return normalizeApiError(error, "Password reset failed.");
}
