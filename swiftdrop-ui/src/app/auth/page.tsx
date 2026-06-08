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
import type { UserRole } from "@/types/api";

type PortalKey = "customer" | "merchant" | "courier" | "staff";

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
};

const portalConfigs: Record<PortalKey, PortalConfig> = {
  customer: {
    key: "customer",
    title: "Customer Portal",
    registerTitle: "Create Customer Account",
    description: "Sign in to continue to the customer delivery experience.",
    expectedRole: "CUSTOMER",
    badgeLabel: "Customer access",
    registerAllowed: true,
    accent: "blue",
    panelTitle: "Customer access",
    panelCopy: "Create an account or sign in to continue with delivery requests.",
    actionCopy: "Customer registration creates a customer account only.",
    icon: <CustomerIcon />,
  },
  merchant: {
    key: "merchant",
    title: "Merchant Portal",
    registerTitle: "Merchant Portal",
    description: "Approved store operators can access merchant tools here.",
    expectedRole: "MERCHANT",
    badgeLabel: "Merchant access",
    registerAllowed: false,
    accent: "violet",
    panelTitle: "Need merchant access?",
    panelCopy: "Return to the welcome page and submit a merchant access request.",
    actionCopy: "Only approved merchant accounts can use this portal.",
    icon: <StoreIcon />,
  },
  courier: {
    key: "courier",
    title: "Courier Portal",
    registerTitle: "Courier Portal",
    description: "Approved drivers can access courier operations here.",
    expectedRole: "DRIVER",
    badgeLabel: "Courier access",
    registerAllowed: false,
    accent: "emerald",
    panelTitle: "Need courier access?",
    panelCopy: "Return to the welcome page and submit a courier application.",
    actionCopy: "Only approved courier accounts can use this portal.",
    icon: <CourierIcon />,
  },
  staff: {
    key: "staff",
    title: "Operations Console",
    registerTitle: "Operations Console",
    description: "Authorized operations access for SwiftDrop staff.",
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
  if (value === "merchant" || value === "courier" || value === "staff") {
    return value;
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
  const initialMode =
    searchParams.get("mode") === "register" && config.registerAllowed
      ? "register"
      : "login";

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const accent = accentClass[config.accent];

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
        setError("This account is not authorized for this portal.");
        return;
      }

      if (response.role === "ADMIN") {
        router.replace("/dashboard");
        return;
      }

      if (response.role === "CUSTOMER") {
        setSuccess("Customer account authenticated.");
      } else if (response.role === "MERCHANT") {
        setSuccess("Merchant account authenticated.");
      } else {
        setSuccess("Courier account authenticated.");
      }
    } catch (err) {
      setError(toAuthErrorMessage(err));
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
    } catch (err) {
      setError(toAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
        <Link
          href="/"
          className="mb-6 inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          <BackIcon />
          Back to Welcome
        </Link>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 pb-5 pt-6 text-center">
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl border ${accent.icon}`}
              aria-hidden="true"
            >
              {config.icon}
            </div>
            <span
              className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${accent.badge}`}
            >
              {config.badgeLabel}
            </span>
            <h1 className="mt-4 text-2xl font-semibold text-slate-950">
              {mode === "register" ? config.registerTitle : config.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === "register" ? config.actionCopy : config.description}
            </p>
          </div>

          <div className="px-6 py-6">
            {config.registerAllowed ? (
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    mode === "login"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    mode === "register"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  Register
                </button>
              </div>
            ) : null}

            <form
              className="mt-5 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <Field label="Email" value={email} onChange={setEmail} />
              <Field label="Password" type="password" value={password} onChange={setPassword} />
              <Button type="submit" disabled={loading} className={`h-11 w-full ${accent.button}`}>
                {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Login"}
              </Button>
            </form>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-950">{config.panelTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{config.panelCopy}</p>
            </div>

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
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      {children}
    </main>
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
  if (err instanceof Error) {
    if (err.message.toLowerCase().includes("failed to fetch")) {
      return "Service is unavailable. Please try again later.";
    }
    if (err.message.toLowerCase().includes("bad credentials")) {
      return "Invalid email or password.";
    }
    return err.message;
  }
  return "Authentication request failed.";
}
