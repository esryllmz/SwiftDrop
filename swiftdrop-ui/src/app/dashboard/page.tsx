"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  JsonBlock,
  LoadingState,
  PageHeader,
  StatusBadge,
  SecondaryButton,
} from "@/components/ui";
import { getJson, postJson } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";
import type {
  DashboardSummaryResponse,
  OrderResponse,
  OutboxEventResponse,
} from "@/types/api";

const metrics: Array<{ key: keyof DashboardSummaryResponse; label: string }> = [
  { key: "totalOrders", label: "Total Orders" },
  { key: "placedOrders", label: "Placed Orders" },
  { key: "assignedOrders", label: "Assigned Orders" },
  { key: "deliveredOrders", label: "Delivered Orders" },
  { key: "availableDrivers", label: "Available Drivers" },
  { key: "busyDrivers", label: "Busy Drivers" },
  { key: "offlineDrivers", label: "Offline Drivers" },
  { key: "totalMerchants", label: "Total Merchants" },
  { key: "pendingOutboxEvents", label: "Pending Outbox" },
  { key: "sentOutboxEvents", label: "Sent Outbox" },
  { key: "failedOutboxEvents", label: "Failed Outbox" },
];

const demoOrderPayload = {
  customerId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  merchantId: "11111111-1111-1111-1111-111111111111",
  totalAmount: 249.9,
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [outboxEvents, setOutboxEvents] = useState<OutboxEventResponse[]>([]);
  const [lastDemoOrder, setLastDemoOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningDemo, setRunningDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResponse, ordersResponse, outboxResponse] =
        await Promise.all([
          getJson<DashboardSummaryResponse>("/api/v1/dashboard/summary"),
          getJson<OrderResponse[]>("/api/v1/orders"),
          getJson<OutboxEventResponse[]>("/api/v1/outbox-events"),
        ]);

      setSummary(summaryResponse);
      setOrders(ordersResponse.slice(0, 5));
      setOutboxEvents(outboxResponse.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboardData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboardData]);

  async function runDemoOrder() {
    setRunningDemo(true);
    setDemoError(null);
    setError(null);
    try {
      const created = await postJson<OrderResponse>(
        "/api/v1/orders",
        demoOrderPayload,
      );
      setLastDemoOrder(created);
      await loadDashboardData();
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Demo order failed");
    } finally {
      setRunningDemo(false);
    }
  }

  const flowSteps = useMemo(
    () => buildFlowSteps(lastDemoOrder, outboxEvents),
    [lastDemoOrder, outboxEvents],
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live logistics summary and one-click demo order flow."
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={loadDashboardData} disabled={loading || runningDemo}>
              Refresh
            </SecondaryButton>
            <Button onClick={runDemoOrder} disabled={runningDemo}>
              {runningDemo ? "Running demo flow..." : "Run Demo Order"}
            </Button>
          </div>
        }
      />

      {loading ? <LoadingState /> : null}
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {demoError ? <div className="mb-4"><ErrorState message={demoError} /></div> : null}
      {!loading && !error && !summary ? (
        <EmptyState message="No summary returned." />
      ) : null}

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.key}>
              <div className="text-sm text-slate-400">{metric.label}</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {summary[metric.key]}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Live Delivery Flow
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Run Demo Order triggers the real backend create-order flow.
              </p>
            </div>
            <StatusBadge status={lastDemoOrder ? "COMPLETED" : "PENDING"} />
          </div>
          <div className="grid gap-3">
            {flowSteps.map((step, index) => (
              <div key={step.label} className="flex gap-3">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    step.completed
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                      : "border-slate-700 bg-slate-950 text-slate-500"
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {step.label}
                  </div>
                  <div className="text-sm text-slate-400">{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Last Demo Result</h3>
          <p className="mt-1 text-sm text-slate-400">
            The response from the latest POST /api/v1/orders call.
          </p>
          <div className="mt-4">
            <JsonBlock value={lastDemoOrder ?? "No demo order has been run yet."} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-semibold text-white">
            Recent Orders
          </h3>
          {orders.length === 0 ? (
            <EmptyState message="No recent orders found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="text-left text-slate-400">
                  <tr>
                    {["id", "merchant", "driver", "status", "amount", "created"].map(
                      (heading) => (
                        <th key={heading} className="px-3 py-2 font-medium">
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-3 py-2 text-slate-300">{order.id}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {order.merchantName ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {order.driverName ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {formatMoney(Number(order.totalAmount))}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {formatDateTime(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-semibold text-white">
            Recent Outbox Events
          </h3>
          {outboxEvents.length === 0 ? (
            <EmptyState message="No recent outbox events found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="text-left text-slate-400">
                  <tr>
                    {["event", "aggregate", "topic", "status", "created"].map(
                      (heading) => (
                        <th key={heading} className="px-3 py-2 font-medium">
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {outboxEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-3 py-2 text-white">{event.eventType}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {event.aggregateType}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{event.topic}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {formatDateTime(event.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function buildFlowSteps(
  order: OrderResponse | null,
  events: OutboxEventResponse[],
) {
  const hasOrder = Boolean(order);
  const relatedEvents = order
    ? events.filter((event) => event.aggregateId === order.id)
    : [];
  const hasOutboxEvent = relatedEvents.length > 0 || hasOrder;
  const hasSentEvent =
    relatedEvents.some((event) => event.status === "SENT") ||
    events.some((event) => event.status === "SENT");

  return [
    {
      label: "API Gateway request",
      detail: "Dashboard posts the demo payload to /api/v1/orders.",
      completed: hasOrder,
    },
    {
      label: "Order persisted",
      detail: order ? `Order ${order.id} was created.` : "Waiting for order create.",
      completed: hasOrder,
    },
    {
      label: "Driver assigned",
      detail:
        order?.driverName || order?.status === "DRIVER_ASSIGNED"
          ? `Assigned to ${order.driverName ?? "driver"}.`
          : "Assignment is handled by logistics service.",
      completed:
        order?.status === "DRIVER_ASSIGNED" ||
        order?.status === "ASSIGNED" ||
        order?.status === "DELIVERED" ||
        Boolean(order?.driverName),
    },
    {
      label: "Outbox event stored",
      detail: hasOutboxEvent
        ? "Outbox records are visible in recent events."
        : "Waiting for outbox event.",
      completed: hasOutboxEvent,
    },
    {
      label: "Kafka event published",
      detail: hasSentEvent
        ? "At least one recent outbox event is SENT."
        : "Waiting for publisher to mark event SENT.",
      completed: hasSentEvent,
    },
    {
      label: "Notification consumed",
      detail: hasSentEvent
        ? "Notification service can consume the published Kafka event."
        : "Waiting for Kafka publish completion.",
      completed: hasSentEvent,
    },
  ];
}
