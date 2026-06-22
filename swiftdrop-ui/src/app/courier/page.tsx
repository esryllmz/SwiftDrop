"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { CourierAssignmentsTable } from "@/components/portal/CourierAssignmentsTable";
import { CourierAvailabilityCard } from "@/components/portal/CourierAvailabilityCard";
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
import type { CourierProfileResponse, DriverStatus, OrderResponse, OrderStatus } from "@/types/api";

const activeCourierStatuses: OrderStatus[] = [
  "DRIVER_ASSIGNED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
];

export default function CourierPage() {
  const { accessToken, user } = useAuth();
  const mountedRef = useRef(false);
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

    if (showLoading && mountedRef.current) {
      setLoading(true);
    }
    if (mountedRef.current) {
      setError(null);
    }
    try {
      const [nextProfile, nextAssignments] = await Promise.all([
        getCourierProfile(accessToken),
        getCourierAssignments(accessToken),
      ]);
      if (mountedRef.current) {
        setProfile(nextProfile);
        setAssignments(nextAssignments);
      }
    } catch (err) {
      const message = normalizeApiError(err, "Courier portal request failed.");
      if (mountedRef.current) {
        setError(message);
      }
      showErrorToast(message);
    } finally {
      if (showLoading && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [accessToken]);

  useEffect(() => {
    mountedRef.current = true;
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const handleAvailabilityChange = async (status: Extract<DriverStatus, "AVAILABLE" | "OFFLINE">) => {
    if (!accessToken || availabilityLoading || profile?.status === "BUSY") {
      return;
    }

    setAvailabilityLoading(true);
    try {
      const nextProfile = await updateCourierAvailability(accessToken, status);
      if (mountedRef.current) {
        setProfile(nextProfile);
      }
      showSuccessToast(status === "AVAILABLE" ? "Courier is available." : "Courier is offline.");
    } catch (err) {
      const message = normalizeApiError(err, "Availability update failed.");
      showErrorToast(message);
    } finally {
      if (mountedRef.current) {
        setAvailabilityLoading(false);
      }
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
      if (mountedRef.current) {
        setActionOrderId(null);
      }
    }
  };

  const fullName = profile?.fullName ?? (loading ? "-" : "Courier");
  const assignedOrders =
    profile?.assignedOrders ??
    assignments.filter((assignment) => activeCourierStatuses.includes(assignment.status)).length;
  const deliveredOrders =
    profile?.deliveredOrders ??
    assignments.filter((assignment) => assignment.status === "DELIVERED").length;

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
          <PortalMetricCard label="Full Name" value={fullName} />
          <PortalMetricCard
            label="Status"
            value={profile?.status ? <StatusBadge status={profile.status} /> : "-"}
          />
          <PortalMetricCard label="Assigned Orders" value={loading && !profile ? "-" : assignedOrders} />
          <PortalMetricCard label="Delivered Orders" value={loading && !profile ? "-" : deliveredOrders} />
        </div>

        <PortalSection
          title="Availability"
          description="Control whether new delivery work can be assigned to this courier."
        >
          <CourierAvailabilityCard
            status={profile?.status}
            loading={availabilityLoading}
            onChange={(status) => void handleAvailabilityChange(status)}
          />
        </PortalSection>

        <PortalSection
          title="Assignments"
          description="Update pickup and delivery progress for assigned orders."
        >
          <CourierAssignmentsTable
            assignments={assignments}
            actionOrderId={actionOrderId}
            onPickedUp={(orderId) => void handleCourierAction(orderId, "picked-up")}
            onDelivered={(orderId) => void handleCourierAction(orderId, "delivered")}
          />
        </PortalSection>
      </div>
    </PortalShell>
  );
}
