"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  OrdersTable,
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import { PortalShell } from "@/components/portal/PortalShell";
import { ErrorState, LoadingState, SecondaryButton, StatusBadge } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import {
  getCourierAssignments,
  getCourierProfile,
  markCourierOrderDelivered,
  markCourierOrderPickedUp,
  updateCourierAvailability,
} from "@/lib/portal";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { CourierProfileResponse, DriverStatus, OrderResponse } from "@/types/api";

export default function CourierPage() {
  const { accessToken, user } = useAuth();
  const [profile, setProfile] = useState<CourierProfileResponse | null>(null);
  const [assignments, setAssignments] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showLoading = true) => {
    if (!accessToken) {
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
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
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [accessToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleAvailabilityChange = async (status: Extract<DriverStatus, "AVAILABLE" | "OFFLINE">) => {
    if (!accessToken || availabilityLoading || profile?.status === "BUSY") {
      return;
    }

    setAvailabilityLoading(true);
    try {
      const nextProfile = await updateCourierAvailability(accessToken, status);
      setProfile(nextProfile);
      showSuccessToast(status === "AVAILABLE" ? "Courier is available." : "Courier is offline.");
    } catch (err) {
      const message = normalizeApiError(err, "Availability update failed.");
      showErrorToast(message);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleCourierAction = async (
    orderId: string,
    action: "picked-up" | "delivered",
  ) => {
    if (!accessToken || actionOrderId) {
      return;
    }

    setActionOrderId(orderId);
    try {
      if (action === "picked-up") {
        await markCourierOrderPickedUp(accessToken, orderId);
        showSuccessToast("Order marked as picked up.");
      } else {
        await markCourierOrderDelivered(accessToken, orderId);
        showSuccessToast("Order marked as delivered.");
      }
      await load(false);
    } catch (err) {
      const message = normalizeApiError(err, "Assignment action failed.");
      showErrorToast(message);
    } finally {
      setActionOrderId(null);
    }
  };

  const renderAvailabilityAction = () => {
    if (profile?.status === "AVAILABLE") {
      return (
        <PortalActionButton
          label="Go offline"
          tone="neutral"
          loading={availabilityLoading}
          onClick={() => void handleAvailabilityChange("OFFLINE")}
        />
      );
    }

    if (profile?.status === "OFFLINE") {
      return (
        <PortalActionButton
          label="Go available"
          tone="success"
          loading={availabilityLoading}
          onClick={() => void handleAvailabilityChange("AVAILABLE")}
        />
      );
    }

    if (profile?.status === "BUSY") {
      return <p className="text-sm text-slate-500">You are busy with an active assignment.</p>;
    }

    return null;
  };

  const renderCourierActions = (order: OrderResponse) => {
    if (order.status === "READY_FOR_PICKUP" || order.status === "DRIVER_ASSIGNED") {
      return (
        <PortalActionButton
          label="Picked up"
          tone="primary"
          loading={actionOrderId === order.id}
          disabled={Boolean(actionOrderId && actionOrderId !== order.id)}
          onClick={() => void handleCourierAction(order.id, "picked-up")}
        />
      );
    }

    if (order.status === "PICKED_UP" || order.status === "ON_THE_WAY") {
      return (
        <PortalActionButton
          label="Delivered"
          tone="success"
          loading={actionOrderId === order.id}
          disabled={Boolean(actionOrderId && actionOrderId !== order.id)}
          onClick={() => void handleCourierAction(order.id, "delivered")}
        />
      );
    }

    return <span className="text-xs text-slate-400">No action</span>;
  };

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
          title="Availability"
          description="Control whether new delivery work can be assigned to this courier."
          action={renderAvailabilityAction()}
        >
          <div className="text-sm text-slate-600">
            Current status: {profile?.status ? <StatusBadge status={profile.status} /> : "-"}
          </div>
        </PortalSection>

        <PortalSection
          title="Assignments"
          description="Update pickup and delivery progress for assigned orders."
        >
          <OrdersTable
            orders={assignments}
            emptyMessage="No courier assignments found."
            columns={["order", "merchant", "status", "amount", "created", "actions"]}
            renderActions={renderCourierActions}
          />
        </PortalSection>
      </div>
    </PortalShell>
  );
}
