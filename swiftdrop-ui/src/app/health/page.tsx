"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, ErrorState, JsonBlock, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { API_BASE_URL, getJson } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

const services = [
  { name: "Gateway", url: "http://localhost:8080/actuator/health", path: "/actuator/health", baseUrl: API_BASE_URL },
  { name: "Auth", url: "http://localhost:8081/actuator/health", path: "/actuator/health", baseUrl: "http://localhost:8081" },
  { name: "Logistics", url: "http://localhost:8082/actuator/health", path: "/actuator/health", baseUrl: "http://localhost:8082" },
  { name: "Notification", url: "http://localhost:8083/actuator/health", path: "/actuator/health", baseUrl: "http://localhost:8083" },
];

type HealthResult = {
  name: string;
  url: string;
  data?: HealthResponse;
  error?: string;
};

export default function HealthPage() {
  const [results, setResults] = useState<HealthResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await Promise.all(
        services.map(async (service) => {
          try {
            const data = await getJson<HealthResponse>(service.path, { baseUrl: service.baseUrl });
            return { name: service.name, url: service.url, data };
          } catch (err) {
            return { name: service.name, url: service.url, error: err instanceof Error ? err.message : "Health request failed" };
          }
        }),
      );
      setResults(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health requests failed");
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
      <PageHeader title="Health" description="Actuator health checks for all backend services." action={<Button onClick={load}>Refresh</Button>} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {results.map((result) => (
          <Card key={result.name}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{result.name}</h3>
                <p className="mt-1 break-all text-sm text-slate-400">{result.url}</p>
              </div>
              <StatusBadge status={result.data?.status ?? (result.error ? "DOWN" : "UNKNOWN")} />
            </div>
            {result.error ? <ErrorState message={result.error} /> : <JsonBlock value={result.data ?? {}} />}
          </Card>
        ))}
      </div>
    </div>
  );
}
