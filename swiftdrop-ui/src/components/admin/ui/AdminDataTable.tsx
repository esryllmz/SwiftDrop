import type React from "react";
import { EmptyState } from "@/components/ui";

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
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            {columns.map((heading) => (
              <th key={heading} className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 bg-white">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="align-top transition-colors hover:bg-slate-50/60">
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
