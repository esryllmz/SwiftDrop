"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  JsonBlock,
  LoadingState,
  PageHeader,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui";
import { getJson } from "@/lib/api";
import { formatDateTime, prettyJson, statusBadgeClass } from "@/lib/format";
import type { OutboxEventResponse } from "@/types/api";

const filters = ["All", "PENDING", "SENT", "FAILED"] as const;
type Filter = (typeof filters)[number];

export function EventStreamPage() {
  const { accessToken } = useAuth();
  const [events, setEvents] = useState<OutboxEventResponse[]>([]);
  const [selectedEvent, setSelectedEvent] =
    useState<OutboxEventResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = filter === "All" ? "" : `?status=${filter}`;
      const response = await getJson<OutboxEventResponse[]>(
        `/api/v1/outbox-events${query}`,
        undefined,
        accessToken,
      );
      setEvents(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Outbox request failed");
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function viewEvent(eventId: string) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      setSelectedEvent(
        await getJson<OutboxEventResponse>(
          `/api/v1/outbox-events/${eventId}`,
          undefined,
          accessToken,
        ),
      );
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Event detail failed");
    } finally {
      setDetailLoading(false);
    }
  }

  const summary = useMemo(() => buildSummary(events), [events]);

  return (
    <div>
      <PageHeader
        title="Event Stream"
        description="Transactional Outbox to Kafka pipeline for logistics events."
        action={<Button onClick={load}>Refresh</Button>}
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Total Events" value={summary.totalEvents} />
          <SummaryCard label="Sent Events" value={summary.sentEvents} />
          <SummaryCard label="Pending Events" value={summary.pendingEvents} />
          <SummaryCard label="Failed Events" value={summary.failedEvents} />
          <SummaryCard label="Total Retries" value={summary.totalRetries} />
        </div>
        <Card>
          <h3 className="text-lg font-semibold text-slate-950">
            Transactional Outbox
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Outbox stores event intent in the same database transaction as order
            changes. Kafka publishing happens asynchronously after commit. SENT
            means the publisher successfully delivered the event to Kafka.
          </p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <SecondaryButton
            key={item}
            onClick={() => setFilter(item)}
            className={
              filter === item
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : ""
            }
          >
            {item}
          </SecondaryButton>
        ))}
      </div>

      {loading ? <LoadingState /> : null}
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      {!loading && events.length === 0 ? (
        <EmptyState message="No outbox events found. Create a demo order from Dashboard or Orders page." />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <h3 className="mb-3 text-lg font-semibold text-slate-950">
            Event Stream
          </h3>
          {events.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    {[
                      "Event ID",
                      "Event Type",
                      "Aggregate Type",
                      "Aggregate ID",
                      "Topic",
                      "Status",
                      "Retry Count",
                      "Created At",
                      "Sent At",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {events.map((event) => (
                    <tr key={event.id} className="align-top">
                      <td className="px-3 py-2 text-slate-700" title={event.id}>
                        {shortId(event.id)}
                      </td>
                      <td className="px-3 py-2">
                        <EventTypeBadge eventType={event.eventType} />
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {event.aggregateType}
                      </td>
                      <td
                        className="px-3 py-2 text-slate-700"
                        title={event.aggregateId}
                      >
                        {shortId(event.aggregateId)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{event.topic}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {event.retryCount}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatDateTime(event.sentAt)}
                      </td>
                      <td className="px-3 py-2">
                        <SecondaryButton
                          disabled={detailLoading}
                          onClick={() => void viewEvent(event.id)}
                        >
                          View
                        </SecondaryButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card className="h-fit">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Event Detail
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Uses GET /api/v1/outbox-events/id.
              </p>
            </div>
            {selectedEvent ? <StatusBadge status={selectedEvent.status} /> : null}
          </div>

          {detailLoading ? <LoadingState /> : null}
          {detailError ? <ErrorState message={detailError} /> : null}
          {!detailLoading && !selectedEvent ? (
            <EmptyState message="Select an event from the stream." />
          ) : null}

          {selectedEvent ? (
            <div className="grid gap-4">
              <dl className="grid gap-3 text-sm">
                <DetailRow label="id" value={selectedEvent.id} />
                <DetailRow label="aggregateType" value={selectedEvent.aggregateType} />
                <DetailRow label="aggregateId" value={selectedEvent.aggregateId} />
                <DetailRow label="eventType" value={selectedEvent.eventType} />
                <DetailRow label="topic" value={selectedEvent.topic} />
                <DetailRow label="eventKey" value={selectedEvent.eventKey} />
                <DetailRow label="status" value={selectedEvent.status} />
                <DetailRow label="retryCount" value={String(selectedEvent.retryCount)} />
                <DetailRow label="lastError" value={selectedEvent.lastError ?? "-"} />
                <DetailRow label="createdAt" value={formatDateTime(selectedEvent.createdAt)} />
                <DetailRow label="sentAt" value={formatDateTime(selectedEvent.sentAt)} />
                <DetailRow label="correlationId" value={selectedEvent.correlationId ?? "-"} />
                <DetailRow label="version" value={String(selectedEvent.version)} />
              </dl>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-950">
                  Payload JSON Preview
                </h4>
                <JsonBlock value={prettyJson(selectedEvent.payload)} />
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function buildSummary(events: OutboxEventResponse[]) {
  return {
    totalEvents: events.length,
    sentEvents: events.filter((event) => event.status === "SENT").length,
    pendingEvents: events.filter((event) => event.status === "PENDING").length,
    failedEvents: events.filter((event) => event.status === "FAILED").length,
    totalRetries: events.reduce((total, event) => total + event.retryCount, 0),
  };
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
    </Card>
  );
}

function EventTypeBadge({ eventType }: { eventType: string }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${eventTypeBadgeClass(eventType)}`}
    >
      {eventType}
    </span>
  );
}

function eventTypeBadgeClass(eventType: string) {
  if (eventType === "ORDER_PLACED") {
    return "border-blue-500/30 bg-blue-50 text-blue-700";
  }

  if (eventType === "ORDER_DRIVER_ASSIGNED") {
    return "border-violet-500/30 bg-violet-50 text-violet-700";
  }

  if (eventType === "ORDER_STATUS_UPDATED") {
    return "border-indigo-500/30 bg-indigo-50 text-indigo-700";
  }

  return statusBadgeClass(eventType);
}

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="break-all text-slate-800">{value}</dd>
    </div>
  );
}
