"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { MerchantOrdersTable } from "@/components/portal/MerchantOrdersTable";
import { PortalShell } from "@/components/portal/PortalShell";
import { ErrorState, LoadingState, SecondaryButton } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
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
          <PortalMetricCard label="Business Name" value={businessName} />
          <PortalMetricCard label="Total Orders" value={loading && !profile ? "-" : totalOrders} />
          <PortalMetricCard label="Active Orders" value={loading && !profile ? "-" : activeOrders} />
        </div>

        <PortalSection
          title="Orders"
          description="Prepare orders and mark them ready for courier pickup."
        >
          <MerchantOrdersTable
            orders={orders}
            actionOrderId={actionOrderId}
            onPreparing={(orderId) => void handleMerchantAction(orderId, "preparing")}
            onReadyForPickup={(orderId) => void handleMerchantAction(orderId, "ready-for-pickup")}
          />
        </PortalSection>
      </div>
    </PortalShell>
  );
}
