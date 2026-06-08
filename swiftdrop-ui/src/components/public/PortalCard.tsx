import Link from "next/link";
import type { ReactNode } from "react";

export type PortalAccent = "blue" | "violet" | "emerald";

export type PortalCardData = {
  title: string;
  description: string;
  icon: ReactNode;
  accent: PortalAccent;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref?: string;
  secondaryAction?: () => void;
  note: string;
};

const accentClasses: Record<
  PortalAccent,
  {
    icon: string;
    primary: string;
    ring: string;
    rule: string;
  }
> = {
  blue: {
    icon: "border-blue-200 bg-blue-50 text-blue-700",
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600",
    ring: "hover:border-blue-300 hover:shadow-blue-100/80",
    rule: "bg-blue-600",
  },
  violet: {
    icon: "border-violet-200 bg-violet-50 text-violet-700",
    primary:
      "bg-violet-600 text-white hover:bg-violet-700 focus-visible:outline-violet-600",
    ring: "hover:border-violet-300 hover:shadow-violet-100/80",
    rule: "bg-violet-600",
  },
  emerald: {
    icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600",
    ring: "hover:border-emerald-300 hover:shadow-emerald-100/80",
    rule: "bg-emerald-600",
  },
};

const buttonBase =
  "flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function PortalCard({ card }: { card: PortalCardData }) {
  const classes = accentClasses[card.accent];

  return (
    <article
      className={`relative flex min-h-[286px] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition ${classes.ring}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${classes.rule}`} aria-hidden="true" />
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-lg border ${classes.icon}`}
        aria-hidden="true"
      >
        {card.icon}
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-semibold text-slate-950">{card.title}</h2>
        <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-600">
          {card.description}
        </p>
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <Link href={card.primaryHref} className={`${buttonBase} ${classes.primary}`}>
          {card.primaryLabel}
        </Link>
        {card.secondaryHref ? (
          <Link
            href={card.secondaryHref}
            className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-500`}
          >
            {card.secondaryLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={card.secondaryAction}
            className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-500`}
          >
            {card.secondaryLabel}
          </button>
        )}
      </div>
      <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
        {card.note}
      </p>
    </article>
  );
}
