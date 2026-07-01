import type React from "react";
import { getPortalTheme } from "@/lib/portal-theme";

export function AdminActionButton({
  children = "View",
  disabled,
  onClick,
}: {
  children?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  const theme = getPortalTheme("admin");
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors ${theme.brandHover} hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}
