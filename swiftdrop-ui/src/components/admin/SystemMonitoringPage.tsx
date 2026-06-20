"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  ErrorState,
  LoadingState,
} from "@/components/ui";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/ui";
import { getJson } from "@/lib/api";

type HealthProxyResponse = {
  services: Array<{
    name: string;
    url: string;
    status: string;
    raw?: unknown;
    error?: string;
  }>;
};

export function SystemMonitoringPage() {
  const [data, setData] = useState<HealthProxyResponse | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJson<HealthProxyResponse>("/api/health"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health request failed");
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
      <AdminPageHeader
        icon="UP"
        title="System Monitoring"
        description="Service health and infrastructure status."
        action={
          <>
            <Button onClick={load}>Refresh</Button>
            <button
              type="button"
              onClick={() => setDetailsOpen((current) => !current)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {detailsOpen ? "Hide details" : "Show details"}
            </button>
          </>
        }
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data?.services.map((service) => (
          <AdminMetricCard
            key={service.name}
            label={service.name}
            value={<AdminStatusBadge status={service.status || "UNKNOWN"} />}
            hint={service.url}
            tone={service.status === "UP" ? "emerald" : service.status === "DOWN" ? "red" : "slate"}
            icon={service.name.slice(0, 1).toUpperCase()}
            compact
          />
        ))}
      </div>
      {detailsOpen ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {data?.services.map((service) => (
            <AdminSectionCard key={service.name} title={service.name} description={service.url}>
              {service.error ? <ErrorState message={service.error} /> : null}
              <pre className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                {JSON.stringify(service.raw ?? {}, null, 2)}
              </pre>
            </AdminSectionCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}
