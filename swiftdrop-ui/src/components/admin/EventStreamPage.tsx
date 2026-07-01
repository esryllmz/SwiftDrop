"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminModal,
  AdvancedDetails,
  DetailField,
  DetailGrid,
  ModalFooter,
} from "@/components/admin/modal";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui";
import {
  AdminDataTable,
  AdminFilterPills,
  AdminIdChip,
  AdminInfoBanner,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
  AdminTableCell,
  AdminViewAction,
} from "@/components/admin/ui";
import { getJson } from "@/lib/api";
import { formatDateTime, formatDisplayId, maskTechnicalId, statusBadgeClass } from "@/lib/format";
import type { OutboxEventResponse } from "@/types/api";

const filters = ["All", "PENDING", "SENT", "FAILED"] as const;
type Filter = (typeof filters)[number];

export function EventStreamPage() {
  const { accessToken } = useAuth();
  const [events, setEvents] = useState<OutboxEventResponse[]>([]);
  const [selectedEvent, setSelectedEvent] =
    useState<OutboxEventResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
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
    setDetailModalOpen(true);
    setSelectedEvent(null);
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
    <div className="p-6 space-y-5">
      <AdminPageHeader
        icon="EV"
        title="Event Stream"
        description="Outbox events and delivery pipeline."
        action={<Button onClick={load}>Refresh</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AdminMetricCard label="Total Events" value={summary.totalEvents} tone="blue" icon="T" />
          <AdminMetricCard label="Pending" value={summary.pendingEvents} tone="amber" icon="P" />
          <AdminMetricCard label="Sent" value={summary.sentEvents} tone="emerald" icon="S" />
          <AdminMetricCard label="Failed" value={summary.failedEvents} tone="red" icon="F" />
          <AdminMetricCard label="Total Retries" value={summary.totalRetries} tone="slate" icon="R" />
        </div>
        <AdminInfoBanner title="Transactional Outbox" tone="slate">
          <p>
            Event metadata and delivery status are available in the detail modal.
          </p>
        </AdminInfoBanner>
      </div>

      <AdminFilterPills
        items={filters}
        selected={filter}
        getLabel={(item) => item === "All" ? "All events" : item}
        onSelect={setFilter}
      />

      {loading ? <LoadingState /> : null}
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      {!loading && events.length === 0 ? (
        <EmptyState message="No outbox events found. Create an order from Dashboard or Orders page." />
      ) : null}

      <div className="grid gap-4">
        <AdminSectionCard title="Events">
          {events.length > 0 ? (
            <AdminDataTable
              columns={["Event", "Type", "Aggregate", "Topic", "Status", "Retry", "Created", "Actions"]}
              rows={events}
              emptyMessage="No outbox events found."
              getRowKey={(event) => event.id}
              renderRow={(event) => (
                <>
                  <AdminTableCell title={formatDisplayId(event.id, "Event")}><AdminIdChip value={event.id} prefix="Event" /></AdminTableCell>
                  <AdminTableCell><EventTypeBadge eventType={event.eventType} /></AdminTableCell>
                  <AdminTableCell>
                    <div className="font-medium text-slate-900">{event.aggregateType}</div>
                    <div className="mt-1 text-xs text-slate-500" title={formatDisplayId(event.aggregateId, event.aggregateType)}>
                      {formatDisplayId(event.aggregateId, event.aggregateType)}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>{event.topic}</AdminTableCell>
                  <AdminTableCell><AdminStatusBadge status={event.status} /></AdminTableCell>
                  <AdminTableCell>{event.retryCount}</AdminTableCell>
                  <AdminTableCell>{formatDateTime(event.createdAt)}</AdminTableCell>
                  <AdminTableCell>
                    <AdminViewAction
                      disabled={detailLoading}
                      onClick={() => void viewEvent(event.id)}
                    />
                  </AdminTableCell>
                </>
              )}
            />
          ) : null}
        </AdminSectionCard>
      </div>

      <AdminModal
        open={detailModalOpen}
        title="Event Detail"
        subtitle={selectedEvent ? formatDisplayId(selectedEvent.id, "Event") : "Loading event details"}
        maxWidth="lg"
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedEvent(null);
          setDetailError(null);
        }}
        footer={
          <ModalFooter>
            <AdminButton
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setDetailModalOpen(false);
                setSelectedEvent(null);
                setDetailError(null);
              }}
            >
              Close
            </AdminButton>
          </ModalFooter>
        }
      >
        <div className="grid gap-4">
          {detailLoading ? <LoadingState /> : null}
          {detailError ? <ErrorState message={detailError} /> : null}
          {!detailLoading && !detailError && !selectedEvent ? (
            <EmptyState message="No event details are available." />
          ) : null}
          {selectedEvent ? (
            <>
              <DetailGrid>
                <DetailField label="Event Type" value={<EventTypeBadge eventType={selectedEvent.eventType} />} />
                <DetailField label="Status" value={<AdminStatusBadge status={selectedEvent.status} />} />
                <DetailField label="Aggregate Type" value={selectedEvent.aggregateType} />
                <DetailField label="Aggregate" value={formatDisplayId(selectedEvent.aggregateId, selectedEvent.aggregateType)} />
                <DetailField label="Topic" value={selectedEvent.topic} />
                <DetailField label="Retry Count" value={String(selectedEvent.retryCount)} />
                <DetailField label="Created At" value={formatDateTime(selectedEvent.createdAt)} />
                <DetailField label="Sent At" value={formatDateTime(selectedEvent.sentAt)} />
                <DetailField label="Version" value={String(selectedEvent.version)} />
                <DetailField label="Last Error" value={selectedEvent.lastError} />
              </DetailGrid>
              <AdvancedDetails title="Technical identifiers">
                <DetailGrid>
                  <DetailField label="Event ID" value={maskTechnicalId(selectedEvent.id)} mono />
                  <DetailField label="Aggregate ID" value={maskTechnicalId(selectedEvent.aggregateId)} mono />
                  <DetailField label="Event Key" value={maskTechnicalId(selectedEvent.eventKey)} mono />
                  <DetailField label="Correlation ID" value={maskTechnicalId(selectedEvent.correlationId)} mono />
                </DetailGrid>
              </AdvancedDetails>
              <PayloadDetails value={selectedEvent.payload} />
            </>
          ) : null}
        </div>
      </AdminModal>
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

