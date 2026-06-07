import type React from "react";

type AdvancedDetailsProps = {
  title?: string;
  children: React.ReactNode;
};

export function AdvancedDetails({
  title = "Technical details",
  children,
}: AdvancedDetailsProps) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
        {title}
      </summary>
      <div className="border-t border-slate-200 p-3">{children}</div>
    </details>
  );
}
