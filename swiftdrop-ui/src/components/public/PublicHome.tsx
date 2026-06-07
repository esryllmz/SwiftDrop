"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PortalCard, type PortalCardData } from "./PortalCard";

type ServiceStatus = "UP" | "DOWN" | "UNKNOWN";

type HealthResponse = {
  services?: Array<{
    name?: string;
    status?: string;
  }>;
};

const expectedServices = ["Gateway", "Auth", "Logistics", "Notification"];

const technicalBadges = [
  "Dockerized Backend",
  "API Gateway",
  "Transactional Outbox",
  "Kafka Events",
  "Redis Idempotency",
  "HttpOnly Cookie Auth",
];

const portalCards: PortalCardData[] = [
  {
    title: "Customer Portal",
    description: "Order and track deliveries",
    icon: <PackageIcon />,
    accent: "blue",
    primaryLabel: "Login",
    primaryHref: "/auth?portal=customer",
    secondaryLabel: "Create Account",
    secondaryHref: "/auth?mode=register&portal=customer",
    note: "Public registration creates a customer account only.",
  },
  {
    title: "Merchant Portal",
    description: "Manage incoming store orders",
    icon: <StoreIcon />,
    accent: "violet",
    primaryLabel: "Merchant Login",
    primaryHref: "/auth?portal=merchant",
    secondaryLabel: "Request merchant access",
    secondaryHref: "/auth?portal=merchant&mode=request",
    note: "Merchant accounts require admin approval.",
  },
  {
    title: "Courier Portal",
    description: "Accept and complete deliveries",
    icon: <TruckIcon />,
    accent: "emerald",
    primaryLabel: "Courier Login",
    primaryHref: "/auth?portal=courier",
    secondaryLabel: "Apply as courier",
    secondaryHref: "/auth?portal=courier&mode=apply",
    note: "Courier accounts are reviewed by operations.",
  },
];

export function PublicHome() {
  const [services, setServices] = useState<Record<string, ServiceStatus>>(() =>
    Object.fromEntries(
      expectedServices.map((service) => [service, "UNKNOWN" as const]),
    ),
  );

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Health check failed with ${response.status}`);
        }
        const data = (await response.json()) as HealthResponse;
        const next = Object.fromEntries(
          expectedServices.map((service) => [service, "UNKNOWN" as ServiceStatus]),
        );

        for (const service of data.services ?? []) {
          if (!service.name || !(service.name in next)) {
            continue;
          }
          next[service.name] = normalizeStatus(service.status);
        }

        if (active) {
          setServices(next);
        }
      } catch {
        if (active) {
          setServices(
            Object.fromEntries(
              expectedServices.map((service) => [service, "DOWN" as const]),
            ),
          );
        }
      }
    }

    void loadHealth();

    return () => {
      active = false;
    };
  }, []);

  const isFullyLive = useMemo(
    () => expectedServices.every((service) => services[service] === "UP"),
    [services],
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="SwiftDrop home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <LightningIcon />
            </span>
            <span className="text-base font-semibold text-slate-950">SwiftDrop</span>
          </Link>
          <Link
            href="/auth?portal=staff"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            Staff access
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
            isFullyLive
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isFullyLive ? "bg-blue-600" : "bg-amber-500"
            }`}
          />
          {isFullyLive ? "Live Demo Environment" : "Demo Environment Degraded"}
        </div>

        <h1 className="mt-7 max-w-4xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
          SwiftDrop Delivery Operations
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Real-time order orchestration for customers, merchants, couriers and
          operations teams.
        </p>

        <div className="mt-12 grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portalCards.map((card) => (
            <PortalCard key={card.title} card={card} />
          ))}
        </div>

        <ServiceStatusStrip services={services} />

        <div className="mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
          {technicalBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">
        Authorized operations staff only
      </footer>
    </main>
  );
}

function ServiceStatusStrip({
  services,
}: {
  services: Record<string, ServiceStatus>;
}) {
  return (
    <div className="mt-8 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      {expectedServices.map((service) => (
        <span
          key={service}
          className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium text-slate-600"
        >
          <StatusDot status={services[service] ?? "UNKNOWN"} />
          {service}
        </span>
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: ServiceStatus }) {
  const color =
    status === "UP" ? "bg-emerald-500" : status === "DOWN" ? "bg-red-500" : "bg-amber-500";

  return <span className={`h-2 w-2 rounded-full ${color}`} aria-label={status} />;
}

function normalizeStatus(status: string | undefined): ServiceStatus {
  if (status === "UP" || status === "DOWN") {
    return status;
  }

  return "UNKNOWN";
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M13 2 5 13h6l-1 9 9-13h-6l1-7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="m4.5 7.5 7.5 4.25 7.5-4.25M12 12v8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 10h16l-1.5-6h-13L4 10Zm1 0v10h14V10"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3 6h11v11H3V6Zm14 5h2l2 3v3h-4v-6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
