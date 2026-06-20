import type React from "react";
import Link from "next/link";

export type ShellNavItemConfig = {
  href: string;
  label: string;
  description: string;
  marker: React.ReactNode;
};

export function ShellNavItem({
  item,
  active,
}: {
  item: ShellNavItemConfig;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`flex min-w-[180px] items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors lg:min-w-0 ${
        active
          ? "bg-blue-50 font-medium text-blue-700"
          : "border-transparent bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <span className={`shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`}>{item.marker}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
