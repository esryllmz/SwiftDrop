"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  OrdersTable,
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button, ErrorState, Field, LoadingState, SecondaryButton } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import { createCustomerOrder, getCustomerOrders, getCustomerProfile } from "@/lib/portal";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { CustomerProfileResponse, OrderResponse } from "@/types/api";

export default function CustomerPage() {
  const { accessToken, user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);

    const trimmedMerchantId = merchantId.trim();
    const amount = Number(totalAmount);
    if (!trimmedMerchantId || !Number.isFinite(amount) || amount <= 0) {
      const message = "Enter a merchant ID and a positive total amount.";
      setCreateError(message);
      showErrorToast(message);
      return;
    }

    setCreating(true);
    try {
      await createCustomerOrder(accessToken, {
        merchantId: trimmedMerchantId,
        totalAmount: amount,
      });
      setModalOpen(false);
      setMerchantId("");
      setTotalAmount("");
      showSuccessToast("Order created.");
      await load();
    } catch (err) {
      const message = normalizeApiError(err, "Order creation failed.");
      setCreateError(message);
      showErrorToast(message);
    } finally {
      setCreating(false);
    }
  }

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
                <h2 className="text-lg font-semibold text-slate-950">Create demo order</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Enter a merchant ID for this demo order.
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

            <form className="mt-5 grid gap-4" onSubmit={handleCreateOrder}>
              <Field label="Merchant ID" value={merchantId} onChange={setMerchantId} />
              <Field label="Total Amount" value={totalAmount} onChange={setTotalAmount} />
              {createError ? <ErrorState message={createError} /> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton
                  type="button"
                  disabled={creating}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </SecondaryButton>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
