import type React from "react";
import { EmptyState } from "@/components/ui";
import { getPortalTheme } from "@/lib/portal-theme";

export function AdminDataTable<T>({
  columns,
  rows,
  emptyMessage,
  getRowKey,
  renderRow,
}: {
  columns: string[];
  rows: T[];
  emptyMessage: string;
  getRowKey: (row: T) => string;
  renderRow: (row: T) => React.ReactNode;
}) {
  const theme = getPortalTheme("admin");
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className={`overflow-hidden rounded-xl border ${theme.table.wrapper}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
          <tr className={theme.table.head}>
            {columns.map((heading) => (
              <th key={heading} className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={theme.table.body}>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className={`align-top transition-colors ${theme.table.row}`}>
              {renderRow(row)}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function AdminTableCell({
  children,
  title,
  strong = false,
}: {
  children: React.ReactNode;
  title?: string;
  strong?: boolean;
}) {
  return (
    <td
      title={title}
      className={`px-5 py-3.5 ${strong ? "font-medium text-slate-950" : "text-slate-700"}`}
    >
      {children}
    </td>
  );
}
