import type React from "react";
import { EmptyState, StatusBadge } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function OrdersTable({
  orders,
  emptyMessage,
  columns,
}: {
  orders: OrderResponse[];
  emptyMessage: string;
  columns: Array<"order" | "customer" | "merchant" | "driver" | "status" | "amount" | "created">;
}) {
  if (orders.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-medium">
                {columnLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {orders.map((order) => (
            <tr key={order.id} className="align-top transition hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 text-slate-700">
                  {renderOrderCell(order, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderOrderCell(order: OrderResponse, column: string) {
  if (column === "order") {
    return <span title={order.id}>{shortId(order.id)}</span>;
  }
  if (column === "customer") {
    return <span title={order.customerId}>{shortId(order.customerId)}</span>;
  }
  if (column === "merchant") {
    return order.merchantName ?? (order.merchantId ? shortId(order.merchantId) : "-");
  }
  if (column === "driver") {
    return order.driverName ?? (order.driverId ? shortId(order.driverId) : "Unassigned");
  }
  if (column === "status") {
    return <StatusBadge status={order.status} />;
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
    driver: "Driver",
    status: "Status",
    amount: "Amount",
    created: "Created At",
  };
  return labels[column] ?? column;
}

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}
