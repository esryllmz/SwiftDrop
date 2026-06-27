"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, EmptyState, ErrorState } from "@/components/ui";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/ui";
import { getJson } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  normalizeSystemMonitoringResponse,
  type HealthComponent,
  type HealthStatus,
  type SystemMonitoringResponse,
} from "@/lib/system-monitoring";
import { useAuth } from "@/components/auth/AuthProvider";

export function SystemMonitoringPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<SystemMonitoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulRefresh, setLastSuccessfulRefresh] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setError(null);
    setRefreshing(true);
    try {
      const raw = await getJson<unknown>(
        "/api/v1/admin/system-monitoring",
        { signal },
        accessToken,
      );
      const normalized = normalizeSystemMonitoringResponse(raw);
      setData(normalized);
      setLastSuccessfulRefresh(normalized.checkedAt);
    } catch (err) {
      if (signal?.aborted) {
        return;
      }
      setError(
        err instanceof Error && err.message
          ? `Unable to load system health data. ${err.message}`
          : "Unable to load system health data.",
      );
    } finally {
      inFlightRef.current = false;
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [accessToken]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const services = data?.services ?? [];
  const infrastructure = data?.infrastructure ?? [];
  const healthyCount = [...services, ...infrastructure].filter((entry) => entry.status === "UP").length;
  const unavailableCount = [...services, ...infrastructure].filter((entry) => entry.status === "DOWN").length;
  const hasHealthData = services.length > 0 || infrastructure.length > 0;

  return (
    <div className="space-y-5 p-6">
      <AdminPageHeader
        icon="UP"
        title="System Monitoring"
        description="Service health and infrastructure status."
        action={
          <Button onClick={() => void load()} disabled={loading || refreshing}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </Button>
        }
      />

      {loading ? <MonitoringSkeleton /> : null}

      {!loading && error ? (
        <AdminSectionCard>
          <ErrorState message={error} />
          {!data ? (
            <Button className="mt-4" onClick={() => void load()} disabled={refreshing}>
              Retry
            </Button>
          ) : null}
        </AdminSectionCard>
      ) : null}

      {!loading && data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard
              label="Overall status"
              value={<AdminStatusBadge status={data.overallStatus} />}
              tone={healthTone(data.overallStatus)}
              icon="S"
              compact
            />
            <AdminMetricCard
              label="Last checked"
              value={formatDateTime(lastSuccessfulRefresh ?? data.checkedAt)}
              hint="Backend checkedAt timestamp"
              tone="blue"
              icon="T"
              compact
            />
            <AdminMetricCard
              label="Healthy components"
              value={formatCount(healthyCount)}
              hint="Services and infrastructure reporting Healthy"
              tone="emerald"
              icon="H"
              compact
            />
            <AdminMetricCard
              label="Unavailable components"
              value={formatCount(unavailableCount)}
              hint="Services and infrastructure reporting Unavailable"
              tone={unavailableCount > 0 ? "red" : "slate"}
              icon="!"
              compact
            />
          </div>

          {!hasHealthData ? (
            <EmptyState message="No service health data is available." />
          ) : null}

          {services.length > 0 ? (
            <AdminSectionCard
              title="Services"
              description="Health reported by the configured service endpoints."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {services.map((service) => (
                  <ComponentCard key={service.key} component={service} />
                ))}
              </div>
            </AdminSectionCard>
          ) : null}

          <AdminSectionCard
            title="Infrastructure"
            description="Infrastructure components exposed by service health endpoints."
          >
            {infrastructure.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {infrastructure.map((component) => (
                  <ComponentCard key={component.key} component={component} />
                ))}
              </div>
            ) : (
              <EmptyState message="Infrastructure health data is not available." />
            )}
          </AdminSectionCard>

          <AdminSectionCard
            title="Operational metrics"
            description="Outbox, notification and consumer telemetry from internal service monitoring."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <AdminMetricCard
                label="Pending outbox events"
                value={formatMetric(data.metrics.outboxPendingCount)}
                tone={metricTone(data.metrics.outboxPendingCount)}
                icon="P"
                compact
              />
              <AdminMetricCard
                label="Failed outbox events"
                value={formatMetric(data.metrics.outboxFailedCount)}
                tone={metricTone(data.metrics.outboxFailedCount)}
                icon="F"
                compact
              />
              <AdminMetricCard
                label="Oldest pending event"
                value={formatAge(data.metrics.oldestPendingOutboxAgeSeconds)}
                tone={metricTone(data.metrics.oldestPendingOutboxAgeSeconds)}
                icon="A"
                compact
              />
              <AdminMetricCard
                label="Processed notifications"
                value={formatMetric(data.metrics.notificationProcessedCount)}
                tone="blue"
                icon="N"
                compact
              />
              <AdminMetricCard
                label="Consumer lag"
                value={formatMetric(data.metrics.consumerLag)}
                tone={metricTone(data.metrics.consumerLag)}
                icon="L"
                compact
              />
            </div>
          </AdminSectionCard>
        </>
      ) : null}
    </div>
  );
}

function MonitoringSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-label="Loading system health data">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="mt-4 h-7 w-32 rounded bg-slate-100" />
          <div className="mt-3 h-3 w-40 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function healthTone(status: HealthStatus) {
  if (status === "UP") return "emerald" as const;
  if (status === "DOWN") return "red" as const;
  if (status === "DEGRADED") return "amber" as const;
  return "slate" as const;
}

function ComponentCard({ component }: { component: HealthComponent }) {
  return (
    <AdminMetricCard
      label={component.name}
      value={<AdminStatusBadge status={component.status} />}
      hint={
        <>
          <div>{component.details || "No additional details are available."}</div>
          <div className="mt-1">Response time: {formatResponseTime(component.responseTimeMs)}</div>
        </>
      }
      tone={healthTone(component.status)}
      icon={component.name.slice(0, 1).toUpperCase()}
      compact
    />
  );
}

function formatResponseTime(value: number | null) {
  return value === null ? "Not available" : `${value} ms`;
}

function formatMetric(value: number | null) {
  return value === null ? "Not available" : formatCount(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatAge(value: number | null) {
  if (value === null) {
    return "Not available";
  }
  if (value < 60) {
    return "< 60 sec";
  }
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  }
  return `${minutes} min`;
}

function metricTone(value: number | null) {
  if (value === null) return "slate" as const;
  if (value > 0) return "amber" as const;
  return "emerald" as const;
}
