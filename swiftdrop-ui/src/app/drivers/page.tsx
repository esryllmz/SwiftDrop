"use client";

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
import { getJson } from "@/lib/api";
import type { DriverResponse } from "@/types/api";

const filters = ["All", "AVAILABLE", "BUSY", "OFFLINE"] as const;
type DriverFilter = (typeof filters)[number];

export default function DriversPage() {
  const { accessToken } = useAuth();
  const [drivers, setDrivers] = useState<DriverResponse[]>([]);
  const [allDrivers, setAllDrivers] = useState<DriverResponse[]>([]);
  const [filter, setFilter] = useState<DriverFilter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = filter === "All" ? "" : `?status=${filter}`;
      const [filteredResponse, allResponse] = await Promise.all([
        getJson<DriverResponse[]>(`/api/v1/drivers${query}`, undefined, accessToken),
        getJson<DriverResponse[]>("/api/v1/drivers", undefined, accessToken),
      ]);
      setDrivers(filteredResponse);
      setAllDrivers(allResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drivers request failed");
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const summary = useMemo(() => buildDriverSummary(allDrivers), [allDrivers]);

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Driver availability and assignment readiness from Logistics Service."
        action={<Button onClick={load}>Refresh</Button>}
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Drivers" value={summary.total} />
          <SummaryCard label="Available" value={summary.available} />
          <SummaryCard label="Busy" value={summary.busy} />
          <SummaryCard label="Offline" value={summary.offline} />
        </div>
        <Card>
          <h3 className="text-lg font-semibold text-slate-950">
            Assignment Logic
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Driver assignment is decided by Logistics Service. Redis Geo finds
            nearby drivers and Redisson lock prevents double assignment.
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Driver List</h3>
            <p className="mt-1 text-sm text-slate-600">
              Filter calls the real driver query endpoint.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <SecondaryButton
                key={item}
                onClick={() => setFilter(item)}
                className={
                  filter === item
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : ""
                }
              >
                {item}
              </SecondaryButton>
            ))}
          </div>
        </div>

        {loading ? <LoadingState /> : null}
        {error ? (
          <div className="mb-4">
            <ErrorState message={error} />
          </div>
        ) : null}
        {!loading && drivers.length === 0 ? (
          <EmptyState message="No drivers found. Check Logistics seed data or service health." />
        ) : null}
        {drivers.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white text-left text-slate-600">
                <tr>
                  {["Driver ID", "User ID", "Full Name", "Status"].map(
                    (heading) => (
                      <th key={heading} className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td className="px-3 py-2 text-slate-700" title={driver.id}>
                      {shortId(driver.id)}
                    </td>
                    <td
                      className="px-3 py-2 text-slate-700"
                      title={driver.userId}
                    >
                      {shortId(driver.userId)}
                    </td>
                    <td className="px-3 py-2 text-slate-950">{driver.fullName}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={driver.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function buildDriverSummary(drivers: DriverResponse[]) {
  return {
    total: drivers.length,
    available: drivers.filter((driver) => driver.status === "AVAILABLE").length,
    busy: drivers.filter((driver) => driver.status === "BUSY").length,
    offline: drivers.filter((driver) => driver.status === "OFFLINE").length,
  };
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-sm text-slate-600">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
    </Card>
  );
}

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}
