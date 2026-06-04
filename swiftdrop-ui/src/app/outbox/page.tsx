"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, ErrorState, JsonBlock, LoadingState, PageHeader, SecondaryButton, StatusBadge } from "@/components/ui";
import { getJson } from "@/lib/api";
import { formatDateTime, prettyJson } from "@/lib/format";
import type { OutboxEventResponse } from "@/types/api";

const filters = ["All", "SENT", "PENDING", "FAILED"] as const;
type Filter = (typeof filters)[number];

export default function OutboxPage() {
  const [events, setEvents] = useState<OutboxEventResponse[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = filter === "All" ? "" : `?status=${filter}`;
      setEvents(await getJson<OutboxEventResponse[]>(`/api/v1/outbox-events${query}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Outbox request failed");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <PageHeader title="Outbox" description="Event stream records published through the outbox pattern." action={<Button onClick={load}>Refresh</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <SecondaryButton key={item} onClick={() => setFilter(item)} className={filter === item ? "border-violet-500 bg-violet-500/20 text-violet-100" : ""}>
            {item}
          </SecondaryButton>
        ))}
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && events.length === 0 ? <EmptyState message="No outbox events found." /> : null}
      {events.length > 0 ? (
        <div className="grid gap-4">
          {events.map((event) => (
            <section key={event.id} className="rounded-md border border-slate-800 bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-800 text-left text-slate-400">
                    <tr>{["id", "eventType", "aggregateType", "aggregateId", "topic", "status", "retryCount", "createdAt", "sentAt"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2 text-slate-300">{event.id}</td>
                      <td className="px-3 py-2 text-white">{event.eventType}</td>
                      <td className="px-3 py-2 text-slate-300">{event.aggregateType}</td>
                      <td className="px-3 py-2 text-slate-300">{event.aggregateId}</td>
                      <td className="px-3 py-2 text-slate-300">{event.topic}</td>
                      <td className="px-3 py-2"><StatusBadge status={event.status} /></td>
                      <td className="px-3 py-2 text-slate-300">{event.retryCount}</td>
                      <td className="px-3 py-2 text-slate-300">{formatDateTime(event.createdAt)}</td>
                      <td className="px-3 py-2 text-slate-300">{formatDateTime(event.sentAt)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <details className="border-t border-slate-800 p-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-300">Payload preview</summary>
                <div className="mt-3">
                  <JsonBlock value={prettyJson(event.payload)} />
                </div>
              </details>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
