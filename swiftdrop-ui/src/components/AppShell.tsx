"use client";

import type React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Operational overview",
    marker: "DB",
    title: "Dashboard",
    subtitle: "Operational overview",
  },
  {
    href: "/orders",
    label: "Orders",
    description: "Manage and inspect",
    marker: "OR",
    title: "Orders",
    subtitle: "Manage and inspect platform orders",
  },
  {
    href: "/drivers",
    label: "Drivers",
    description: "Courier operations",
    marker: "DR",
    title: "Drivers",
    subtitle: "Courier availability and operations",
  },
  {
    href: "/merchants",
    label: "Merchants",
    description: "Store locations",
    marker: "ME",
    title: "Merchants",
    subtitle: "Store records and locations",
  },
  {
    href: "/event-stream",
    label: "Event Stream",
    description: "Outbox to Kafka",
    marker: "EV",
    title: "Event Stream",
    subtitle: "Transactional Outbox to Kafka pipeline",
  },
  {
    href: "/system-monitoring",
    label: "System Monitoring",
    description: "Service status",
    marker: "UP",
    title: "System Monitoring",
    subtitle: "Service health and infrastructure status",
  },
  {
    href: "/users-approvals",
    label: "Users & Approvals",
    description: "Access workflow",
    marker: "UA",
    title: "Users & Approvals",
    subtitle: "Merchant and courier access workflow",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Demo configuration",
    marker: "ST",
    title: "Settings",
    subtitle: "Local demo configuration",
  },
];

const stackItems = ["Gateway", "Auth", "Logistics", "Notification", "Kafka", "Redis"];
const routeAliases: Record<string, string> = {
  "/outbox": "/event-stream",
  "/health": "/system-monitoring",
};
const routeMetadata: Record<string, { title: string; subtitle: string }> = {
  "/profile": {
    title: "Profile",
    subtitle: "Account and access details",
  },
};
const publicRoutes = ["/", "/auth", "/staff-login"];
const protectedRoutes = [
  "/dashboard",
  "/orders",
  "/drivers",
  "/merchants",
  "/event-stream",
  "/outbox",
  "/system-monitoring",
  "/health",
  "/users-approvals",
  "/settings",
  "/profile",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, user, logout } = useAuth();

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  useEffect(() => {
    if (!isLoading && isProtectedRoute && !user) {
      router.replace("/auth?portal=staff");
    }
  }, [isLoading, isProtectedRoute, router, user]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isProtectedRoute && isLoading) {
    return (
      <FullPageState
        title="Restoring session"
        message="Checking the HttpOnly refresh cookie before opening the operations console."
      />
    );
  }

  if (isProtectedRoute && !user) {
    return (
      <FullPageState
        title="Authentication required"
        message="Redirecting to staff login."
      />
    );
  }

  if (isProtectedRoute && user && user.role !== "ADMIN") {
    return (
      <AccessDenied
        email={user.email}
        role={user.role}
        onLogout={() => {
          void logout().finally(() => router.replace("/"));
        }}
      />
    );
  }

  const normalizedPathname = routeAliases[pathname] ?? pathname;
  const current = navItems.find((item) => normalizedPathname.startsWith(item.href));
  const metadata = routeMetadata[normalizedPathname];
  const title = current?.title ?? metadata?.title ?? "SwiftDrop";
  const subtitle = current?.subtitle ?? metadata?.subtitle ?? "Admin console";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:h-screen lg:grid-cols-[240px_1fr] lg:overflow-hidden">
      <aside className="border-b border-slate-200 bg-white px-3 py-4 lg:flex lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r">
        <Link href="/dashboard" className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-950">SwiftDrop</div>
              <div className="mt-1 text-sm text-slate-500">
                Operations Console
              </div>
            </div>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              Docker Local
            </span>
          </div>
        </Link>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {navItems.map((item) => {
            const active = normalizedPathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-w-[180px] rounded-xl border px-3 py-2.5 transition lg:min-w-0 ${
                  active
                    ? "border-blue-200 bg-blue-50 text-blue-700 shadow-[inset_3px_0_0_rgba(37,99,235,0.9)]"
                    : "border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-semibold ${
                      active
                        ? "border-blue-200 bg-white text-blue-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {item.marker}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {item.description}
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:mt-auto">
          <div className="text-xs font-semibold uppercase text-slate-500">Backend Stack</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {stackItems.map((item) => (
              <span
                key={item}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
              >
                {item}
              </span>
            ))}
          </div>
          <Link
            href="/profile"
            className="mt-3 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Profile
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => void logout().finally(() => router.replace("/"))}
              className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              Log out
            </button>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
        <header className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex min-h-14 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <HeaderBadge label="Docker" value="Local" />
              <HeaderBadge label="API" value="8080" />
              <a
                href="http://localhost:8090"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
              >
                Kafka UI · 8090
              </a>
              {user ? <UserBadge email={user.email} role={user.role} /> : null}
            </div>
          </div>
        </header>

        <main className="min-w-0 px-5 py-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function FullPageState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function AccessDenied({
  email,
  role,
  onLogout,
}: {
  email: string;
  role: string;
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-md border border-rose-200 bg-rose-50 p-5">
        <h1 className="text-xl font-semibold text-slate-950">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-rose-700">
          {email} is signed in with role {role}. The operations console requires ADMIN.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function HeaderBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span className="text-slate-500">{label} · </span>
      <span className="font-medium text-slate-950">{value}</span>
    </span>
  );
}

function UserBadge({ email, role }: { email: string; role: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
        {email.slice(0, 1).toUpperCase()}
      </span>
      <span className="font-medium text-slate-950">{email}</span>
      <span className="text-slate-400">·</span>
      <span>{role}</span>
    </span>
  );
}
