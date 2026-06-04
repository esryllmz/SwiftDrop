"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  JsonBlock,
  LoadingState,
  PageHeader,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui";
import { getJson, postJson } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { OrderResponse } from "@/types/api";

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
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatusFilter>("All");
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [customerId, setCustomerId] = useState(
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  );
  const [merchantId, setMerchantId] = useState(
    "11111111-1111-1111-1111-111111111111",
  );
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
      setOrders(await getJson<OrderResponse[]>(`/api/v1/orders${query}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Orders request failed");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

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
      });
      setCreateResult(result);
      setSelectedOrder(result);
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create order failed");
    } finally {
      setCreating(false);
    }
  }

  async function viewOrder(orderId: string) {
    setDetailLoading(true);
    setDetailError(null);
    try {
      setSelectedOrder(await getJson<OrderResponse>(`/api/v1/orders/${orderId}`));
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
        description="Filter, inspect, and create demo orders through the Gateway."
        action={<Button onClick={load}>Refresh</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <Card>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Create Demo Order
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Creates a real order and starts the backend event flow.
                </p>
              </div>
              {createResult ? (
                <Link
                  href="/outbox"
                  className="w-fit rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20"
                >
                  View Outbox Events
                </Link>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_160px_150px]">
              <Field
                label="Customer ID"
                value={customerId}
                onChange={setCustomerId}
              />
              <Field
                label="Merchant ID"
                value={merchantId}
                onChange={setMerchantId}
              />
              <Field
                label="Total Amount"
                value={totalAmount}
                onChange={setTotalAmount}
              />
              <div className="flex items-end">
                <Button className="w-full" disabled={creating} onClick={createOrder}>
                  {creating ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </div>
            {createResult ? (
              <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                Order created successfully. The list was refreshed.
              </div>
            ) : null}
            {createError ? (
              <div className="mt-4">
                <ErrorState message={createError} />
              </div>
            ) : null}
            <div className="mt-4">
              <JsonBlock value={createResult ?? "No create request yet."} />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Order List</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Status filter calls the real query endpoint.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <SecondaryButton
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={
                      selectedStatus === status
                        ? "border-blue-500 bg-blue-500/20 text-blue-100"
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
              <div className="overflow-x-auto rounded-md border border-slate-800">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-950 text-left text-slate-400">
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
                  <tbody className="divide-y divide-slate-800 bg-slate-950">
                    {orders.map((order) => (
                      <tr key={order.id} className="align-top">
                        <td className="px-3 py-2 text-slate-300" title={order.id}>
                          {shortId(order.id)}
                        </td>
                        <td
                          className="px-3 py-2 text-slate-300"
                          title={order.customerId}
                        >
                          {shortId(order.customerId)}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {order.merchantName ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {order.driverName ?? "-"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {formatMoney(Number(order.totalAmount))}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
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

        <Card className="h-fit">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Order Detail</h3>
              <p className="mt-1 text-sm text-slate-400">
                Uses GET /api/v1/orders/id.
              </p>
            </div>
            {selectedOrder ? <StatusBadge status={selectedOrder.status} /> : null}
          </div>
          {detailLoading ? <LoadingState /> : null}
          {detailError ? <ErrorState message={detailError} /> : null}
          {!detailLoading && !selectedOrder ? (
            <EmptyState message="Select an order from the table." />
          ) : null}
          {selectedOrder ? (
            <div className="grid gap-4">
              <dl className="grid gap-3 text-sm">
                <DetailRow label="id" value={selectedOrder.id} />
                <DetailRow label="customerId" value={selectedOrder.customerId} />
                <DetailRow
                  label="merchantName"
                  value={selectedOrder.merchantName ?? "-"}
                />
                <DetailRow
                  label="driverName"
                  value={selectedOrder.driverName ?? "-"}
                />
                <DetailRow label="status" value={selectedOrder.status} />
                <DetailRow
                  label="totalAmount"
                  value={formatMoney(Number(selectedOrder.totalAmount))}
                />
                <DetailRow
                  label="createdAt"
                  value={formatDateTime(selectedOrder.createdAt)}
                />
              </dl>
              <JsonBlock value={selectedOrder} />
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-slate-800 bg-slate-950 p-3">
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="break-all text-slate-200">{value}</dd>
    </div>
  );
}