function PayloadDetails({ value }: { value: string }) {
  const envelope = parsePayloadEnvelope(value);

  return (
    <AdvancedDetails title="Event payload summary">
      <DetailGrid>
        <DetailField label="Payload Event ID" value={formatOptionalId(envelope.eventId)} mono />
        <DetailField label="Payload Event Type" value={envelope.eventType} />
        <DetailField label="Occurred At" value={formatDateTime(envelope.occurredAt)} />
        <DetailField label="Correlation ID" value={formatOptionalId(envelope.correlationId)} mono />
        <DetailField label="Order ID" value={formatOptionalId(envelope.orderId)} mono />
        <DetailField label="Previous Status" value={envelope.previousStatus} />
        <DetailField label="New Status" value={envelope.newStatus ?? envelope.status} />
        <DetailField label="Actor Type" value={envelope.actorType} />
        <DetailField label="Target User" value={formatOptionalId(envelope.targetUserId)} mono />
        <DetailField label="Message" value={envelope.message} />
        <DetailField label="Reason" value={envelope.reason} />
      </DetailGrid>
    </AdvancedDetails>
  );
}

function parsePayloadEnvelope(value: string) {
  const parsed = safeParseObject(value);
  const payload = safeRecord(parsed.payload);

  return {
    eventId: nullableString(parsed.eventId),
    eventType: nullableString(parsed.eventType),
    occurredAt: nullableString(parsed.occurredAt),
    correlationId: nullableString(parsed.correlationId),
    orderId: nullableString(payload.orderId),
    status: nullableString(payload.status),
    message: nullableString(payload.message),
    targetUserId: nullableString(payload.targetUserId),
    previousStatus: nullableString(payload.previousStatus),
    newStatus: nullableString(payload.newStatus),
    actorType: nullableString(payload.actorType),
    reason: nullableString(payload.reason),
  };
}

function safeParseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return safeRecord(parsed);
  } catch {
    return {};
  }
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatOptionalId(value: string | null) {
  return value ? maskTechnicalId(value) : null;
}
