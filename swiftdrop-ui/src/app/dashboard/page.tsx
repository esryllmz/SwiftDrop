"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { getJson } from "@/lib/api";
import type { DashboardSummaryResponse } from "@/types/api";

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJson<DashboardSummaryResponse>("/api/v1/dashboard/summary"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <PageHeader title="Dashboard" description="Live logistics and outbox summary." action={<Button onClick={load}>Refresh</Button>} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && !data ? <EmptyState message="No summary returned." /> : null}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.key}>
              <div className="text-sm text-slate-400">{metric.label}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{data[metric.key]}</div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
