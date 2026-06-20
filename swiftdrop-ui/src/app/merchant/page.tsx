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
import { ErrorState, LoadingState, SecondaryButton } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import {
  getMerchantOrders,
  getMerchantProfile,
  markMerchantOrderPreparing,
  markMerchantOrderReadyForPickup,
} from "@/lib/portal";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { MerchantProfileResponse, OrderResponse } from "@/types/api";

export default function MerchantPage() {
  const { accessToken, user } = useAuth();
  const [profile, setProfile] = useState<MerchantProfileResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
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
      const [nextProfile, nextOrders] = await Promise.all([
        getMerchantProfile(accessToken),
        getMerchantOrders(accessToken),
      ]);
      setProfile(nextProfile);
      setOrders(nextOrders);
    } catch (err) {
      const message = normalizeApiError(err, "Merchant portal request failed.");
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

  const businessName = profile?.businessName ?? profile?.name ?? "Store";

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
      setActionOrderId(null);
    }
  };

  const renderMerchantActions = (order: OrderResponse) => {
    if (order.status === "PLACED" || order.status === "DRIVER_ASSIGNED") {
      return (
        <PortalActionButton
          label="Mark preparing"
          tone="warning"
          loading={actionOrderId === order.id}
          disabled={Boolean(actionOrderId && actionOrderId !== order.id)}
          onClick={() => void handleMerchantAction(order.id, "preparing")}
        />
      );
    }

    if (order.status === "PREPARING") {
      return (
        <PortalActionButton
          label="Ready for pickup"
          tone="primary"
          loading={actionOrderId === order.id}
          disabled={Boolean(actionOrderId && actionOrderId !== order.id)}
          onClick={() => void handleMerchantAction(order.id, "ready-for-pickup")}
        />
      );
    }

    return <span className="text-xs text-slate-400">No action</span>;
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
          <PortalMetricCard label="Business Name" value={businessName} hint={profile?.merchantId} />
          <PortalMetricCard label="Total Orders" value={profile?.totalOrders ?? "-"} />
          <PortalMetricCard label="Active Orders" value={profile?.activeOrders ?? "-"} />
        </div>

        <PortalSection
          title="Orders"
          description="Prepare orders and mark them ready for courier pickup."
        >
          <OrdersTable
            orders={orders}
            emptyMessage="No merchant orders found."
            columns={["order", "customer", "driver", "status", "amount", "created", "actions"]}
            renderActions={renderMerchantActions}
          />
        </PortalSection>
      </div>
    </PortalShell>
  );
}
