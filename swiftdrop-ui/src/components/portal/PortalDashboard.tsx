import type React from "react";
import { EmptyState, StatusBadge } from "@/components/ui";
import { formatDateTime, formatDisplayId, formatMoney } from "@/lib/format";
import { formatOrderStatus } from "@/lib/order-status";
import { getPortalTheme, type PortalThemeKey } from "@/lib/portal-theme";
import type { OrderResponse } from "@/types/api";

export function PortalMetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  theme,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "neutral" | "sunrise" | "mint" | "berry" | "ink";
  theme?: PortalThemeKey;
  compact?: boolean;
}) {
  const toneClass = theme ? themedMetricClass(theme) : metricToneClass(tone);
  return (
    <section className={`${compact ? "min-h-20 p-3" : "min-h-28 p-4"} overflow-hidden rounded-lg border shadow-sm ${toneClass.shell}`}>
      <div className={`text-xs font-semibold uppercase ${toneClass.label}`}>{label}</div>
      <div className={`${compact ? "mt-1 text-xl" : "mt-2 text-2xl"} break-words font-semibold ${toneClass.value}`}>{value}</div>
      {hint ? <div className={`mt-2 max-w-full truncate rounded-md px-2 py-1 text-xs ${toneClass.hint}`} title={hint}>{hint}</div> : null}
    </section>
  );
}

export function PortalSection({
  title,
  description,
  action,
  children,
  tone = "neutral",
  theme,
  compact = false,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "customer";
  theme?: PortalThemeKey;
  compact?: boolean;
}) {
  const resolvedTheme = theme ?? (tone === "customer" ? "customer" : undefined);
  const sectionClass = resolvedTheme
    ? getPortalTheme(resolvedTheme).card
    : "border-slate-200 bg-white shadow-sm shadow-slate-200/60";
  return (
    <section className={`rounded-lg border ${sectionClass}`}>
      <div className={`${compact ? "mb-3" : "mb-4"} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className={`${compact ? "px-4 pt-4" : "px-5 pt-5"}`}>
          <h2 className={`${compact ? "text-base" : "text-lg"} font-semibold text-slate-950`}>{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        {action ? <div className={`${compact ? "px-4 pt-4" : "px-5 pt-5"}`}>{action}</div> : null}
      </div>
      <div className={`${compact ? "px-4 pb-4" : "px-5 pb-5"}`}>{children}</div>
    </section>
  );
}

export function OrdersTable({
  orders,
  emptyMessage,
  columns,
  renderActions,
  variant = "neutral",
  theme,
}: {
  orders: OrderResponse[];
  emptyMessage: string;
  columns: Array<"order" | "customer" | "merchant" | "driver" | "status" | "amount" | "created" | "actions">;
  renderActions?: (order: OrderResponse) => React.ReactNode;
  variant?: "neutral" | "customer";
  theme?: PortalThemeKey;
}) {
  const resolvedTheme = theme ?? (variant === "customer" ? "customer" : undefined);
  const tableClass = resolvedTheme
    ? getPortalTheme(resolvedTheme).table
    : {
        wrapper: "border-slate-200 bg-white",
        head: "border-b border-slate-200 bg-slate-50",
        body: "divide-y divide-slate-100 bg-white",
        row: "hover:bg-slate-50/60",
        empty: "border-slate-200 bg-slate-50/70",
      };
  if (orders.length === 0) {
    return (
      <div className={`rounded-lg border border-dashed p-6 ${tableClass.empty}`}>
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border ${tableClass.wrapper}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
          <tr className={tableClass.head}>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                {columnLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={tableClass.body}>
          {orders.map((order) => (
            <tr key={order.id} className={`align-top transition-colors ${tableClass.row}`}>
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

function themedMetricClass(theme: PortalThemeKey) {
  const portalTheme = getPortalTheme(theme);
  return {
    shell: portalTheme.metric,
    label: portalTheme.accentText,
    value: portalTheme.accentSoftText,
    hint: "bg-white/70 text-slate-700",
  };
}

function metricToneClass(tone: "neutral" | "sunrise" | "mint" | "berry" | "ink") {
  const tones = {
    neutral: {
      shell: "border-slate-200 bg-white shadow-slate-200/60",
      label: "text-slate-500",
      value: "text-slate-950",
      hint: "bg-slate-50 text-slate-500",
    },
    sunrise: {
      shell: "border-orange-200 bg-orange-50 shadow-orange-100/80",
      label: "text-orange-700",
      value: "text-orange-950",
      hint: "bg-white/70 text-orange-800",
    },
    mint: {
      shell: "border-emerald-200 bg-emerald-50 shadow-emerald-100/80",
      label: "text-emerald-700",
      value: "text-emerald-950",
      hint: "bg-white/70 text-emerald-800",
    },
    berry: {
      shell: "border-rose-200 bg-rose-50 shadow-rose-100/80",
      label: "text-rose-700",
      value: "text-rose-950",
      hint: "bg-white/70 text-rose-800",
    },
    ink: {
      shell: "border-indigo-200 bg-indigo-50 shadow-indigo-100/80",
      label: "text-indigo-700",
      value: "text-indigo-950",
      hint: "bg-white/70 text-indigo-800",
    },
  };

  return tones[tone];
}

function renderOrderCell(order: OrderResponse, column: string) {
  if (column === "order") {
    return <span className="font-medium text-slate-900">{formatDisplayId(order.id, "Order")}</span>;
  }
  if (column === "customer") {
    return <span>Customer account</span>;
  }
  if (column === "merchant") {
    return order.merchantName ?? "Not available";
  }
  if (column === "driver") {
    if (order.driverName || order.driverEmail) {
      return (
        <span className="grid gap-0.5">
          <span>{order.driverName ?? "Not available"}</span>
          {order.driverEmail ? <span className="text-xs text-slate-500">{order.driverEmail}</span> : null}
        </span>
      );
    }

    return <span className="text-slate-500">Awaiting courier assignment</span>;
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
