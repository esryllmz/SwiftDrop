"use client";

import type React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  description: string;
  marker: string;
  title: string;
  subtitle: string;
};

const ADMIN_NAV_ITEMS: NavItem[] = [
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
    description: "Order operations",
    marker: "OR",
    title: "Orders",
    subtitle: "Order operations",
  },
  {
    href: "/drivers",
    label: "Drivers",
    description: "Courier availability",
    marker: "DR",
    title: "Drivers",
    subtitle: "Courier availability",
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
    description: "Outbox events",
    marker: "EV",
    title: "Event Stream",
    subtitle: "Transactional outbox events",
  },
  {
    href: "/system-monitoring",
    label: "System Monitoring",
    description: "Service health",
    marker: "UP",
    title: "System Monitoring",
    subtitle: "Service health",
  },
  {
    href: "/users-approvals",
    label: "Users & Approvals",
    description: "Access review",
    marker: "UA",
    title: "Users & Approvals",
    subtitle: "Merchant and courier application review",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Runtime config",
    marker: "ST",
    title: "Settings",
    subtitle: "Environment-managed configuration",
  },
];

const PUBLIC_ROUTES = ["/", "/auth", "/staff-login"];
const ADMIN_ROUTES = [
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
const ROUTE_ALIASES: Record<string, string> = {
  "/outbox": "/event-stream",
  "/health": "/system-monitoring",
};
const ROUTE_METADATA: Record<string, { title: string; subtitle: string }> = {
  "/profile": {
    title: "Profile",
    subtitle: "Account and access details",
  },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, user, logout } = useAuth();

  const isPublicRoute = isRouteMatch(pathname, PUBLIC_ROUTES);
  const isAdminRoute = isRouteMatch(pathname, ADMIN_ROUTES);

  useEffect(() => {
    if (!isLoading && isAdminRoute && !user) {
      router.replace("/auth?portal=staff");
    }
  }, [isAdminRoute, isLoading, router, user]);

  if (isPublicRoute || !isAdminRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <FullPageState
        title="Restoring session"
        message="Checking your staff session before opening the operations console."
      />
    );
  }

  if (!user) {
    return (
      <FullPageState
        title="Authentication required"
        message="Redirecting to staff login."
      />
    );
  }

  if (user.role !== "ADMIN") {
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

  const normalizedPathname = ROUTE_ALIASES[pathname] ?? pathname;
  const current = ADMIN_NAV_ITEMS.find((item) => normalizedPathname.startsWith(item.href));
  const metadata = ROUTE_METADATA[normalizedPathname];
  const title = current?.title ?? metadata?.title ?? "SwiftDrop";
  const subtitle = current?.subtitle ?? metadata?.subtitle ?? "Operations Console";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:h-screen lg:grid-cols-[244px_1fr] lg:overflow-hidden">
      <aside className="border-b border-slate-200 bg-white px-3 py-4 lg:flex lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            SD
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-950">SwiftDrop</span>
            <span className="block text-sm text-slate-500">Operations Console</span>
          </span>
        </Link>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {ADMIN_NAV_ITEMS.map((item) => (
            <AdminNavLink
              key={item.href}
              item={item}
              active={normalizedPathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:mt-auto">
          <Link
            href="/profile"
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              normalizedPathname === "/profile"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={() => void logout().finally(() => router.replace("/"))}
            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50"
          >
            Log out
          </button>
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
              <HeaderBadge label="API" value=":8080" />
              <a
                href="http://localhost:8090"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
              >
                Kafka UI :8090
              </a>
              <UserBadge email={user.email} />
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

function isRouteMatch(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function AdminNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
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
          <span className="block truncate text-xs text-slate-500">{item.description}</span>
        </span>
      </div>
    </Link>
  );
}

function FullPageState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
      <div className="w-full max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-5">
        <h1 className="text-xl font-semibold text-slate-950">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-rose-700">
          {email} is signed in with role {role}. The operations console requires ADMIN.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
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
      <span className="text-slate-500">{label} </span>
      <span className="font-medium text-slate-950">{value}</span>
    </span>
  );
}

function UserBadge({ email }: { email: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
        {email.slice(0, 1).toUpperCase()}
      </span>
      <span className="font-medium text-slate-950">{email}</span>
    </span>
  );
}
