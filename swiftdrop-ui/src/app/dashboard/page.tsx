"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { getJson, postJson } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type {
  DashboardSummaryResponse,
  MerchantResponse,
  OrderResponse,
  OutboxEventResponse,
} from "@/types/api";

type Tone = "blue" | "amber" | "violet" | "green" | "emerald" | "slate" | "red";

type MetricDefinition = {
  key: keyof DashboardSummaryResponse;
  label: string;
  hint: string;
  tone: Tone;
  icon: string;
};

type HealthProxyResponse = {
  services: Array<{
    name: string;
    status: string;
  }>;
};

const fallbackCustomerId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const demoTotalAmount = 249.9;

const operationMetrics: MetricDefinition[] = [
  {
    key: "totalOrders",
    label: "Total Orders",
    hint: "All active records",
    tone: "blue",
    icon: "O",
  },
  {
    key: "placedOrders",
    label: "Placed",
    hint: "Awaiting progress",
    tone: "amber",
    icon: "P",
  },
  {
    key: "assignedOrders",
    label: "Driver Assigned",
    hint: "Courier in flow",
    tone: "violet",
    icon: "D",
  },
  {
    key: "deliveredOrders",
    label: "Delivered",
    hint: "Completed orders",
    tone: "emerald",
    icon: "D",
  },
  {
    key: "availableDrivers",
    label: "Available Drivers",
    hint: "Ready for assignment",
    tone: "green",
    icon: "A",
  },
  {
    key: "busyDrivers",
    label: "Busy Drivers",
    hint: "Currently assigned",
    tone: "violet",
    icon: "B",
  },
  {
    key: "offlineDrivers",
    label: "Offline Drivers",
    hint: "Not available",
    tone: "slate",
    icon: "F",
  },
  {
    key: "totalMerchants",
    label: "Total Merchants",
    hint: "Store network",
    tone: "blue",
    icon: "M",
  },
];

const eventMetrics: MetricDefinition[] = [
  {
    key: "pendingOutboxEvents",
    label: "Pending Events",
    hint: "Waiting to publish",
    tone: "amber",
    icon: "P",
  },
  {
    key: "sentOutboxEvents",
    label: "Sent Events",
    hint: "Published events",
    tone: "emerald",
    icon: "S",
  },
  {
    key: "failedOutboxEvents",
    label: "Failed Events",
    hint: "Needs attention",
    tone: "red",
    icon: "!",
  },
];

const toneClasses: Record<Tone, { icon: string; ring: string }> = {
  blue: {
    icon: "border-blue-200 bg-blue-50 text-blue-700",
    ring: "shadow-blue-100/50",
  },
  amber: {
    icon: "border-amber-200 bg-amber-50 text-amber-700",
    ring: "shadow-amber-100/50",
  },
  violet: {
    icon: "border-violet-200 bg-violet-50 text-violet-700",
    ring: "shadow-violet-100/50",
  },
  green: {
    icon: "border-green-200 bg-green-50 text-green-700",
    ring: "shadow-green-100/50",
  },
  emerald: {
    icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ring: "shadow-emerald-100/50",
  },
  slate: {
    icon: "border-slate-200 bg-slate-50 text-slate-600",
    ring: "shadow-slate-100/50",
  },
  red: {
    icon: "border-red-200 bg-red-50 text-red-700",
    ring: "shadow-red-100/50",
  },
};

