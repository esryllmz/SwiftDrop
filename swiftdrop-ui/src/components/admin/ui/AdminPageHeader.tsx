import type React from "react";
import { getPortalTheme } from "@/lib/portal-theme";

export function AdminPageHeader({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const theme = getPortalTheme("admin");
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold ${theme.borderStrong} ${theme.surface} ${theme.accentText}`}>
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-2xl font-semibold tracking-normal text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
