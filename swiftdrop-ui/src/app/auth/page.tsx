"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  SecondaryButton,
} from "@/components/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { PublicApplicationModal } from "@/components/public/PublicApplicationModal";
import type { UserRole } from "@/types/api";
import { normalizeApiError } from "@/lib/api";
import { resolveRoleRedirect } from "@/lib/routes";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";

type PortalKey = "customer" | "merchant" | "courier" | "staff";
type ApplicationModalKind = "merchant" | "courier";

type PortalConfig = {
  key: PortalKey;
  title: string;
  registerTitle: string;
  description: string;
  expectedRole: UserRole;
  badgeLabel: string;
  registerAllowed: boolean;
  accent: "blue" | "violet" | "emerald" | "slate";
  panelTitle: string;
  panelCopy: string;
  actionCopy: string;
  icon: React.ReactNode;
  requestLabel?: string;
  requestKind?: ApplicationModalKind;
};

const portalConfigs: Record<PortalKey, PortalConfig> = {
  customer: {
    key: "customer",
    title: "Customer login",
    registerTitle: "Create an account",
    description: "Sign in to track your orders.",
    expectedRole: "CUSTOMER",
    badgeLabel: "Customer access",
    registerAllowed: true,
    accent: "blue",
    panelTitle: "New to SwiftDrop?",
    panelCopy: "Create an account to start ordering with SwiftDrop.",
    actionCopy: "Start ordering with SwiftDrop.",
    icon: <CustomerIcon />,
  },
  merchant: {
    key: "merchant",
    title: "Merchant login",
    registerTitle: "Merchant login",
    description: "Access your store dashboard.",
    expectedRole: "MERCHANT",
    badgeLabel: "Merchant access",
    registerAllowed: false,
    accent: "violet",
    panelTitle: "Need merchant access?",
    panelCopy: "Submit a request and operations will review your store details.",
    actionCopy: "Only approved merchant accounts can use this portal.",
    icon: <StoreIcon />,
    requestLabel: "Request access",
    requestKind: "merchant",
  },
  courier: {
    key: "courier",
    title: "Courier login",
    registerTitle: "Courier login",
    description: "Access your delivery dashboard.",
    expectedRole: "DRIVER",
    badgeLabel: "Courier access",
    registerAllowed: false,
    accent: "emerald",
    panelTitle: "Need courier access?",
    panelCopy: "Submit an application and operations will review your details.",
    actionCopy: "Only approved courier accounts can use this portal.",
    icon: <CourierIcon />,
    requestLabel: "Apply as courier",
    requestKind: "courier",
  },
  staff: {
    key: "staff",
    title: "Operations Console",
    registerTitle: "Operations Console",
    description: "Internal staff access only.",
    expectedRole: "ADMIN",
    badgeLabel: "Staff access",
    registerAllowed: false,
    accent: "slate",
    panelTitle: "Staff access",
    panelCopy: "Use an authorized operations account to continue.",
    actionCopy: "Authorized operations staff only.",
    icon: <ShieldIcon />,
  },
};

const accentClass = {
  blue: {
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    icon: "border-blue-200 bg-blue-50 text-blue-700",
    button: "border-blue-600 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
  },
  violet: {
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    icon: "border-violet-200 bg-violet-50 text-violet-700",
    button: "border-violet-600 bg-violet-600 hover:bg-violet-700 focus:ring-violet-500",
  },
  emerald: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
    button:
      "border-emerald-600 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
  },
  slate: {
    badge: "border-slate-200 bg-slate-100 text-slate-800",
    icon: "border-slate-200 bg-slate-100 text-slate-800",
    button: "border-slate-900 bg-slate-900 hover:bg-slate-800 focus:ring-slate-500",
  },
};

