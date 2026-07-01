"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { FormEvent, Suspense, useState } from "react";
import { Button, Card, ErrorState, Field, LoadingState } from "@/components/ui";
import { forgotPassword } from "@/lib/auth";
import { ApiError, normalizeApiError } from "@/lib/api";
import { normalizeEmail } from "@/lib/normalize";
import { getPortalTheme, type PortalThemeKey } from "@/lib/portal-theme";
import { showErrorToast, showInfoToast } from "@/lib/toast";

type PortalKey = "customer" | "merchant" | "courier" | "staff";

const portalThemeKeys: Record<PortalKey, PortalThemeKey> = {
  customer: "customer",
  merchant: "merchant",
  courier: "courier",
  staff: "admin",
};

const GENERIC_RESET_MESSAGE =
  "If an account exists for this portal, password reset instructions will be sent.";

const portalLabels: Record<PortalKey, { title: string; apiValue: string; loginHref: string }> = {
  customer: { title: "Customer password reset", apiValue: "CUSTOMER", loginHref: "/auth?portal=customer" },
  merchant: { title: "Merchant password reset", apiValue: "MERCHANT", loginHref: "/auth?portal=merchant" },
  courier: { title: "Courier password reset", apiValue: "COURIER", loginHref: "/auth?portal=courier" },
  staff: { title: "Staff password reset", apiValue: "STAFF", loginHref: "/auth?portal=staff" },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const portal = resolvePortal(searchParams.get("portal"));
  const config = portalLabels[portal];
  const theme = getPortalTheme(portalThemeKeys[portal]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const response = await forgotPassword(normalizeEmail(email), config.apiValue);
      const nextMessage = response.message || GENERIC_RESET_MESSAGE;
      setMessage(nextMessage);
      showInfoToast(nextMessage);
    } catch (err) {
      const nextError = normalizePasswordRecoveryError(err);
      setError(nextError);
      showErrorToast(nextError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <Card className={theme.card}>
        <h1 className="text-2xl font-semibold text-slate-950">{config.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Password reset links are only sent to verified and active accounts.
        </p>
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
            focusRingClassName={`border-slate-200 ${theme.focus}`}
          />
          <Button type="submit" disabled={loading} className={`h-11 w-full ${theme.button}`}>
            {loading ? "Sending..." : "Send reset instructions"}
          </Button>
        </form>
        {message ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
        <Link href={config.loginHref} className={`mt-5 inline-flex text-sm font-semibold ${theme.accentText} hover:underline`}>
          Back to login
        </Link>
      </Card>
    </AuthFrame>
  );
}

function resolvePortal(value: string | null): PortalKey {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "merchant" || normalized === "courier" || normalized === "staff") {
    return normalized;
  }
  return "customer";
}

function normalizePasswordRecoveryError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "Password reset request failed.";
  }
  return normalizeApiError(error, "Password reset request failed.");
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6">
        {children}
      </section>
    </main>
  );
}
