import type React from "react";
import Link from "next/link";
import { getPortalTheme } from "@/lib/portal-theme";

export type ShellNavItemConfig = {
  href: string;
  label: string;
  marker: React.ReactNode;
};

export function ShellNavItem({
  item,
  active,
}: {
  item: ShellNavItemConfig;
  active: boolean;
}) {
  const theme = getPortalTheme("admin");
  return (
    <Link
      href={item.href}
      className={`flex min-w-[180px] items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors lg:min-w-0 ${
        active
          ? `${theme.navActive} font-medium`
          : `${theme.navHover} bg-white`
      }`}
    >
      <span className={`shrink-0 ${active ? theme.accentText : "text-slate-400"}`}>{item.marker}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
