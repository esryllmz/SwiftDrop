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
import type { AuthResponse, UserRole } from "@/types/api";

type PortalKey = "customer" | "merchant" | "courier" | "staff";

type PortalConfig = {
  key: PortalKey;
  title: string;
  registerTitle: string;
  description: string;
  expectedRole: UserRole;
  registerAllowed: boolean;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  accent: "blue" | "violet" | "emerald" | "slate";
  futureTitle?: string;
  futureCopy?: string;
};

const portalConfigs: Record<PortalKey, PortalConfig> = {
  customer: {
    key: "customer",
    title: "Customer login",
    registerTitle: "Create an account",
    description: "Sign in to continue to the customer delivery experience.",
    expectedRole: "CUSTOMER",
    registerAllowed: true,
    emailPlaceholder: "customer@swiftdrop.com",
    passwordPlaceholder: "Customer123!",
    accent: "blue",
  },
  merchant: {
    key: "merchant",
    title: "Merchant login",
    registerTitle: "Merchant login",
    description: "Approved store operators can access merchant tools here.",
    expectedRole: "MERCHANT",
    registerAllowed: false,
    emailPlaceholder: "merchant@swiftdrop.com",
    passwordPlaceholder: "Merchant123!",
    accent: "violet",
    futureTitle: "Request merchant access",
    futureCopy: "Merchant onboarding will be connected to the approval workflow next.",
  },
  courier: {
    key: "courier",
    title: "Courier login",
    registerTitle: "Courier login",
    description: "Approved drivers can access courier operations here.",
    expectedRole: "DRIVER",
    registerAllowed: false,
    emailPlaceholder: "courier@swiftdrop.com",
    passwordPlaceholder: "Courier123!",
    accent: "emerald",
    futureTitle: "Apply for courier access",
    futureCopy: "Courier applications will be routed through driver onboarding next.",
  },
  staff: {
    key: "staff",
    title: "Operations Console",
    registerTitle: "Operations Console",
    description: "Internal ADMIN access for SwiftDrop operations.",
    expectedRole: "ADMIN",
    registerAllowed: false,
    emailPlaceholder: "admin@swiftdrop.com",
    passwordPlaceholder: "Admin123!",
    accent: "slate",
    futureTitle: "Staff access",
    futureCopy: "Use an ADMIN account provisioned by local seed or identity workflow.",
  },
};

const accentClass = {
  blue: {
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    button: "border-blue-600 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
  },
  violet: {
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    button: "border-violet-600 bg-violet-600 hover:bg-violet-700 focus:ring-violet-500",
  },
  emerald: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    button: "border-emerald-600 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
  },
  slate: {
    badge: "border-slate-200 bg-slate-100 text-slate-800",
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
    <Suspense fallback={<AuthShell><LoadingState /></AuthShell>}>
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
  const initialMode = searchParams.get("mode") === "register" && config.registerAllowed
    ? "register"
    : "login";

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState(config.emailPlaceholder);
  const [password, setPassword] = useState(config.passwordPlaceholder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AuthResponse | null>(null);
  const accent = accentClass[config.accent];

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setLastResponse(null);
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

      setLastResponse(response);
      if (response.role === "ADMIN") {
        router.replace("/dashboard");
        return;
      }

      if (response.role === "CUSTOMER") {
        setSuccess("Customer account authenticated. Customer dashboard will be connected next.");
      } else if (response.role === "MERCHANT") {
        setSuccess("Merchant account authenticated. Merchant dashboard will be connected next.");
      } else {
        setSuccess("Courier account authenticated. Courier dashboard will be connected next.");
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
      setLastResponse(null);
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
          className="mb-6 w-fit text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          Back to Welcome
        </Link>

        <Card className="p-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
            SD
          </div>
          <div className="mt-4 text-center">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${accent.badge}`}>
              {config.expectedRole}
            </span>
            <h1 className="mt-4 text-2xl font-semibold text-slate-950">
              {mode === "register" ? config.registerTitle : config.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === "register"
                ? "Public registration creates CUSTOMER accounts only."
                : config.description}
            </p>
          </div>

          {config.registerAllowed ? (
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
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
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
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
            <Button
              type="submit"
              disabled={loading}
              className={`w-full ${accent.button}`}
            >
              {loading ? "Please wait..." : mode === "register" ? "Create Customer Account" : "Login"}
            </Button>
          </form>

          {!config.registerAllowed && config.futureTitle ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h2 className="text-sm font-semibold text-slate-950">{config.futureTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{config.futureCopy}</p>
            </div>
          ) : null}

          {auth.user ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs font-medium uppercase text-slate-500">Current session</div>
              <div className="mt-1 text-sm font-medium text-slate-950">
                {auth.user.email} ({auth.user.role})
              </div>
              <SecondaryButton className="mt-3 w-full" disabled={loading} onClick={handleLogout}>
                Logout
              </SecondaryButton>
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}
          {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}
          {lastResponse ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Access token is held in React memory state. Refresh restores the session through the HttpOnly cookie.
            </div>
          ) : null}
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

function toAuthErrorMessage(err: unknown) {
  if (err instanceof Error) {
    if (err.message.toLowerCase().includes("failed to fetch")) {
      return "Backend is unavailable. Start the Docker stack and try again.";
    }
    if (err.message.toLowerCase().includes("bad credentials")) {
      return "Invalid email or password.";
    }
    return err.message;
  }
  return "Authentication request failed.";
}
