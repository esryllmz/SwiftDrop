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
import { formatDisplayId, formatStatusLabel, maskTechnicalId } from "@/lib/format";
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
      setError(err instanceof Error ? err.message : "Couriers request failed");
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
        title="Couriers"
        description="Courier availability and operations."
        action={<Button onClick={load}>Refresh</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Total Couriers" value={summary.total} tone="blue" icon="." iconVariant="dot" />
          <AdminMetricCard label="Available" value={summary.available} tone="emerald" icon="." iconVariant="dot" />
          <AdminMetricCard label="Busy" value={summary.busy} tone="violet" icon="." iconVariant="dot" />
          <AdminMetricCard label="Offline" value={summary.offline} tone="slate" icon="." iconVariant="dot" />
        </div>
        <AdminInfoBanner title="Assignment Readiness" tone="emerald">
          <p>
            Demo assignment uses courier availability. A courier must be available to receive assignments.
          </p>
        </AdminInfoBanner>
      </div>

      <AdminSectionCard
        title="Courier List"
        description="Filter by current courier status."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminFilterPills
              items={filters}
              selected={filter}
              getLabel={(item) => item === "All" ? "All couriers" : formatStatusLabel(item)}
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
          <EmptyState message="No couriers found. Check Logistics seed data or service health." />
        ) : null}
        {drivers.length > 0 ? (
          <AdminDataTable
            columns={["Courier", "Full Name", "Email", "Status", "Actions"]}
            rows={drivers}
            emptyMessage="No couriers found."
            getRowKey={(driver) => driver.id}
            renderRow={(driver) => (
              <>
                <AdminTableCell title={formatDisplayId(driver.id, "Courier")}><AdminIdChip value={driver.id} prefix="Courier" /></AdminTableCell>
                <AdminTableCell strong>
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {driver.fullName.slice(0, 1).toUpperCase()}
                    </span>
                    {driver.fullName}
                  </span>
                </AdminTableCell>
                <AdminTableCell>{driver.email ?? "Not available"}</AdminTableCell>
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
        title="Courier Detail"
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
              <DetailField label="Courier email" value={selectedDriver.email} />
              <DetailField
                label="Assignment Availability"
                value={assignmentAvailability(selectedDriver.status)}
              />
            </DetailGrid>
            <AdvancedDetails title="Advanced details">
              <DetailGrid>
                <DetailField label="Courier ID" value={maskTechnicalId(selectedDriver.id)} mono />
                <DetailField label="User ID" value={maskTechnicalId(selectedDriver.userId)} mono />
              </DetailGrid>
            </AdvancedDetails>
          </div>
        ) : (
          <EmptyState message="No courier selected." />
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
