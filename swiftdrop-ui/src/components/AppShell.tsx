"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Summary and demo flow",
    marker: "DB",
    title: "Dashboard",
  },
  {
    href: "/orders",
    label: "Orders",
    description: "Create, filter, inspect",
    marker: "OR",
    title: "Orders",
  },
  {
    href: "/drivers",
    label: "Drivers",
    description: "Availability and locks",
    marker: "DR",
    title: "Drivers",
  },
  {
    href: "/merchants",
    label: "Merchants",
    description: "Geo search centers",
    marker: "ME",
    title: "Merchants",
  },
  {
    href: "/outbox",
    label: "Event Stream",
    description: "Outbox and Kafka",
    marker: "EV",
    title: "Event Stream",
  },
  {
    href: "/health",
    label: "System Health",
    description: "Service probes",
    marker: "UP",
    title: "System Health",
  },
  {
    href: "/auth",
    label: "Auth",
    description: "Token playground",
    marker: "AU",
    title: "Auth Playground",
  },
];

const stackItems = ["Gateway", "Auth", "Logistics", "Notification", "Kafka", "Redis"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  const current = navItems.find((item) => pathname.startsWith(item.href));
  const title = current?.title ?? "SwiftDrop";

  return (
    <div className="min-h-screen bg-slate-950 lg:grid lg:h-screen lg:grid-cols-[280px_1fr] lg:overflow-hidden">
      <aside className="border-b border-slate-800 bg-slate-950 px-4 py-4 lg:flex lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r">
        <Link href="/dashboard" className="block rounded-md border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-white">SwiftDrop</div>
              <div className="mt-1 text-sm text-slate-400">
                Event-driven delivery ops
              </div>
            </div>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
              Docker Local
            </span>
          </div>
        </Link>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-w-[180px] rounded-md border px-3 py-3 transition lg:min-w-0 ${
                  active
                    ? "border-blue-500/40 bg-blue-500/10 text-white shadow-[inset_3px_0_0_rgba(59,130,246,0.9)]"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${
                      active
                        ? "border-violet-400/50 bg-violet-500/20 text-violet-100"
                        : "border-slate-700 bg-slate-900 text-slate-400"
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

        <div className="mt-4 rounded-md border border-slate-800 bg-slate-900/50 p-3 lg:mt-auto">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Backend Stack
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {stackItems.map((item) => (
              <span
                key={item}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
        <header className="border-b border-slate-800 bg-slate-950/95 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
              <p className="mt-1 text-sm text-slate-400">
                Real backend data via Docker local services. Refresh controls live inside each page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <HeaderBadge label="API Gateway" value="localhost:8080" />
              <a
                href="http://localhost:8090"
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 transition hover:bg-violet-500/20"
              >
                Kafka UI: localhost:8090
              </a>
              <HeaderBadge label="Environment" value="Docker Local" />
              <Link
                href="/auth"
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Auth Playground
              </Link>
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
    <span className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
      <span className="text-slate-500">{label}: </span>
      <span className="font-medium text-slate-100">{value}</span>
    </span>
  );
}
