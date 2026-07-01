"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  PortalMetricCard,
  PortalOrderStepper,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { CourierAssignmentsTable } from "@/components/portal/CourierAssignmentsTable";
import { CourierAvailabilityCard } from "@/components/portal/CourierAvailabilityCard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ErrorState, LoadingState, SecondaryButton, StatusBadge } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import { formatCurrencyTRY, formatDateTime, formatDisplayId } from "@/lib/format";
import { formatOrderStatus } from "@/lib/order-status";
import {
  getCourierAssignments,
  getCourierProfile,
  markCourierOrderDelivered,
  markCourierOrderOnTheWay,
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
const courierProgressSteps: OrderStatus[] = [
  "DRIVER_ASSIGNED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
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
    action: "picked-up" | "on-the-way" | "delivered",
  ) => {
    if (!accessToken || actionOrderId) {
      return;
    }

    setActionOrderId(orderId);
    try {
      if (action === "picked-up") {
        await markCourierOrderPickedUp(accessToken, orderId);
        showSuccessToast("Order marked as picked up.");
      } else if (action === "on-the-way") {
        await markCourierOrderOnTheWay(accessToken, orderId);
        showSuccessToast("Order marked on the way.");
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
  const activeAssignments = assignments.filter((assignment) => activeCourierStatuses.includes(assignment.status));
  const currentAssignment = [...activeAssignments].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0];

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
          <PortalMetricCard theme="courier" label="Full Name" value={fullName} />
          <PortalMetricCard
            theme="courier"
            label="Status"
            value={profile?.status ? <StatusBadge status={profile.status} /> : "-"}
          />
          <PortalMetricCard theme="courier" label="Assigned Orders" value={loading && !profile ? "-" : assignedOrders} />
          <PortalMetricCard theme="courier" label="Delivered Orders" value={loading && !profile ? "-" : deliveredOrders} />
        </div>

        {!loading && profile && !profile.profileComplete ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">Complete your courier profile before receiving assignments.</h3>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Add your phone, vehicle type, and service zone so the dispatch engine can consider you for new orders.
            </p>
            <Link
              href="/courier/profile"
              className="mt-3 inline-flex w-fit rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Complete courier profile
            </Link>
          </div>
        ) : null}

        <PortalSection
          theme="courier"
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
          compact
          theme="courier"
          title="Active assignment"
          description="The most recent active delivery for this courier."
        >
          {currentAssignment ? (
            <div className="grid gap-3">
              <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-emerald-700">{formatDisplayId(currentAssignment.id, "Order")}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={currentAssignment.status} label={formatOrderStatus(currentAssignment.status)} />
                    <span className="text-xs text-emerald-800">{formatDateTime(currentAssignment.createdAt)}</span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-emerald-950">{formatCurrencyTRY(currentAssignment.totalAmount)}</div>
              </div>
              <PortalOrderStepper order={currentAssignment} theme="courier" steps={courierProgressSteps} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-950">No active assignments assigned to this courier.</p>
              <p className="mt-1 text-sm text-emerald-800">New dispatch work will appear here when it is ready.</p>
            </div>
          )}
        </PortalSection>

        <PortalSection
          theme="courier"
          title="Assignments"
          description="Update pickup and delivery progress for assigned orders."
        >
          <CourierAssignmentsTable
            assignments={activeAssignments}
            actionOrderId={actionOrderId}
            onPickedUp={(orderId) => void handleCourierAction(orderId, "picked-up")}
            onOnTheWay={(orderId) => void handleCourierAction(orderId, "on-the-way")}
            onDelivered={(orderId) => void handleCourierAction(orderId, "delivered")}
          />
        </PortalSection>
      </div>
    </PortalShell>
  );
}
