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
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            {columns.map((heading) => (
              <th key={heading} className="whitespace-nowrap px-4 py-3 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="align-top transition hover:bg-slate-50/80">
              {renderRow(row)}
            </tr>
          ))}
        </tbody>
      </table>
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
      className={`px-4 py-3 ${strong ? "font-medium text-slate-950" : "text-slate-700"}`}
    >
      {children}
    </td>
  );
}
