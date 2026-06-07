import type React from "react";

type DetailFieldProps = {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  emptyText?: string;
};

export function DetailField({
  label,
  value,
  mono = false,
  emptyText = "-",
}: DetailFieldProps) {
  const hasValue = value !== undefined && value !== null && value !== "";

  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 break-words text-sm text-slate-900 ${
          mono ? "font-mono" : "font-medium"
        }`}
      >
        {hasValue ? value : emptyText}
      </div>
    </div>
  );
}
