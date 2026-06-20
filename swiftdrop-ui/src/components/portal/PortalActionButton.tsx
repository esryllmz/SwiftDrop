import type React from "react";

type PortalActionTone = "primary" | "success" | "warning" | "neutral";

const toneClasses: Record<PortalActionTone, string> = {
  primary: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
  success: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
  warning: "border-amber-500 bg-amber-500 text-white hover:bg-amber-600",
  neutral: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
};

export function PortalActionButton({
  label,
  icon,
  onClick,
  disabled = false,
  loading = false,
  tone = "primary",
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: PortalActionTone;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${toneClasses[tone]}`}
    >
      {icon}
      {loading ? "Working..." : label}
    </button>
  );
}