function resolvePortal(value: string | null): PortalKey {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "merchant" || normalized === "courier" || normalized === "staff") {
    return normalized;
  }
  return "customer";
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <LoadingState />
        </AuthShell>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const portal = resolvePortal(searchParams.get("portal"));
  const config = portalConfigs[portal];
  const mode =
    searchParams.get("mode") === "register" && config.registerAllowed
      ? "register"
      : "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeModal, setActiveModal] = useState<ApplicationModalKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const accent = accentClass[config.accent];

  function clearFormState() {
    setEmail("");
    setPassword("");
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response =
        mode === "register"
          ? await auth.register(email, password)
          : await auth.login(email, password);

      if (response.role !== config.expectedRole) {
        await auth.logout();
        const message = "This account is not authorized for this portal.";
        setError(message);
        showErrorToast(message);
        return;
      }

      if (response.passwordChangeRequired) {
        showInfoToast("Please set a new password to continue.");
        router.replace("/change-password");
        return;
      }

      if (response.role === "CUSTOMER") {
        setSuccess("Customer account authenticated.");
      } else if (response.role === "MERCHANT") {
        setSuccess("Merchant account authenticated.");
      } else {
        setSuccess("Courier account authenticated.");
      }
      showSuccessToast(mode === "register" ? "Account created." : "Signed in.");
      router.replace(resolveRoleRedirect(response.role));
    } catch (err) {
      const message = toAuthErrorMessage(err);
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError(null);
    try {
      await auth.logout();
      setSuccess("Signed out.");
      showSuccessToast("Signed out.");
    } catch (err) {
      const message = toAuthErrorMessage(err);
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center py-6">
        <Link
          href="/"
          className="mb-4 inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
        >
          <BackIcon />
          Back to Welcome
        </Link>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 pb-4 pt-5 text-center">
            <div
              className={`mx-auto flex h-11 w-11 items-center justify-center rounded-lg border ${accent.icon}`}
              aria-hidden="true"
            >
              {config.icon}
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-slate-950">
              {mode === "register" ? config.registerTitle : config.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === "register" ? config.actionCopy : config.description}
            </p>
          </div>

          <div className="px-6 py-5">
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <Field label="Email" value={email} onChange={setEmail} />
              <Field label="Password" type="password" value={password} onChange={setPassword} />
              {mode === "login" ? (
                <div className="flex justify-end">
                  <Link
                    href={`/forgot-password?portal=${portal}`}
                    className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                  >
                    Forgot password?
                  </Link>
                </div>
              ) : null}
              <Button type="submit" disabled={loading} className={`h-11 w-full ${accent.button}`}>
                {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Login"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-slate-600">
              {config.registerAllowed && mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth?mode=register&portal=customer"
                    onClick={clearFormState}
                    className="font-semibold text-blue-600 transition hover:text-blue-700"
                  >
                    Create account
                  </Link>
                </>
              ) : null}
              {config.registerAllowed && mode === "register" ? (
                <>
                  Already have an account?{" "}
                  <Link
                    href="/auth?portal=customer"
                    onClick={clearFormState}
                    className="font-semibold text-blue-600 transition hover:text-blue-700"
                  >
                    Sign in
                  </Link>
                </>
              ) : null}
              {config.requestKind && config.requestLabel ? (
                <button
                  type="button"
                  onClick={() => setActiveModal(config.requestKind ?? null)}
                  className="font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  {config.requestLabel}
                </button>
              ) : null}
            </div>

            {!config.registerAllowed && portal !== "staff" ? (
              <p className="mt-2 text-center text-xs leading-5 text-slate-500">
                {config.panelCopy}
              </p>
            ) : null}

            {portal === "staff" ? (
              <p className="mt-4 text-center text-xs font-medium text-slate-500">
                Authorized staff only.
              </p>
            ) : null}

            {auth.user ? (
              <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium uppercase text-slate-500">Current session</div>
                <div className="mt-1 break-all text-sm font-medium text-slate-950">
                  {auth.user.email}
                </div>
                <SecondaryButton className="mt-3 w-full" disabled={loading} onClick={handleLogout}>
                  Logout
                </SecondaryButton>
              </div>
            ) : null}

            {success ? (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}
            {error ? (
              <div className="mt-5">
                <ErrorState message={error} />
              </div>
            ) : null}
          </div>
        </Card>
      </div>
      {activeModal ? (
        <PublicApplicationModal kind={activeModal} onClose={() => setActiveModal(null)} />
      ) : null}
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <PublicHeader />
      <section className="px-4 sm:px-6 lg:px-8">{children}</section>
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="SwiftDrop home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <LightningIcon />
          </span>
          <span className="text-base font-semibold text-slate-950">SwiftDrop</span>
        </Link>
        <Link
          href="/auth?portal=staff"
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          Staff access
        </Link>
      </div>
    </header>
  );
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M13 2 5 13h6l-1 9 9-13h-6l1-7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M19 12H5m6 7-7-7 7-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CustomerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="m4.5 7.5 7.5 4.25 7.5-4.25M12 12v8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 10h16l-1.5-6h-13L4 10Zm1 0v10h14V10"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CourierIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3 6h11v11H3V6Zm14 5h2l2 3v3h-4v-6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="m9 12 2 2 4-5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function toAuthErrorMessage(err: unknown) {
  return normalizeApiError(err, "Authentication request failed.");
}
