"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  PortalMetricCard,
  PortalOrderStepper,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { MerchantOrdersTable } from "@/components/portal/MerchantOrdersTable";
import { PortalShell } from "@/components/portal/PortalShell";
import { ErrorState, LoadingState, SecondaryButton, StatusBadge } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import { formatCurrencyTRY, formatDateTime, formatDisplayId } from "@/lib/format";
import { formatOrderStatus } from "@/lib/order-status";
import {
  getMerchantOrders,
  getMerchantProfile,
  markMerchantOrderPreparing,
  markMerchantOrderReadyForPickup,
} from "@/lib/portal";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { MerchantProfileResponse, OrderResponse, OrderStatus } from "@/types/api";

const activeMerchantStatuses: OrderStatus[] = [
  "PLACED",
  "DRIVER_ASSIGNED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
];
const merchantProgressSteps: OrderStatus[] = ["PLACED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP"];

export default function MerchantPage() {
  const { accessToken, user } = useAuth();
  const mountedRef = useRef(false);
  const [profile, setProfile] = useState<MerchantProfileResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
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
      const [nextProfile, nextOrders] = await Promise.all([
        getMerchantProfile(accessToken),
        getMerchantOrders(accessToken),
      ]);
      if (mountedRef.current) {
        setProfile(nextProfile);
        setOrders(nextOrders);
      }
    } catch (err) {
      const message = normalizeApiError(err, "Merchant portal request failed.");
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

  const businessName = profile?.businessName ?? profile?.name ?? (loading ? "-" : "Store");
  const totalOrders = profile?.totalOrders ?? orders.length;
  const activeOrders =
    profile?.activeOrders ??
    orders.filter((order) => activeMerchantStatuses.includes(order.status)).length;
  const currentOrder = orders
    .filter((order) => activeMerchantStatuses.includes(order.status))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

  const handleMerchantAction = async (
    orderId: string,
    action: "preparing" | "ready-for-pickup",
  ) => {
    if (!accessToken || actionOrderId) {
      return;
    }

    setActionOrderId(orderId);
    try {
      if (action === "preparing") {
        await markMerchantOrderPreparing(accessToken, orderId);
        showSuccessToast("Order marked as preparing.");
      } else {
        await markMerchantOrderReadyForPickup(accessToken, orderId);
        showSuccessToast("Order marked ready for pickup.");
      }
      await load(false);
    } catch (err) {
      const message = normalizeApiError(err, "Order action failed.");
      showErrorToast(message);
    } finally {
      if (mountedRef.current) {
        setActionOrderId(null);
      }
    }
  };

  return (
    <PortalShell
      portalType="merchant"
      email={profile?.email ?? user?.email ?? ""}
      title="Store Dashboard"
      subtitle="Review orders scoped to this merchant account."
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

        <div className="grid gap-4 md:grid-cols-3">
          <PortalMetricCard theme="merchant" label="Business Name" value={businessName} />
          <PortalMetricCard theme="merchant" label="Total Orders" value={loading && !profile ? "-" : totalOrders} />
          <PortalMetricCard theme="merchant" label="Active Orders" value={loading && !profile ? "-" : activeOrders} />
        </div>

        {!loading && profile && !profile.profileComplete ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">Complete your store profile before processing orders.</h3>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Add your phone, address, and average preparation time, then turn on accepting orders.
            </p>
            <Link
              href="/merchant/store"
              className="mt-3 inline-flex w-fit rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Complete store profile
            </Link>
          </div>
        ) : null}

        <PortalSection
          compact
          theme="merchant"
          title="Current order"
          description="The most recent active order for this store."
        >
          {currentOrder ? (
            <div className="grid gap-3">
              <div className="flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-violet-700">{formatDisplayId(currentOrder.id, "Order")}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={currentOrder.status} label={formatOrderStatus(currentOrder.status)} />
                    <span className="text-xs text-violet-800">{formatDateTime(currentOrder.createdAt)}</span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-violet-950">{formatCurrencyTRY(currentOrder.totalAmount)}</div>
              </div>
              <PortalOrderStepper order={currentOrder} theme="merchant" steps={merchantProgressSteps} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50 p-5">
              <p className="text-sm font-semibold text-violet-950">No active order right now.</p>
              <p className="mt-1 text-sm text-violet-800">New orders placed at this store will appear here.</p>
            </div>
          )}
        </PortalSection>

        <PortalSection
          theme="merchant"
          title="Orders"
          description="Prepare orders and mark them ready for courier pickup."
        >
          <MerchantOrdersTable
            orders={orders}
            actionOrderId={actionOrderId}
            actionsDisabled={!profile?.profileComplete}
            onPreparing={(orderId) => void handleMerchantAction(orderId, "preparing")}
            onReadyForPickup={(orderId) => void handleMerchantAction(orderId, "ready-for-pickup")}
          />
        </PortalSection>
      </div>
    </PortalShell>
  );
}
