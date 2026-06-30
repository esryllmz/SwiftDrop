"use client";

import type React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ShellNavItem, type ShellNavItemConfig } from "@/components/layout/ShellNavItem";
import { UserIdentity } from "@/components/layout/UserIdentity";
import {
  ADMIN_ROUTES,
  isPublicRoute,
  isRouteMatch,
  resolveAuthPortal,
  resolvePortalRouteRole,
  resolveRoleRedirect,
} from "@/lib/routes";
import { formatStatusLabel } from "@/lib/format";

const ADMIN_NAV_ITEMS: ShellNavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    marker: <DashboardIcon />,
  },
  {
    href: "/orders",
    label: "Orders",
    marker: <OrdersIcon />,
  },
  {
    href: "/drivers",
    label: "Couriers",
    marker: <DriversIcon />,
  },
  {
    href: "/merchants",
    label: "Merchants",
    marker: <StoreIcon />,
  },
  {
    href: "/event-stream",
    label: "Event Stream",
    marker: <EventIcon />,
  },
  {
    href: "/system-monitoring",
    label: "System Monitoring",
    marker: <HealthIcon />,
  },
  {
    href: "/users-approvals",
    label: "Users & Approvals",
    marker: <UsersIcon />,
  },
  {
    href: "/settings",
    label: "Settings",
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
  const portalRouteRole = resolvePortalRouteRole(pathname);
  const isChangePasswordRoute = pathname === "/change-password";
  const isAdminRoute = !isChangePasswordRoute && isRouteMatch(pathname, ADMIN_ROUTES);

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
          message={`This portal requires ${formatStatusLabel(portalRouteRole)} access.`}
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
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950 lg:h-screen lg:flex-row lg:overflow-hidden">
      <aside className="w-full shrink-0 border-b border-slate-100 bg-white lg:flex lg:h-screen lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
        <Link href="/dashboard" className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-5 transition hover:bg-slate-50">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
            SD
          </span>
          <span className="min-w-0">
            <span className="mb-0.5 block text-sm font-semibold leading-none text-slate-900">SwiftDrop</span>
            <span className="block text-xs text-slate-400">Operations Console</span>
          </span>
        </Link>

        <nav className="flex gap-1 overflow-x-auto px-3 py-4 lg:flex-1 lg:flex-col lg:overflow-y-auto">
          {ADMIN_NAV_ITEMS.map((item) => (
            <ShellNavItem
              key={item.href}
              item={item}
              active={normalizedPathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <div className="grid gap-0.5 border-t border-slate-100 px-3 py-3">
          <Link
            href="/profile"
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              normalizedPathname === "/profile"
                ? "bg-blue-50 font-medium text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={() => void logout().finally(() => router.replace("/"))}
            className="rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:flex lg:min-h-0 lg:flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white px-6 py-3">
          <div className="flex min-h-14 items-center justify-end">
            <UserIdentity email={user.email} />
          </div>
        </header>

        <main className="min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
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
