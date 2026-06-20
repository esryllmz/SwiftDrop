"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  ErrorState,
  LoadingState,
} from "@/components/ui";
import {
  AdvancedDetails,
  JsonPreview,
} from "@/components/admin/modal";
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
    <div className="p-6 space-y-5">
      <AdminPageHeader
        icon="UP"
        title="System Monitoring"
        description="Service health and infrastructure status."
        action={<Button onClick={load}>Refresh</Button>}
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
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
      <div className="grid gap-4 xl:grid-cols-2">
        {data?.services.map((service) => (
          <AdminSectionCard key={service.name} title={service.name} description={service.url}>
            {service.error ? <ErrorState message={service.error} /> : null}
            <AdvancedDetails title="Health response">
              <JsonPreview value={service.raw ?? {}} />
            </AdvancedDetails>
          </AdminSectionCard>
        ))}
      </div>
    </div>
  );
}
