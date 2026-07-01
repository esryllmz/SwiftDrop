"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  OrdersTable,
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button, ErrorState, LoadingState, SecondaryButton, StatusBadge } from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import { formatCurrencyTRY, formatDateTime, formatDisplayId } from "@/lib/format";
import { formatOrderStatus } from "@/lib/order-status";
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
  OrderStatus,
} from "@/types/api";

const activeCustomerStatuses: OrderStatus[] = [
  "PLACED",
  "DRIVER_ASSIGNED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
];
const orderProgressSteps: OrderStatus[] = [
  "PLACED",
  "DRIVER_ASSIGNED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
];
const demoMerchantId = "11111111-1111-1111-1111-111111111111";

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
          : getDefaultMerchantId(nextMerchants),
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
    setSelectedMerchantId(getDefaultMerchantId(merchants));
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
      setSelectedMerchantId(getDefaultMerchantId(merchants));
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
  const activeOrders =
    profile?.activeOrders ??
    orders.filter((order) => activeCustomerStatuses.includes(order.status)).length;
  const deliveredOrders =
    profile?.deliveredOrders ??
    orders.filter((order) => order.status === "DELIVERED").length;
  const cancelledOrders = orders.filter((order) => order.status === "CANCELLED").length;
  const totalSpending = orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
  const activeOrder =
    orders
      .filter((order) => activeCustomerStatuses.includes(order.status))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ??
    orders
      .filter((order) => order.status === "CANCELLED")
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ??
    null;
  const recentOrders = orders.slice(0, 5);
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
      title="Welcome back"
      subtitle="Track your deliveries and manage your orders."
    >
      <div className="grid gap-3">
        {loading ? <LoadingState /> : null}
        {error ? (
          <div className="grid gap-3">
            <ErrorState message={error} />
            <SecondaryButton className="w-fit" onClick={() => void load()}>
              Retry
            </SecondaryButton>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <PortalMetricCard compact tone="sunrise" label="Active orders" value={loading && !profile ? "-" : activeOrders} />
          <PortalMetricCard compact tone="mint" label="Delivered orders" value={loading && !profile ? "-" : deliveredOrders} />
          <PortalMetricCard compact tone="berry" label="Cancelled orders" value={loading && !profile ? "-" : cancelledOrders} />
          <PortalMetricCard compact tone="ink" label="Total spending" value={loading ? "-" : formatCurrencyTRY(totalSpending)} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <PortalSection
            tone="customer"
            compact
            title="Current order"
            description="The most recent active delivery for this account."
            action={activeOrder?.id ? <DetailLink href={`/customer/orders/${activeOrder.id}`} label="View details" /> : null}
          >
            {activeOrder ? (
              <div className="grid gap-3">
                <div className="flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase text-orange-700">{formatDisplayId(activeOrder.id, "Order")}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={activeOrder.status} label={formatOrderStatus(activeOrder.status)} />
                      <span className="text-xs text-orange-800">{formatDateTime(activeOrder.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-orange-950">{formatCurrencyTRY(activeOrder.totalAmount)}</div>
                </div>
                <DashboardOrderStepper order={activeOrder} />
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoTile label="Merchant" value={activeOrder.merchantName ?? "Not available"} />
                  <InfoTile label="Courier" value={activeOrder.driverName ?? activeOrder.driverEmail ?? "Awaiting courier assignment"} />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50 p-5">
                <p className="text-sm font-semibold text-orange-950">No active order right now.</p>
                <p className="mt-1 text-sm text-orange-800">Create an order to see the delivery flow.</p>
              </div>
            )}
          </PortalSection>

          <PortalSection compact tone="customer" title="Quick actions" description="Start or review your delivery flow.">
            <div className="grid gap-2">
              <Button className="border-orange-600 bg-orange-600 hover:bg-orange-700 focus:ring-orange-500" onClick={() => setModalOpen(true)}>Create order</Button>
              <DetailLink href="/customer/orders" label="View orders" />
              <DetailLink href="/customer/profile" label="Manage profile" />
            </div>
          </PortalSection>
        </div>

        <PortalSection
          tone="customer"
          compact
          title="Recent Orders"
          description="Active and recent orders for this customer account."
          action={<Button className="border-orange-600 bg-orange-600 hover:bg-orange-700 focus:ring-orange-500" onClick={() => setModalOpen(true)}>Create order</Button>}
        >
          <OrdersTable
            variant="customer"
            orders={recentOrders}
            emptyMessage="No orders found. Create an order to start."
            columns={["order", "merchant", "driver", "status", "amount", "created", "actions"]}
            renderActions={(order) =>
              order.id ? <DetailLink href={`/customer/orders/${order.id}`} label="Details" /> : null
            }
          />
        </PortalSection>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <section className="w-full max-w-lg overflow-hidden rounded-lg border border-orange-100 bg-white shadow-2xl shadow-slate-950/20">
            <div className="border-b border-orange-100 bg-orange-50 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-orange-700">Customer checkout</div>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Create order</h2>
                  <p className="mt-1 text-sm leading-6 text-orange-900">
                  Choose an available merchant and enter the order total.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={creating}
                  className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close"
                >
                  X
                </button>
              </div>
            </div>

            <form className="grid gap-4 p-5" onSubmit={handleCreateOrder}>
              {merchantsLoading ? (
                <div className="rounded-lg border border-orange-100 bg-orange-50 p-3 text-sm text-orange-800">
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
                  className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
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
                  className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                />
              </label>

              {createError ? <ErrorState message={createError} /> : null}

              <div className="flex justify-end gap-2">
                <SecondaryButton type="button" onClick={closeModal} disabled={creating}>
                  Cancel
                </SecondaryButton>
                <Button className="border-orange-600 bg-orange-600 hover:bg-orange-700 focus:ring-orange-500" type="submit" disabled={createDisabled}>
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

function getDefaultMerchantId(merchants: CustomerMerchantOption[]) {
  return merchants.find((merchant) => merchant.id === demoMerchantId)?.id ?? merchants[0]?.id ?? "";
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-orange-100 bg-white p-3 shadow-sm shadow-orange-100/60">
      <div className="text-xs font-semibold uppercase text-orange-700">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function DashboardOrderStepper({ order }: { order: OrderResponse }) {
  const steps =
    order.status === "CANCELLED"
      ? ([...orderProgressSteps.slice(0, 1), "CANCELLED"] as OrderStatus[])
      : orderProgressSteps;
  const currentIndex = steps.indexOf(order.status);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-950">Current status</div>
        <div className="text-sm font-medium text-orange-800">{formatOrderStatus(order.status)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {steps.map((step, index) => {
          const completed =
            order.status === "CANCELLED" ? index < steps.length - 1 : index < currentIndex;
          const current = step === order.status;

          return (
            <div
              key={step}
              className={`rounded-lg border px-2.5 py-2 text-xs ${
                current
                  ? "border-orange-300 bg-orange-100 text-orange-950"
                  : completed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  current
                    ? "bg-orange-600 text-white"
                    : completed
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-400"
                }`}>
                  {completed ? "✓" : index + 1}
                </span>
                <span className="font-semibold">{formatOrderStatus(step)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-800 transition hover:border-orange-300 hover:bg-orange-50"
    >
      {label}
    </Link>
  );
}
