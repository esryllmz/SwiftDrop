"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminModal,
  AdvancedDetails,
  DetailField,
  DetailGrid,
  JsonPreview,
  ModalFooter,
  ModalSection,
} from "@/components/admin/modal";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { getJson, postJson } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { MerchantResponse, OrderResponse } from "@/types/api";

const fallbackCustomerId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const fallbackMerchantId = "11111111-1111-1111-1111-111111111111";

const statuses = [
  "All",
  "PLACED",
  "PREPARING",
  "DRIVER_ASSIGNED",
  "ON_THE_WAY",
  "DELIVERED",
] as const;

type OrderStatusFilter = (typeof statuses)[number];

export default function OrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatusFilter>("All");
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState(fallbackCustomerId);
  const [merchantId, setMerchantId] = useState(fallbackMerchantId);
  const [totalAmount, setTotalAmount] = useState("249.90");
  const [createResult, setCreateResult] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query =
        selectedStatus === "All" ? "" : `?status=${selectedStatus}`;
      setOrders(await getJson<OrderResponse[]>(`/api/v1/orders${query}`, undefined, accessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Orders request failed");
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createOrder() {
    setCreating(true);
    setCreateError(null);
    setError(null);
    try {
      const result = await postJson<OrderResponse>("/api/v1/orders", {
        customerId,
        merchantId,
        totalAmount: Number(totalAmount),
      }, undefined, accessToken);
      setCreateResult(result);
      await load();
      setCreateModalOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create order failed");
    } finally {
      setCreating(false);
    }
  }

  async function openCreateOrderModal() {
    setCreateError(null);
    setCreateModalOpen(true);

    if (!accessToken || (merchantId && merchantId !== fallbackMerchantId)) {
      return;
    }

    try {
      const merchants = await getJson<MerchantResponse[]>(
        "/api/v1/merchants",
        undefined,
        accessToken,
      );
      if (merchants[0]?.id) {
        setMerchantId(merchants[0].id);
      }
    } catch {
      // Keep the fallback id; create errors are shown inside the modal.
    }
  }

  async function viewOrder(orderId: string) {
    setDetailModalOpen(true);
    setSelectedOrder(null);
    setDetailLoading(true);
    setDetailError(null);
    try {
      setSelectedOrder(await getJson<OrderResponse>(`/api/v1/orders/${orderId}`, undefined, accessToken));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Order detail failed");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Create, filter, and inspect platform orders."
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={load}>Refresh</SecondaryButton>
            <Button
              onClick={() => void openCreateOrderModal()}
            >
              Create Demo Order
            </Button>
          </div>
        }
      />

      <div className="grid gap-4">
          <Card>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Create Demo Order
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Creates a real order and refreshes this list.
                </p>
              </div>
              {createResult ? (
                <Link
                  href="/event-stream"
                  className="w-fit rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                >
                  View Outbox Events
                </Link>
              ) : null}
            </div>
            {createResult ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Order created successfully. The list was refreshed.
              </div>
            ) : null}
            {createError ? (
              <div className="mt-4">
                <ErrorState message={createError} />
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Order List</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Filter by status and open order details.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <SecondaryButton
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={
                      selectedStatus === status
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : ""
                    }
                  >
                    {status}
                  </SecondaryButton>
                ))}
              </div>
            </div>

            {loading ? <LoadingState /> : null}
            {error ? (
              <div className="mb-4">
                <ErrorState message={error} />
              </div>
            ) : null}
            {!loading && orders.length === 0 ? (
              <EmptyState message="No orders found. Create a demo order to start the event flow." />
            ) : null}
            {orders.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      {[
                        "Order ID",
                        "Customer ID",
                        "Merchant",
                        "Driver",
                        "Status",
                        "Total",
                        "Created",
                        "Actions",
                      ].map((heading) => (
                        <th key={heading} className="px-3 py-2 font-medium">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {orders.map((order) => (
                      <tr key={order.id} className="align-top transition hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700" title={order.id}>
                          {shortId(order.id)}
                        </td>
                        <td
                          className="px-3 py-2 text-slate-700"
                          title={order.customerId}
                        >
                          {shortId(order.customerId)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {order.merchantName ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {order.driverName ?? "-"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatMoney(Number(order.totalAmount))}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <SecondaryButton
                            disabled={detailLoading}
                            onClick={() => void viewOrder(order.id)}
                          >
                            View
                          </SecondaryButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
      </div>

      <AdminModal
        open={createModalOpen}
        title="Create Demo Order"
        subtitle="Create a real demo order"
        onClose={() => {
          if (!creating) {
            setCreateModalOpen(false);
          }
        }}
        footer={
          <ModalFooter>
            <AdminButton
              type="button"
              variant="secondary"
              disabled={creating}
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" form="create-order-form" disabled={creating}>
              {creating ? "Creating..." : "Create Order"}
            </AdminButton>
          </ModalFooter>
        }
      >
        <form
          id="create-order-form"
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void createOrder();
          }}
        >
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
            Creates an order using the current demo IDs.
          </div>
          {createError ? <ErrorState message={createError} /> : null}
          <ModalSection>
            <Field label="Customer ID" value={customerId} onChange={setCustomerId} />
            <Field label="Merchant ID" value={merchantId} onChange={setMerchantId} />
            <Field label="Total Amount" value={totalAmount} onChange={setTotalAmount} />
          </ModalSection>
        </form>
      </AdminModal>

      <AdminModal
        open={detailModalOpen}
        title="Order Detail"
        subtitle={selectedOrder ? shortId(selectedOrder.id) : "Loading order details"}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedOrder(null);
          setDetailError(null);
        }}
        footer={
          <ModalFooter>
            <AdminButton
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setDetailModalOpen(false);
                setSelectedOrder(null);
                setDetailError(null);
              }}
            >
              Close
            </AdminButton>
          </ModalFooter>
        }
      >
        <div className="grid gap-4">
          {detailLoading ? <LoadingState /> : null}
          {detailError ? <ErrorState message={detailError} /> : null}
          {!detailLoading && !detailError && !selectedOrder ? (
            <EmptyState message="No order details are available." />
          ) : null}
          {selectedOrder ? (
            <>
              <DetailGrid>
                <DetailField label="Status" value={<StatusBadge status={selectedOrder.status} />} />
                <DetailField label="Amount" value={formatMoney(Number(selectedOrder.totalAmount))} />
                <DetailField label="Merchant" value={selectedOrder.merchantName} />
                <DetailField label="Driver" value={selectedOrder.driverName ?? "Unassigned"} />
                <DetailField label="Customer ID" value={selectedOrder.customerId} mono />
                <DetailField label="Created At" value={formatDateTime(selectedOrder.createdAt)} />
              </DetailGrid>
              <AdvancedDetails>
                <JsonPreview value={selectedOrder} />
              </AdvancedDetails>
            </>
          ) : null}
        </div>
      </AdminModal>
    </div>
  );
}

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}
