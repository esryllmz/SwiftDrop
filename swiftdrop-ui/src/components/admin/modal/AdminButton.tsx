import type React from "react";
import { getPortalTheme } from "@/lib/portal-theme";

type AdminButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "success";
};

const adminTheme = getPortalTheme("admin");

const variantClass = {
  primary: adminTheme.button,
  secondary: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border-red-600 bg-red-600 text-white hover:bg-red-700",
  success: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
};

export function AdminButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: AdminButtonProps) {
  return (
    <button
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