export default function DashboardPage() {
  const { accessToken } = useAuth();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [outboxEvents, setOutboxEvents] = useState<OutboxEventResponse[]>([]);
  const [health, setHealth] = useState<HealthProxyResponse | null>(null);
  const [firstMerchantId, setFirstMerchantId] = useState<string | null>(null);
  const [lastDemoOrder, setLastDemoOrder] = useState<OrderResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [outboxLoading, setOutboxLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [merchantLoading, setMerchantLoading] = useState(true);
  const [runningDemo, setRunningDemo] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [outboxError, setOutboxError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      setSummary(
        await getJson<DashboardSummaryResponse>(
          "/api/v1/dashboard/summary",
          undefined,
          accessToken,
        ),
      );
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Summary request failed");
    } finally {
      setSummaryLoading(false);
    }
  }, [accessToken]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const response = await getJson<OrderResponse[]>("/api/v1/orders", undefined, accessToken);
      setOrders(response.slice(0, 5));
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : "Recent orders request failed");
    } finally {
      setOrdersLoading(false);
    }
  }, [accessToken]);

  const loadOutbox = useCallback(async () => {
    setOutboxLoading(true);
    setOutboxError(null);
    try {
      setOutboxEvents(
        await getJson<OutboxEventResponse[]>(
          "/api/v1/outbox-events?limit=5",
          undefined,
          accessToken,
        ),
      );
    } catch (err) {
      setOutboxError(err instanceof Error ? err.message : "Event summary request failed");
    } finally {
      setOutboxLoading(false);
    }
  }, [accessToken]);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      setHealth(await getJson<HealthProxyResponse>("/api/health"));
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : "Health request failed");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadFirstMerchant = useCallback(async () => {
    setMerchantLoading(true);
    try {
      const merchants = await getJson<MerchantResponse[]>(
        "/api/v1/merchants",
        undefined,
        accessToken,
      );
      setFirstMerchantId(merchants[0]?.id ?? null);
    } catch {
      setFirstMerchantId(null);
    } finally {
      setMerchantLoading(false);
    }
  }, [accessToken]);

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      loadSummary(),
      loadOrders(),
      loadOutbox(),
      loadHealth(),
      loadFirstMerchant(),
    ]);
  }, [loadFirstMerchant, loadHealth, loadOrders, loadOutbox, loadSummary]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshDashboard]);

  async function runDemoOrder() {
    setRunningDemo(true);
    setDemoError(null);
    try {
      const merchantId = firstMerchantId ?? (await fetchFirstMerchantId(accessToken));
      if (!merchantId) {
        setFirstMerchantId(null);
        setDemoError("No merchant is available for demo order.");
        return;
      }

      setFirstMerchantId(merchantId);
      const created = await postJson<OrderResponse>(
        "/api/v1/orders",
        {
          customerId: fallbackCustomerId,
          merchantId,
          totalAmount: demoTotalAmount,
        },
        undefined,
        accessToken,
      );
      setLastDemoOrder(created);
      await Promise.all([loadSummary(), loadOrders(), loadOutbox()]);
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Demo order failed");
    } finally {
      setRunningDemo(false);
    }
  }

  const flowSteps = useMemo(
    () => buildFlowSteps(lastDemoOrder, outboxEvents, summary),
    [lastDemoOrder, outboxEvents, summary],
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational overview"
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={refreshDashboard} disabled={runningDemo}>
              Refresh
            </SecondaryButton>
            <Button
              onClick={runDemoOrder}
              disabled={runningDemo || merchantLoading || firstMerchantId === null}
            >
              {runningDemo ? "Running..." : "Run Demo"}
            </Button>
          </div>
        }
      />

      {demoError ? (
        <div className="mb-4">
          <ErrorState message={demoError} />
        </div>
      ) : null}

      <DashboardSection
        title="Operations Summary"
        action={
          <span className="text-xs font-medium text-slate-500">
            {summaryLoading ? "Loading summary" : "Live backend data"}
          </span>
        }
      >
        {summaryError ? <InlineError message={summaryError} /> : null}
        {summaryLoading && !summary ? <LoadingState /> : null}
        {summary ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {operationMetrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={summary[metric.key]}
                hint={metric.hint}
                tone={metric.tone}
                icon={metric.icon}
              />
            ))}
          </div>
        ) : null}
      </DashboardSection>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardSection
          title="Live Demo Flow"
          action={<StatusBadge status={lastDemoOrder ? "COMPLETED" : "PENDING"} />}
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-3">
              {flowSteps.map((step, index) => (
                <FlowStep key={step.label} index={index + 1} {...step} />
              ))}
            </div>
            {lastDemoOrder ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Demo order {shortId(lastDemoOrder.id)} was created and dashboard data was refreshed.
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Run Demo creates a real order with the first available merchant.
              </div>
            )}
          </div>
        </DashboardSection>

        <DashboardSection
          title="Event Health Summary"
          action={<SectionLink href="/event-stream" label="Open Event Stream" />}
        >
          {outboxError ? <InlineError message={outboxError} /> : null}
          {outboxLoading && !summary ? <LoadingState /> : null}
          {summary ? (
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {eventMetrics.map((metric) => (
                <MetricCard
                  key={metric.key}
                  label={metric.label}
                  value={summary[metric.key]}
                  hint={metric.hint}
                  tone={metric.tone}
                  icon={metric.icon}
                  compact
                />
              ))}
            </div>
          ) : null}
        </DashboardSection>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardSection
          title="Recent Orders"
          action={<SectionLink href="/orders" label="View all" />}
        >
          {ordersError ? <InlineError message={ordersError} /> : null}
          {ordersLoading && orders.length === 0 ? <LoadingState /> : null}
          {!ordersLoading && !ordersError && orders.length === 0 ? (
            <EmptyState message="No recent orders found." />
          ) : null}
          {orders.length > 0 ? <RecentOrdersTable orders={orders} /> : null}
        </DashboardSection>

        <DashboardSection
          title="System Status"
          action={<SectionLink href="/system-monitoring" label="View system monitoring" />}
        >
          {healthError ? <InlineError message={healthError} /> : null}
          {healthLoading && !health ? <LoadingState /> : null}
          {health ? <MiniHealthStrip services={health.services} /> : null}
        </DashboardSection>
      </div>
    </div>
  );
}

