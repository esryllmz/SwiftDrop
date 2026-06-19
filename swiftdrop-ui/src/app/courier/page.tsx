"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  OrdersTable,
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ErrorState, LoadingState, SecondaryButton, StatusBadge } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import { getCourierAssignments, getCourierProfile } from "@/lib/portal";
import { showErrorToast } from "@/lib/toast";
import type { CourierProfileResponse, OrderResponse } from "@/types/api";

export default function CourierPage() {
  const { accessToken, user } = useAuth();
  const [profile, setProfile] = useState<CourierProfileResponse | null>(null);
  const [assignments, setAssignments] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextProfile, nextAssignments] = await Promise.all([
        getCourierProfile(accessToken),
        getCourierAssignments(accessToken),
      ]);
      setProfile(nextProfile);
      setAssignments(nextAssignments);
    } catch (err) {
      const message = normalizeApiError(err, "Courier portal request failed.");
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <PortalShell
      portalType="courier"
      email={profile?.email ?? user?.email ?? ""}
      title="Courier Dashboard"
      subtitle="Review assigned deliveries for this courier account."
    >
      <div className="grid gap-5">
        {loading ? <LoadingState /> : null}
        {error ? (
          <div className="grid gap-3">
            <ErrorState message={error} />
            <SecondaryButton className="w-fit" onClick={() => void load()}>
              Retry
            </SecondaryButton>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <PortalMetricCard label="Full Name" value={profile?.fullName ?? "Courier"} hint={profile?.driverId} />
          <PortalMetricCard
            label="Status"
            value={profile?.status ? <StatusBadge status={profile.status} /> : "-"}
          />
          <PortalMetricCard label="Assigned Orders" value={profile?.assignedOrders ?? "-"} />
          <PortalMetricCard label="Delivered Orders" value={profile?.deliveredOrders ?? "-"} />
        </div>

        <PortalSection
          title="Assignments"
          description="Read-only delivery assignment view."
        >
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Delivery actions will be available after courier workflow is enabled.
          </div>
          <OrdersTable
            orders={assignments}
            emptyMessage="No courier assignments found."
            columns={["order", "merchant", "status", "amount", "created"]}
          />
        </PortalSection>
      </div>
    </PortalShell>
  );
}
