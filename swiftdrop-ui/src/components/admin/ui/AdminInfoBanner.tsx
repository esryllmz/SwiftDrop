import type React from "react";

type Tone = "blue" | "violet" | "emerald" | "amber" | "slate";

export function AdminInfoBanner({
  title,
  children,
  tone = "blue",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <section className={`rounded-xl border p-4 text-sm leading-6 ${toneClass[tone]}`}>
      {title ? <h3 className="mb-1 font-semibold text-slate-900">{title}</h3> : null}
      <div>{children}</div>
    </section>
  );
}

const toneClass: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-900",
  violet: "border-violet-100 bg-violet-50 text-violet-900",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-900",
  amber: "border-amber-100 bg-amber-50 text-amber-900",
  slate: "border-slate-100 bg-white text-slate-600 shadow-sm",
};
