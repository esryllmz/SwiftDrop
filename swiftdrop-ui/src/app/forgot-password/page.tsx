"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { Button, Card, ErrorState, Field, LoadingState } from "@/components/ui";
import { forgotPassword } from "@/lib/auth";
import { normalizeApiError } from "@/lib/api";
import { showErrorToast, showInfoToast } from "@/lib/toast";

type PortalKey = "customer" | "merchant" | "courier" | "staff";

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
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const resetHref = useMemo(
    () => devToken ? `/reset-password?portal=${portal}&token=${encodeURIComponent(devToken)}` : "",
    [devToken, portal],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setDevToken(null);
    setLoading(true);
    try {
      const response = await forgotPassword(email, config.apiValue);
      setMessage(response.message);
      setDevToken(response.devResetToken ?? null);
      showInfoToast(response.message);
    } catch (err) {
      const nextError = normalizeApiError(err, "Password reset request failed.");
      setError(nextError);
      showErrorToast(nextError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <Card>
        <h1 className="text-2xl font-semibold text-slate-950">{config.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter your account email. If it exists for this portal, reset instructions will be created.
        </p>
        {portal === "merchant" || portal === "courier" ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            Only approved accounts can reset their password. If your application is still pending, please wait for approval.
          </p>
        ) : null}
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <Field label="Email" value={email} onChange={setEmail} />
          <Button type="submit" disabled={loading} className="h-11 w-full">
            {loading ? "Sending..." : "Send reset instructions"}
          </Button>
        </form>
        {message ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {devToken ? (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3">
            <div className="text-xs font-semibold uppercase text-blue-700">Development reset token</div>
            <div className="mt-2 break-all font-mono text-xs text-slate-800">{devToken}</div>
            <Link href={resetHref} className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800">
              Continue to reset password
            </Link>
          </div>
        ) : null}
        {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
        <Link href={config.loginHref} className="mt-5 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
          Back to login
        </Link>
      </Card>
    </AuthFrame>
  );
}

function resolvePortal(value: string | null): PortalKey {
  if (value === "merchant" || value === "courier" || value === "staff") {
    return value;
  }
  return "customer";
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
