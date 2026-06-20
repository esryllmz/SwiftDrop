import type React from "react";

type Tone = "blue" | "amber" | "violet" | "green" | "emerald" | "red" | "slate";

const toneClass: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
  green: "border-green-100 bg-green-50 text-green-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  red: "border-red-100 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
};

export function AdminMetricCard({
  label,
  value,
  hint,
  tone = "blue",
  icon,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className={`${compact ? "mt-1 text-2xl" : "mt-2 text-3xl"} font-semibold text-slate-950`}>
            {value}
          </div>
        </div>
        {icon ? (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold ${toneClass[tone]}`}>
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? <div className="mt-3 text-xs leading-5 text-slate-500">{hint}</div> : null}
    </section>
  );
}
