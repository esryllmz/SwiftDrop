"use client";

import type React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ADMIN_ROUTES,
  isPublicRoute,
  isRouteMatch,
  resolveAuthPortal,
  resolvePortalRouteRole,
  resolveRoleRedirect,
} from "@/lib/routes";

type NavItem = {
  href: string;
  label: string;
  description: string;
  marker: React.ReactNode;
};

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Operational overview",
    marker: <DashboardIcon />,
  },
  {
    href: "/orders",
    label: "Orders",
    description: "Order operations",
    marker: <OrdersIcon />,
  },
  {
    href: "/drivers",
    label: "Drivers",
    description: "Courier availability",
    marker: <DriversIcon />,
  },
  {
    href: "/merchants",
    label: "Merchants",
    description: "Store locations",
    marker: <StoreIcon />,
  },
  {
    href: "/event-stream",
    label: "Event Stream",
    description: "Outbox events",
    marker: <EventIcon />,
  },
  {
    href: "/system-monitoring",
    label: "System Monitoring",
    description: "Service health",
    marker: <HealthIcon />,
  },
  {
    href: "/users-approvals",
    label: "Users & Approvals",
    description: "Access review",
    marker: <UsersIcon />,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Runtime config",
    marker: <SettingsIcon />,
  },
];

const ROUTE_ALIASES: Record<string, string> = {
  "/outbox": "/event-stream",
  "/health": "/system-monitoring",
};
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, user, logout } = useAuth();

  const isCurrentPublicRoute = isPublicRoute(pathname);
  const isAdminRoute = isRouteMatch(pathname, ADMIN_ROUTES);
  const portalRouteRole = resolvePortalRouteRole(pathname);
  const isChangePasswordRoute = pathname === "/change-password";

  useEffect(() => {
    if (!isLoading && isAdminRoute && !user) {
      router.replace("/auth?portal=staff");
    }
  }, [isAdminRoute, isLoading, router, user]);

  useEffect(() => {
    if (!isLoading && portalRouteRole && !user) {
      router.replace(`/auth?portal=${resolveAuthPortal(portalRouteRole)}`);
    }
  }, [isLoading, portalRouteRole, router, user]);

  useEffect(() => {
    if (!isLoading && user?.passwordChangeRequired && !isChangePasswordRoute) {
      router.replace("/change-password");
    }
  }, [isChangePasswordRoute, isLoading, router, user]);

  if (isChangePasswordRoute) {
    return <>{children}</>;
  }

  if (user?.passwordChangeRequired) {
    return (
      <FullPageState
        title="Password change required"
        message="Redirecting you to set a new password."
      />
    );
  }

  if (portalRouteRole) {
    if (isLoading) {
      return (
        <FullPageState
          title="Restoring session"
          message="Checking your session before opening this portal."
        />
      );
    }

    if (!user) {
      return (
        <FullPageState
          title="Authentication required"
          message="Redirecting to the correct portal login."
        />
      );
    }

    if (user.role !== portalRouteRole) {
      return (
        <AccessDenied
          email={user.email}
          role={user.role}
          message={`This portal requires ${portalRouteRole} access.`}
          actionHref={resolveRoleRedirect(user.role)}
          actionLabel="Go to your portal"
          onLogout={() => {
            void logout().finally(() => router.replace("/"));
          }}
        />
      );
    }

    return <>{children}</>;
  }

  if (isCurrentPublicRoute || !isAdminRoute) {
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
        message="The operations console requires ADMIN."
        actionHref={resolveRoleRedirect(user.role)}
        actionLabel="Go to your portal"
        onLogout={() => {
          void logout().finally(() => router.replace("/"));
        }}
      />
    );
  }

  const normalizedPathname = ROUTE_ALIASES[pathname] ?? pathname;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:h-screen lg:grid-cols-[240px_1fr] lg:overflow-hidden">
      <aside className="border-b border-slate-200 bg-white px-3 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r">
        <Link href="/dashboard" className="flex h-[72px] items-center gap-3 rounded-2xl px-2 transition hover:bg-slate-50">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-200">
            SD
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-950">SwiftDrop</span>
            <span className="block text-sm text-slate-500">Admin Panel</span>
          </span>
        </Link>

        <nav className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {ADMIN_NAV_ITEMS.map((item) => (
            <AdminNavLink
              key={item.href}
              item={item}
              active={normalizedPathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:mt-auto">
          <Link
            href="/profile"
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
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
            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
          <div className="flex min-h-14 items-center justify-end">
            <UserBadge email={user.email} />
          </div>
        </header>

        <main className="min-w-0 px-4 py-5 sm:px-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`min-w-[180px] rounded-xl border px-3 py-2.5 transition lg:min-w-0 ${
        active
          ? "border-blue-100 bg-blue-50 text-blue-700"
          : "border-transparent bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
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
  message,
  actionHref,
  actionLabel,
  onLogout,
}: {
  email: string;
  role: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-5">
        <h1 className="text-xl font-semibold text-slate-950">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-rose-700">
          {email} is signed in with role {role}. {message}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {actionLabel}
            </Link>
          ) : null}
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

function UserBadge({ email }: { email: string }) {
  return (
    <span className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm shadow-slate-200/60">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
        {email.slice(0, 1).toUpperCase()}
      </span>
      <span className="grid text-left">
        <span className="text-[11px] font-semibold uppercase text-slate-400">Admin</span>
        <span className="font-medium text-slate-950">{email}</span>
      </span>
    </span>
  );
}

function DashboardIcon() {
  return <span className="text-sm">D</span>;
}

function OrdersIcon() {
  return <span className="text-sm">O</span>;
}

function DriversIcon() {
  return <span className="text-sm">C</span>;
}

function StoreIcon() {
  return <span className="text-sm">M</span>;
}

function EventIcon() {
  return <span className="text-sm">E</span>;
}

function HealthIcon() {
  return <span className="text-sm">H</span>;
}

function UsersIcon() {
  return <span className="text-sm">U</span>;
}

function SettingsIcon() {
  return <span className="text-sm">S</span>;
}
