"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorState, Field, JsonBlock, LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getJson, postJson } from "@/lib/api";
import type { OrderResponse } from "@/types/api";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [customerId, setCustomerId] = useState("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  const [merchantId, setMerchantId] = useState("11111111-1111-1111-1111-111111111111");
  const [totalAmount, setTotalAmount] = useState("249.90");
  const [createResult, setCreateResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await getJson<OrderResponse[]>("/api/v1/orders"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Orders request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createOrder() {
    setCreating(true);
    setError(null);
    try {
      const result = await postJson<OrderResponse>("/api/v1/orders", {
        customerId,
        merchantId,
        totalAmount: Number(totalAmount),
      });
      setCreateResult(result);
      await load();
    } catch (err) {
      setCreateResult(err);
      setError(err instanceof Error ? err.message : "Create order failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader title="Orders" description="Order list and a simple demo order creator." action={<Button onClick={load}>Refresh</Button>} />
      <Card className="mb-4">
        <h3 className="text-lg font-semibold text-white">Create Demo Order</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <Field label="Customer ID" value={customerId} onChange={setCustomerId} />
          <Field label="Merchant ID" value={merchantId} onChange={setMerchantId} />
          <Field label="Total Amount" value={totalAmount} onChange={setTotalAmount} />
          <div className="flex items-end">
            <Button className="w-full" disabled={creating} onClick={createOrder}>
              {creating ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <JsonBlock value={createResult ?? "No create request yet."} />
        </div>
      </Card>
      {loading ? <LoadingState /> : null}
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {!loading && orders.length === 0 ? <EmptyState message="No orders found." /> : null}
      {orders.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900 text-left text-slate-400">
              <tr>{["id", "customerId", "merchantName", "driverName", "status", "totalAmount", "createdAt"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-3 py-2 text-slate-300">{order.id}</td>
                  <td className="px-3 py-2 text-slate-300">{order.customerId}</td>
                  <td className="px-3 py-2 text-slate-300">{order.merchantName ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-300">{order.driverName ?? "-"}</td>
                  <td className="px-3 py-2"><StatusBadge status={order.status} /></td>
                  <td className="px-3 py-2 text-slate-300">{formatMoney(Number(order.totalAmount))}</td>
                  <td className="px-3 py-2 text-slate-300">{formatDateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
