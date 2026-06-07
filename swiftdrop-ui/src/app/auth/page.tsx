"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useMemo, useState } from "react";
import { Button, Card, ErrorState, Field, LoadingState, SecondaryButton, StatusBadge } from "@/components/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import type { AuthResponse, UserRole } from "@/types/api";

type PortalKey = "customer" | "merchant" | "courier" | "staff";

type PortalConfig = {
  key: PortalKey;
  title: string;
  description: string;
  expectedRole: UserRole;
  registerAllowed: boolean;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  futureTitle?: string;
  futureCopy?: string;
};

const portalConfigs: Record<PortalKey, PortalConfig> = {
  customer: {
    key: "customer",
    title: "Customer Portal",
    description: "Sign in or create a customer account for the delivery experience.",
    expectedRole: "CUSTOMER",
    registerAllowed: true,
    emailPlaceholder: "customer@swiftdrop.com",
    passwordPlaceholder: "Customer123!",
  },
  merchant: {
    key: "merchant",
    title: "Merchant Portal",
    description: "Merchant access is enabled for approved store operators.",
    expectedRole: "MERCHANT",
    registerAllowed: false,
    emailPlaceholder: "merchant@swiftdrop.com",
    passwordPlaceholder: "Merchant123!",
    futureTitle: "Request access",
    futureCopy: "Merchant onboarding will be connected to the approval workflow next.",
  },
  courier: {
    key: "courier",
    title: "Courier Portal",
    description: "Courier access is reserved for approved drivers.",
    expectedRole: "DRIVER",
    registerAllowed: false,
    emailPlaceholder: "courier@swiftdrop.com",
    passwordPlaceholder: "Courier123!",
    futureTitle: "Apply for access",
    futureCopy: "Courier applications will be routed through the driver onboarding flow next.",
  },
  staff: {
    key: "staff",
    title: "Operations Console",
    description: "Internal staff login for the SwiftDrop admin dashboard.",
    expectedRole: "ADMIN",
    registerAllowed: false,
    emailPlaceholder: "admin@swiftdrop.com",
    passwordPlaceholder: "Admin123!",
    futureTitle: "Staff access",
    futureCopy: "Use an ADMIN account provisioned by the local seed or your identity workflow.",
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

  const portalLinks = useMemo(
    () => Object.values(portalConfigs).map((item) => ({
      href: `/auth?portal=${item.key}`,
      label: item.title,
      active: item.key === portal,
    })),
    [portal],
  );

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
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <Link href="/" className="text-xl font-semibold text-white">SwiftDrop</Link>
          <div className="mt-4 grid gap-2">
            {portalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                  item.active
                    ? "border-blue-500/40 bg-blue-500/10 text-blue-100"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white">{config.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  {config.description}
                </p>
              </div>
              <StatusBadge status={config.expectedRole} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <SecondaryButton
                onClick={() => setMode("login")}
                className={mode === "login" ? "border-blue-500 bg-blue-500/20 text-blue-100" : ""}
              >
                Login
              </SecondaryButton>
              {config.registerAllowed ? (
                <SecondaryButton
                  onClick={() => setMode("register")}
                  className={mode === "register" ? "border-blue-500 bg-blue-500/20 text-blue-100" : ""}
                >
                  Register
                </SecondaryButton>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3">
              <Field label="Email" value={email} onChange={setEmail} />
              <Field label="Password" type="password" value={password} onChange={setPassword} />
              <Button disabled={loading} onClick={handleSubmit}>
                {loading ? "Please wait..." : mode === "register" ? "Create Customer Account" : "Login"}
              </Button>
            </div>
          </Card>

          {!config.registerAllowed && config.futureTitle ? (
            <Card>
              <h2 className="text-lg font-semibold text-white">{config.futureTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{config.futureCopy}</p>
            </Card>
          ) : null}

          {auth.user ? (
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-slate-400">Current session</div>
                  <div className="mt-1 text-sm font-medium text-white">
                    {auth.user.email} ({auth.user.role})
                  </div>
                </div>
                <SecondaryButton disabled={loading} onClick={handleLogout}>
                  Logout
                </SecondaryButton>
              </div>
            </Card>
          ) : null}

          {success ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}
          {error ? <ErrorState message={error} /> : null}
          {lastResponse ? (
            <Card>
              <h2 className="text-lg font-semibold text-white">Authenticated</h2>
              <p className="mt-2 text-sm text-slate-400">
                Access token is held in React memory state. Refresh restores the session through the HttpOnly cookie.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">{children}</div>
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
