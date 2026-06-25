import type React from "react";
import { EmptyState, StatusBadge } from "@/components/ui";
import { formatDateTime, formatDisplayId, formatMoney } from "@/lib/format";
import { formatOrderStatus } from "@/lib/order-status";
import type { OrderResponse } from "@/types/api";

export function PortalMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <section className="min-h-28 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-2 break-words text-2xl font-semibold text-slate-950">{value}</div>
      {hint ? <div className="mt-2 max-w-full truncate rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-500" title={hint}>{hint}</div> : null}
    </section>
  );
}

export function PortalSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="px-5 pt-5">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action ? <div className="px-5 pt-5">{action}</div> : null}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

export function OrdersTable({
  orders,
  emptyMessage,
  columns,
  renderActions,
}: {
  orders: OrderResponse[];
  emptyMessage: string;
  columns: Array<"order" | "customer" | "merchant" | "driver" | "status" | "amount" | "created" | "actions">;
  renderActions?: (order: OrderResponse) => React.ReactNode;
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-6">
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                {columnLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {orders.map((order) => (
            <tr key={order.id} className="align-top transition-colors hover:bg-slate-50/60">
              {columns.map((column) => (
                <td key={column} className="px-4 py-3.5 text-slate-700">
                  {column === "actions" ? renderActions?.(order) ?? "-" : renderOrderCell(order, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function renderOrderCell(order: OrderResponse, column: string) {
  if (column === "order") {
    return <span className="font-medium text-slate-900">{formatDisplayId(order.id, "Order")}</span>;
  }
  if (column === "customer") {
    return <span>Customer account</span>;
  }
  if (column === "merchant") {
    return order.merchantName ?? "Merchant";
  }
  if (column === "driver") {
    return order.driverName ?? <span className="text-slate-400">Unassigned</span>;
  }
  if (column === "status") {
    return <StatusBadge status={order.status} label={formatOrderStatus(order.status)} />;
  }
  if (column === "amount") {
    return formatMoney(Number(order.totalAmount));
  }
  if (column === "created") {
    return formatDateTime(order.createdAt);
  }
  return "-";
}

function columnLabel(column: string) {
  const labels: Record<string, string> = {
    order: "Order",
    customer: "Customer",
    merchant: "Merchant",
    driver: "Courier",
    status: "Status",
    amount: "Amount",
    created: "Created At",
    actions: "Actions",
  };
  return labels[column] ?? column;
}
