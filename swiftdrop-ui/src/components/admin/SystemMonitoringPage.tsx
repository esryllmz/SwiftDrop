"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  JsonBlock,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
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
    <div>
      <PageHeader
        title="System Monitoring"
        description="Service health and infrastructure status proxied through the Next.js server."
        action={<Button onClick={load}>Refresh</Button>}
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {data?.services.map((service) => (
          <Card key={service.name}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  {service.name}
                </h3>
                <p className="mt-1 break-all text-sm text-slate-500">
                  {service.url}
                </p>
              </div>
              <StatusBadge status={service.status || "UNKNOWN"} />
            </div>
            {service.error ? <ErrorState message={service.error} /> : null}
            <div className={service.error ? "mt-3" : ""}>
              <JsonBlock value={service.raw ?? {}} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
