"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  OrdersTable,
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import { ErrorState, LoadingState, SecondaryButton } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import { getMerchantOrders, getMerchantProfile } from "@/lib/portal";
import { showErrorToast } from "@/lib/toast";
import type { MerchantProfileResponse, OrderResponse } from "@/types/api";

export default function MerchantPage() {
  const { accessToken, user } = useAuth();
  const [profile, setProfile] = useState<MerchantProfileResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const businessName = profile?.businessName ?? profile?.name ?? "Store";

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
          description="Read-only merchant order view."
        >
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Order actions will be available after merchant order workflow is enabled.
          </div>
          <OrdersTable
            orders={orders}
            emptyMessage="No merchant orders found."
            columns={["order", "customer", "driver", "status", "amount", "created"]}
          />
        </PortalSection>
      </div>
    </PortalShell>
  );
}