async function fetchFirstMerchantId(accessToken: string | null) {
  const merchants = await getJson<MerchantResponse[]>(
    "/api/v1/merchants",
    undefined,
    accessToken,
  );
  return merchants[0]?.id ?? null;
}

function DashboardSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
  icon,
  compact = false,
}: {
  label: string;
  value: number;
  hint: string;
  tone: Tone;
  icon: string;
  compact?: boolean;
}) {
  const classes = toneClasses[tone];

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${classes.ring}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-600">{label}</div>
          <div className={`${compact ? "mt-1 text-2xl" : "mt-2 text-3xl"} font-semibold text-slate-950`}>
            {value}
          </div>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${classes.icon}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function FlowStep({
  index,
  label,
  detail,
  completed,
  passive,
}: {
  index: number;
  label: string;
  detail: string;
  completed: boolean;
  passive?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
          completed
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : passive
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-white text-slate-500"
        }`}
      >
        {index}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-950">{label}</div>
        <div className="mt-0.5 text-sm leading-6 text-slate-600">{detail}</div>
      </div>
    </div>
  );
}

function RecentOrdersTable({ orders }: { orders: OrderResponse[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            {["Order", "Merchant", "Driver", "Status", "Amount"].map((heading) => (
              <th key={heading} className="px-3 py-2 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {orders.map((order) => (
            <tr key={order.id} className="transition hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-950" title={order.id}>
                {shortId(order.id)}
              </td>
              <td className="px-3 py-2 text-slate-700">{order.merchantName ?? "-"}</td>
              <td className="px-3 py-2 text-slate-700">{order.driverName ?? "-"}</td>
              <td className="px-3 py-2">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-3 py-2 text-slate-700">
                {formatMoney(Number(order.totalAmount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniHealthStrip({
  services,
}: {
  services: HealthProxyResponse["services"];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => (
        <div
          key={service.name}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
        >
          <span className="text-sm font-medium text-slate-700">{service.name}</span>
          <StatusBadge status={service.status || "UNKNOWN"} />
        </div>
      ))}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
    >
      {label}
    </Link>
  );
}

function buildFlowSteps(
  order: OrderResponse | null,
  events: OutboxEventResponse[],
  summary: DashboardSummaryResponse | null,
) {
  const hasOrder = Boolean(order);
  const relatedEvents = order
    ? events.filter((event) => event.aggregateId === order.id)
    : [];
  const hasSentEvent =
    relatedEvents.some((event) => event.status === "SENT") ||
    Boolean(summary && summary.sentOutboxEvents > 0);

  return [
    {
      label: "Order Created",
      detail: order ? `Order ${shortId(order.id)} was created.` : "Waiting for demo order.",
      completed: hasOrder,
    },
    {
      label: "Driver Assigned",
      detail:
        order?.driverName || order?.status === "DRIVER_ASSIGNED"
          ? `Assigned to ${order.driverName ?? "driver"}.`
          : "Assignment is tracked by logistics service.",
      completed: hasOrder,
    },
    {
      label: "Outbox Stored",
      detail: hasOrder
        ? "Order creation stored an event for the pipeline."
        : "Waiting for demo order.",
      completed: hasOrder,
    },
    {
      label: "Kafka Published",
      detail: hasSentEvent
        ? "At least one event has been published."
        : "Waiting for a sent event.",
      completed: hasSentEvent,
    },
    {
      label: "Notification Consumed",
      detail: "Not directly tracked by dashboard data.",
      completed: false,
      passive: true,
    },
  ];
}

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}
