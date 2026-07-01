"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserIdentity } from "@/components/layout/UserIdentity";

type PortalType = "customer" | "merchant" | "courier";
type PortalNavItem = {
  href: string;
  label: string;
  description: string;
};

type PortalShellProps = {
  portalType: PortalType;
  email: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const portalConfig: Record<PortalType, {
  label: string;
  homeHref: string;
  accent: string;
  active: string;
  navItems: PortalNavItem[];
}> = {
  customer: {
    label: "Customer Portal",
    homeHref: "/customer",
    accent: "bg-orange-600",
    active: "border-orange-200 bg-orange-50 text-orange-800",
    navItems: [
      { href: "/customer", label: "Dashboard", description: "Portal overview" },
      { href: "/customer/orders", label: "Orders", description: "Order history" },
      { href: "/customer/addresses", label: "Addresses", description: "Delivery addresses" },
      { href: "/customer/profile", label: "Profile", description: "Account details" },
    ],
  },
  merchant: {
    label: "Merchant Portal",
    homeHref: "/merchant",
    accent: "bg-violet-600",
    active: "border-violet-200 bg-violet-50 text-violet-700",
    navItems: [
      { href: "/merchant", label: "Dashboard", description: "Store overview" },
      { href: "/merchant/orders", label: "Orders", description: "Order workflow" },
      { href: "/merchant/store", label: "Store", description: "Store profile" },
      { href: "/merchant/analytics", label: "Analytics", description: "Order metrics" },
      { href: "/merchant/profile", label: "Profile", description: "Account details" },
    ],
  },
  courier: {
    label: "Courier Portal",
    homeHref: "/courier",
    accent: "bg-emerald-600",
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    navItems: [
      { href: "/courier", label: "Dashboard", description: "Courier overview" },
      { href: "/courier/assignments", label: "Assignments", description: "Active delivery work" },
      { href: "/courier/history", label: "History", description: "Completed deliveries" },
      { href: "/courier/profile", label: "Profile", description: "Account details" },
    ],
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
  const pathname = usePathname();
  const { logout } = useAuth();
  const config = portalConfig[portalType];
  const customer = portalType === "customer";

  return (
    <div className={`flex min-h-screen flex-col text-slate-950 lg:h-screen lg:flex-row lg:overflow-hidden ${
      customer ? "bg-orange-50" : "bg-slate-50"
    }`}>
      <aside className={`w-full shrink-0 border-b lg:flex lg:h-screen lg:w-60 lg:flex-col lg:border-b-0 lg:border-r ${
        customer ? "border-orange-100 bg-white/95" : "border-slate-100 bg-white"
      }`}>
        <Link href={config.homeHref} className={`flex items-center gap-2.5 border-b px-4 py-5 transition ${
          customer ? "border-orange-100 hover:bg-orange-50" : "border-slate-100 hover:bg-slate-50"
        }`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ${
            customer ? "bg-orange-600" : config.accent
          }`}>
            SD
          </span>
          <span className="min-w-0">
            <span className="mb-0.5 block text-sm font-semibold leading-none text-slate-900">SwiftDrop</span>
            <span className={customer ? "block text-xs text-orange-700" : "block text-xs text-slate-400"}>{config.label}</span>
          </span>
        </Link>

        <nav className="flex gap-1 overflow-x-auto px-3 py-4 lg:flex-1 lg:flex-col lg:overflow-y-auto">
          {config.navItems.map((item) => {
            const active = isPortalNavActive(portalType, item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-w-[180px] rounded-lg border px-3 py-2.5 transition lg:min-w-0 ${
                  active
                    ? config.active
                    : customer
                      ? "border-transparent text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-900"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-white text-[11px] font-semibold ${
                    active && customer ? "border-orange-300 text-orange-700" : "border-current"
                  }`}>
                    {item.label.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-slate-500">{item.description}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className={`grid gap-0.5 border-t px-3 py-3 ${customer ? "border-orange-100" : "border-slate-100"}`}>
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
        <header className={`sticky top-0 z-30 border-b ${
          customer ? "border-orange-100 bg-white/90 backdrop-blur" : "border-slate-100 bg-white"
        } ${customer ? "px-4 py-2" : "px-6 py-3"}`}>
          <div className={`flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between ${customer ? "min-h-12" : "min-h-14"}`}>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <HeaderBadge label="Portal" value={config.label} customer={customer} />
              <UserIdentity email={email} label={config.label.replace(" Portal", "")} />
            </div>
          </div>
        </header>

        <main className={`min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto ${customer ? "p-4" : "p-6"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

function isPortalNavActive(portalType: PortalType, href: string, pathname: string) {
  if (portalType === "customer") {
    if (href === "/customer") {
      return pathname === "/customer";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function HeaderBadge({ label, value, customer }: { label: string; value: string; customer: boolean }) {
  return (
    <span className={`rounded-lg border px-3 py-2 text-xs ${
      customer ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200 bg-slate-50 text-slate-600"
    }`}>
      <span className="text-slate-500">{label} </span>
      <span className="font-medium text-slate-950">{value}</span>
    </span>
  );
}
