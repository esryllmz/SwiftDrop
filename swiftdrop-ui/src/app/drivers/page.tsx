"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { getJson } from "@/lib/api";
import type { DriverResponse } from "@/types/api";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDrivers(await getJson<DriverResponse[]>("/api/v1/drivers"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drivers request failed");
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
      <PageHeader title="Drivers" description="Current driver availability." action={<Button onClick={load}>Refresh</Button>} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && drivers.length === 0 ? <EmptyState message="No drivers found." /> : null}
      {drivers.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900 text-left text-slate-400">
              <tr>{["id", "userId", "fullName", "status"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td className="px-3 py-2 text-slate-300">{driver.id}</td>
                  <td className="px-3 py-2 text-slate-300">{driver.userId}</td>
                  <td className="px-3 py-2 text-white">{driver.fullName}</td>
                  <td className="px-3 py-2"><StatusBadge status={driver.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
