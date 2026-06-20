"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  OrdersTable,
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button, ErrorState, LoadingState, SecondaryButton } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import { getCustomerOrders, getCustomerProfile } from "@/lib/portal";
import { showErrorToast } from "@/lib/toast";
import type { CustomerProfileResponse, OrderResponse } from "@/types/api";

export default function CustomerPage() {
  const { accessToken, user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextProfile, nextOrders] = await Promise.all([
        getCustomerProfile(accessToken),
        getCustomerOrders(accessToken),
      ]);
      setProfile(nextProfile);
      setOrders(nextOrders);
    } catch (err) {
      const message = normalizeApiError(err, "Customer portal request failed.");
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
      portalType="customer"
      email={profile?.email ?? user?.email ?? ""}
      title="Dashboard"
      subtitle="Track your SwiftDrop orders and create demo orders."
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
          <PortalMetricCard label="Total Orders" value={profile?.totalOrders ?? "-"} />
          <PortalMetricCard label="Active Orders" value={profile?.activeOrders ?? "-"} />
          <PortalMetricCard label="Delivered" value={profile?.deliveredOrders ?? "-"} />
        </div>

        <PortalSection
          title="Recent Orders"
          description="Active and recent orders for this customer account."
          action={<Button onClick={() => setModalOpen(true)}>New Order</Button>}
        >
          <OrdersTable
            orders={orders}
            emptyMessage="No orders found. Create a demo order to start."
            columns={["order", "merchant", "driver", "status", "amount", "created"]}
          />
        </PortalSection>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Create order</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Merchant selection is not available yet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-50"
                aria-label="Close"
              >
                X
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                A customer-safe merchant picker endpoint is required before orders can be created from this portal.
              </div>
              <div className="flex justify-end">
                <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
                  Close
                </SecondaryButton>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
