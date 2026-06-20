"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminModal,
  AdvancedDetails,
  DetailField,
  DetailGrid,
  JsonPreview,
  ModalFooter,
} from "@/components/admin/modal";
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
import { useAuth } from "@/components/auth/AuthProvider";
import { getJson } from "@/lib/api";
import type { DriverResponse } from "@/types/api";

const filters = ["All", "AVAILABLE", "BUSY", "OFFLINE"] as const;
type DriverFilter = (typeof filters)[number];

export default function DriversPage() {
  const { accessToken } = useAuth();
  const [drivers, setDrivers] = useState<DriverResponse[]>([]);
  const [allDrivers, setAllDrivers] = useState<DriverResponse[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverResponse | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
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
    <div className="p-6 space-y-5">
      <AdminPageHeader
        icon="DR"
        title="Drivers"
        description="Courier availability and operations."
        action={<Button onClick={load}>Refresh</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Total Drivers" value={summary.total} tone="blue" icon="." iconVariant="dot" />
          <AdminMetricCard label="Available" value={summary.available} tone="emerald" icon="." iconVariant="dot" />
          <AdminMetricCard label="Busy" value={summary.busy} tone="violet" icon="." iconVariant="dot" />
          <AdminMetricCard label="Offline" value={summary.offline} tone="slate" icon="." iconVariant="dot" />
        </div>
        <AdminInfoBanner title="Assignment Readiness" tone="emerald">
          <p>
            Driver assignment uses availability and proximity rules.
          </p>
        </AdminInfoBanner>
      </div>

      <AdminSectionCard
        title="Driver List"
        description="Filter by current driver status."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminFilterPills
              items={filters}
              selected={filter}
              getLabel={(item) => item === "All" ? "All drivers" : item}
              onSelect={setFilter}
              tone="violet"
            />
          </div>
        }
      >

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
          <AdminDataTable
            columns={["Driver ID", "User ID", "Full Name", "Status", "Actions"]}
            rows={drivers}
            emptyMessage="No drivers found."
            getRowKey={(driver) => driver.id}
            renderRow={(driver) => (
              <>
                <AdminTableCell title={driver.id}><AdminIdChip value={shortId(driver.id)} /></AdminTableCell>
                <AdminTableCell title={driver.userId}><span className="font-mono text-xs text-slate-400">{shortId(driver.userId)}</span></AdminTableCell>
                <AdminTableCell strong>
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {driver.fullName.slice(0, 1).toUpperCase()}
                    </span>
                    {driver.fullName}
                  </span>
                </AdminTableCell>
                <AdminTableCell><AdminStatusBadge status={driver.status} /></AdminTableCell>
                <AdminTableCell>
                  <AdminViewAction
                    onClick={() => {
                      setSelectedDriver(driver);
                      setDetailModalOpen(true);
                    }}
                  />
                </AdminTableCell>
              </>
            )}
          />
        ) : null}
      </AdminSectionCard>

      <AdminModal
        open={detailModalOpen}
        title="Driver Detail"
        subtitle={selectedDriver?.fullName}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedDriver(null);
        }}
        footer={
          <ModalFooter>
            <AdminButton
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setDetailModalOpen(false);
                setSelectedDriver(null);
              }}
            >
              Close
            </AdminButton>
          </ModalFooter>
        }
      >
        {selectedDriver ? (
          <div className="grid gap-4">
            <DetailGrid>
              <DetailField label="Status" value={<AdminStatusBadge status={selectedDriver.status} />} />
              <DetailField label="Full Name" value={selectedDriver.fullName} />
              <DetailField label="Driver ID" value={selectedDriver.id} mono />
              <DetailField label="User ID" value={selectedDriver.userId} mono />
              <DetailField
                label="Assignment Availability"
                value={assignmentAvailability(selectedDriver.status)}
              />
            </DetailGrid>
            <AdvancedDetails>
              <JsonPreview value={selectedDriver} />
            </AdvancedDetails>
          </div>
        ) : (
          <EmptyState message="No driver selected." />
        )}
      </AdminModal>
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

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function assignmentAvailability(status: string) {
  if (status === "AVAILABLE") {
    return "Can receive orders";
  }

  if (status === "BUSY") {
    return "Currently assigned or on delivery";
  }

  if (status === "OFFLINE") {
    return "Not available for assignment";
  }

  return "Unknown assignment state";
}
