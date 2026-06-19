"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type PortalType = "customer" | "merchant" | "courier";

type PortalShellProps = {
  portalType: PortalType;
  email: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const portalConfig: Record<PortalType, {
  label: string;
  marker: string;
  homeHref: string;
  accent: string;
  active: string;
}> = {
  customer: {
    label: "Customer Portal",
    marker: "CU",
    homeHref: "/customer",
    accent: "bg-blue-600",
    active: "border-blue-200 bg-blue-50 text-blue-700",
  },
  merchant: {
    label: "Merchant Portal",
    marker: "ME",
    homeHref: "/merchant",
    accent: "bg-violet-600",
    active: "border-violet-200 bg-violet-50 text-violet-700",
  },
  courier: {
    label: "Courier Portal",
    marker: "CO",
    homeHref: "/courier",
    accent: "bg-emerald-600",
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

export function PortalShell({
  portalType,
  email,
  title,
  subtitle,
  children,
}: PortalShellProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const config = portalConfig[portalType];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:h-screen lg:grid-cols-[232px_1fr] lg:overflow-hidden">
      <aside className="border-b border-slate-200 bg-white px-3 py-4 lg:flex lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r">
        <Link href={config.homeHref} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white ${config.accent}`}>
            SD
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-950">SwiftDrop</span>
            <span className="block text-sm text-slate-500">{config.label}</span>
          </span>
        </Link>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          <Link
            href={config.homeHref}
            className={`min-w-[180px] rounded-xl border px-3 py-2.5 transition lg:min-w-0 ${config.active}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current bg-white text-[11px] font-semibold">
                {config.marker}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Dashboard</span>
                <span className="block truncate text-xs text-slate-500">Portal overview</span>
              </span>
            </div>
          </Link>
        </nav>

        <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:mt-auto">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs font-medium uppercase text-slate-500">Signed in</div>
            <div className="mt-1 break-all text-sm font-medium text-slate-950">{email}</div>
          </div>
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
              <HeaderBadge label="Portal" value={config.label} />
              <UserBadge email={email} />
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
