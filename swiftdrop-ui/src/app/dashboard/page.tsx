"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  SecondaryButton,
} from "@/components/ui";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
  AdminDataTable,
  AdminIdChip,
  AdminTableCell,
} from "@/components/admin/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { getJson, postJson } from "@/lib/api";
import { formatDisplayId, formatMoney } from "@/lib/format";
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
    <div className="p-6 space-y-6">
      <AdminPageHeader
        icon="DB"
        title="Dashboard"
        description={`Operational overview - ${new Date().toLocaleDateString()}`}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

      <div>
        <DashboardSection
          title="Event Health Summary"
          action={<SectionLink href="/event-stream" label="Open Event Stream" />}
        >
          {outboxError ? <InlineError message={outboxError} /> : null}
          {outboxLoading && !summary ? <LoadingState /> : null}
          {summary ? (
            <div className="grid gap-4 sm:grid-cols-3">
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

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardSection
          title="Live Demo Flow"
          action={<AdminStatusBadge status={lastDemoOrder ? "COMPLETED" : "PENDING"} />}
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-3">
              {flowSteps.map((step, index) => (
                <FlowStep key={step.label} index={index + 1} {...step} />
              ))}
            </div>
            {lastDemoOrder ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {formatDisplayId(lastDemoOrder.id, "Order")} was created and dashboard data was refreshed.
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Run Demo creates a real order with the first available merchant.
              </div>
            )}
          </div>
        </DashboardSection>

        <DashboardSection
          title="Recent Orders"
          action={<SectionLink href="/orders" label="View all" />}
          className="xl:col-span-2"
        >
          {ordersError ? <InlineError message={ordersError} /> : null}
          {ordersLoading && orders.length === 0 ? <LoadingState /> : null}
          {!ordersLoading && !ordersError && orders.length === 0 ? (
            <EmptyState message="No recent orders found." />
          ) : null}
          {orders.length > 0 ? <RecentOrdersTable orders={orders} /> : null}
        </DashboardSection>
      </div>

      <div>
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
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AdminSectionCard title={title} description={description} action={action} className={className}>
      {children}
    </AdminSectionCard>
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
  return (
    <AdminMetricCard
      label={label}
      value={value}
      hint={hint}
      tone={tone === "green" ? "emerald" : tone}
      icon={icon}
      compact={compact}
    />
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
    <AdminDataTable
      columns={["Order", "Merchant", "Driver", "Status", "Amount"]}
      rows={orders}
      emptyMessage="No recent orders found."
      getRowKey={(order) => order.id}
      renderRow={(order) => (
        <>
          <AdminTableCell title={formatDisplayId(order.id, "Order")}><AdminIdChip value={order.id} prefix="Order" /></AdminTableCell>
          <AdminTableCell>{order.merchantName ?? "-"}</AdminTableCell>
          <AdminTableCell>{order.driverName ?? "-"}</AdminTableCell>
          <AdminTableCell><AdminStatusBadge status={order.status} /></AdminTableCell>
          <AdminTableCell>{formatMoney(Number(order.totalAmount))}</AdminTableCell>
        </>
      )}
    />
  );
}

function MiniHealthStrip({
  services,
}: {
  services?: HealthProxyResponse["services"] | null;
}) {
  const safeServices = Array.isArray(services) ? services : [];

  if (safeServices.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
        Health data unavailable.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {safeServices.map((service) => (
        <div
          key={service.name}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
        >
          <span className="text-sm font-medium text-slate-700">{service.name}</span>
          <AdminStatusBadge status={service.status || "UNKNOWN"} />
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
      detail: order ? `${formatDisplayId(order.id, "Order")} was created.` : "Waiting for demo order.",
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
