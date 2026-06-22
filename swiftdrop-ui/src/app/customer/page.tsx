"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  OrdersTable,
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button, ErrorState, LoadingState, SecondaryButton } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import {
  createCustomerOrder,
  getCustomerMerchants,
  getCustomerOrders,
  getCustomerProfile,
} from "@/lib/portal";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type {
  CustomerMerchantOption,
  CustomerProfileResponse,
  OrderResponse,
} from "@/types/api";

export default function CustomerPage() {
  const { accessToken, user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [merchants, setMerchants] = useState<CustomerMerchantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchantsError, setMerchantsError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadMerchants = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setMerchantsLoading(true);
    setMerchantsError(null);
    try {
      const nextMerchants = await getCustomerMerchants(accessToken);
      setMerchants(nextMerchants);
      setSelectedMerchantId((current) =>
        nextMerchants.some((merchant) => merchant.id === current)
          ? current
          : nextMerchants[0]?.id ?? "",
      );
    } catch (err) {
      setMerchants([]);
      setSelectedMerchantId("");
      setMerchantsError(normalizeApiError(err, "Merchant list could not be loaded."));
    } finally {
      setMerchantsLoading(false);
    }
  }, [accessToken]);

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
    const timer = window.setTimeout(() => {
      void load();
      void loadMerchants();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, loadMerchants]);

  const closeModal = useCallback(() => {
    if (creating) {
      return;
    }

    setModalOpen(false);
    setCreateError(null);
    setTotalAmount("");
    setSelectedMerchantId(merchants[0]?.id ?? "");
  }, [creating, merchants]);

  const handleCreateOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      const message = "Please sign in again before creating an order.";
      setCreateError(message);
      showErrorToast(message);
      return;
    }

    const parsedAmount = Number(totalAmount);
    if (!selectedMerchantId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      const message = "Select a merchant and enter a valid total amount.";
      setCreateError(message);
      showErrorToast(message);
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      await createCustomerOrder(accessToken, {
        merchantId: selectedMerchantId,
        totalAmount: parsedAmount,
      });
      showSuccessToast("Order created successfully.");
      setModalOpen(false);
      setSelectedMerchantId(merchants[0]?.id ?? "");
      setTotalAmount("");
      await load();
    } catch (err) {
      const message = normalizeApiError(err, "Order could not be created.");
      setCreateError(message);
      showErrorToast(message);
    } finally {
      setCreating(false);
    }
  };

  const parsedTotalAmount = Number(totalAmount);
  const totalAmountValid = Number.isFinite(parsedTotalAmount) && parsedTotalAmount > 0;
  const merchantSelectDisabled =
    creating || merchantsLoading || Boolean(merchantsError) || merchants.length === 0;
  const createDisabled =
    creating ||
    merchantsLoading ||
    merchants.length === 0 ||
    !selectedMerchantId ||
    !totalAmountValid;

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
                  Choose an available merchant and enter the order total.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={creating}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-50"
                aria-label="Close"
              >
                X
              </button>
            </div>

            <form className="mt-5 grid gap-4" onSubmit={handleCreateOrder}>
              {merchantsLoading ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  Loading merchants...
                </div>
              ) : null}

              {merchantsError ? (
                <div className="grid gap-3">
                  <ErrorState message={merchantsError} />
                  <SecondaryButton
                    type="button"
                    className="w-fit"
                    onClick={() => void loadMerchants()}
                    disabled={merchantsLoading || creating}
                  >
                    Retry
                  </SecondaryButton>
                </div>
              ) : null}

              {!merchantsLoading && !merchantsError && merchants.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  No merchants are available for new orders yet.
                </div>
              ) : null}

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Merchant</span>
                <select
                  value={selectedMerchantId}
                  onChange={(event) => setSelectedMerchantId(event.target.value)}
                  disabled={merchantSelectDisabled}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {merchants.length === 0 ? (
                    <option value="">No merchants are currently available.</option>
                  ) : (
                    merchants.map((merchant) => (
                      <option key={merchant.id} value={merchant.id}>
                        {merchant.locationLabel
                          ? `${merchant.name} - ${merchant.locationLabel}`
                          : merchant.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Total Amount</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={totalAmount}
                  onChange={(event) => setTotalAmount(event.target.value)}
                  disabled={creating}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                />
              </label>

              {createError ? <ErrorState message={createError} /> : null}

              <div className="flex justify-end gap-2">
                <SecondaryButton type="button" onClick={closeModal} disabled={creating}>
                  Cancel
                </SecondaryButton>
                <Button type="submit" disabled={createDisabled}>
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
