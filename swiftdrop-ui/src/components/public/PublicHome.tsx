"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicApplicationModal } from "./PublicApplicationModal";
import { PortalCard, type PortalCardData } from "./PortalCard";

type ApplicationModalKind = "merchant" | "courier";

export function PublicHome() {
  const [activeModal, setActiveModal] = useState<ApplicationModalKind | null>(null);

  const portalCards: PortalCardData[] = [
    {
      title: "Customer Portal",
      description: "Order and track deliveries from one customer account.",
      icon: <PackageIcon />,
      accent: "blue",
      primaryLabel: "Login",
      primaryHref: "/auth?portal=customer",
      secondaryLabel: "Create Account",
      secondaryHref: "/auth?mode=register&portal=customer",
      note: "Instant customer access.",
    },
    {
      title: "Merchant Portal",
      description: "Manage store orders and preparation flow.",
      icon: <StoreIcon />,
      accent: "violet",
      primaryLabel: "Merchant Login",
      primaryHref: "/auth?portal=merchant",
      secondaryLabel: "Request merchant access",
      secondaryAction: () => setActiveModal("merchant"),
      note: "Approval required.",
    },
    {
      title: "Courier Portal",
      description: "Accept deliveries and update route progress.",
      icon: <TruckIcon />,
      accent: "emerald",
      primaryLabel: "Courier Login",
      primaryHref: "/auth?portal=courier",
      secondaryLabel: "Apply as courier",
      secondaryAction: () => setActiveModal("courier"),
      note: "Reviewed by operations.",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 text-slate-950">
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="SwiftDrop home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
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

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-8 pt-10 text-center sm:px-6 sm:pt-12 lg:px-8">
        <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
          SwiftDrop Delivery Operations
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Real-time order orchestration for customers, merchants, couriers and
          operations teams.
        </p>

        <div className="mt-8 grid w-full max-w-5xl gap-4 md:grid-cols-3">
          {portalCards.map((card) => (
            <PortalCard key={card.title} card={card} />
          ))}
        </div>
      </section>

      {activeModal && (
        <PublicApplicationModal kind={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </main>
  );
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
