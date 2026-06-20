"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserIdentity } from "@/components/layout/UserIdentity";

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
    <div className="flex min-h-screen bg-slate-50 text-slate-950 lg:h-screen lg:overflow-hidden">
      <aside className="w-full shrink-0 border-b border-slate-100 bg-white lg:flex lg:h-screen lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
        <Link href={config.homeHref} className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-5 transition hover:bg-slate-50">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ${config.accent}`}>
            SD
          </span>
          <span className="min-w-0">
            <span className="mb-0.5 block text-sm font-semibold leading-none text-slate-900">SwiftDrop</span>
            <span className="block text-xs text-slate-400">{config.label}</span>
          </span>
        </Link>

        <nav className="flex gap-1 overflow-x-auto px-3 py-4 lg:flex-1 lg:flex-col lg:overflow-y-auto">
          <Link
            href={config.homeHref}
            className={`min-w-[180px] rounded-lg border px-3 py-2.5 transition lg:min-w-0 ${config.active}`}
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

        <div className="grid gap-0.5 border-t border-slate-100 px-3 py-3">
          <div className="rounded-lg px-3 py-2 text-sm text-slate-600">
            <div className="text-xs font-medium uppercase text-slate-400">Signed in</div>
            <div className="mt-1 break-all font-medium text-slate-900">{email}</div>
          </div>
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
          <div className="flex min-h-14 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <HeaderBadge label="Portal" value={config.label} />
              <UserIdentity email={email} label={config.label.replace(" Portal", "")} />
            </div>
          </div>
        </header>

        <main className="min-w-0 p-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
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
