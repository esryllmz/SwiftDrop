"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminModal,
  DetailField,
  DetailGrid,
  ModalFooter,
  ModalSection,
} from "@/components/admin/modal";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SecondaryButton,
} from "@/components/ui";
import {
  AdminDataTable,
  AdminFilterPills,
  AdminIdChip,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
  AdminTableCell,
  AdminViewAction,
} from "@/components/admin/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { getJson, postJson } from "@/lib/api";
import { formatDateTime, formatDisplayId, formatMoney, maskTechnicalId } from "@/lib/format";
import { formatOrderStatus } from "@/lib/order-status";
import type { MerchantResponse, OrderResponse } from "@/types/api";

const fallbackCustomerId = "44444444-4444-4444-4444-444444444444";
const fallbackMerchantId = "11111111-1111-1111-1111-111111111111";

const statuses = [
  "All",
  "PLACED",
  "AWAITING_ASSIGNMENT",
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
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query =
        selectedStatus === "All" || selectedStatus === "AWAITING_ASSIGNMENT"
          ? ""
          : `?status=${selectedStatus}`;
      const response = await getJson<OrderResponse[]>(`/api/v1/orders${query}`, undefined, accessToken);
      setOrders(selectedStatus === "AWAITING_ASSIGNMENT"
        ? response.filter((order) => !order.driverName)
        : response);
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

  async function assignDemoCourier(orderId: string) {
    setAssigningOrderId(orderId);
    setError(null);
    try {
      const updatedOrder = await postJson<OrderResponse>(
        `/api/v1/admin/orders/${orderId}/assign-demo-courier`,
        undefined,
        undefined,
        accessToken,
      );
      setOrders((current) => current.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
      setSelectedOrder((current) => current?.id === updatedOrder.id ? updatedOrder : current);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo courier assignment failed.");
    } finally {
      setAssigningOrderId(null);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <AdminPageHeader
        icon="OR"
        title="Orders"
        description="Manage and inspect all platform orders."
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

      <div className="grid gap-5">
          <AdminSectionCard
            title="Create Demo Order"
            description="Creates a real order and refreshes this list."
            action={
              createResult ? (
                <Link
                  href="/event-stream"
                  className="w-fit rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                >
                  View Outbox Events
                </Link>
              ) : null
            }
          >
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
          </AdminSectionCard>

          <AdminSectionCard
            title="Order List"
            description="Filter by status and open order details."
            action={
              <div className="flex flex-wrap gap-2">
                <AdminFilterPills
                  items={statuses}
                  selected={selectedStatus}
                  getLabel={(status) => {
                    if (status === "All") return "All orders";
                    if (status === "AWAITING_ASSIGNMENT") return "Awaiting assignment";
                    return formatOrderStatus(status);
                  }}
                  onSelect={setSelectedStatus}
                />
              </div>
            }
          >

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
              <AdminDataTable
                columns={["Order", "Customer", "Merchant", "Courier", "Status", "Amount", "Created", "Actions"]}
                rows={orders}
                emptyMessage="No orders found."
                getRowKey={(order) => order.id}
                renderRow={(order) => (
                  <>
                    <AdminTableCell title={formatDisplayId(order.id, "Order")}><AdminIdChip value={order.id} prefix="Order" /></AdminTableCell>
                    <AdminTableCell>Customer account</AdminTableCell>
                    <AdminTableCell>{displayValue(order.merchantName)}</AdminTableCell>
                    <AdminTableCell>{order.driverName ?? "Awaiting courier assignment"}</AdminTableCell>
                    <AdminTableCell>
                      <AdminStatusBadge status={order.status} label={formatOrderStatus(order.status)} />
                    </AdminTableCell>
                    <AdminTableCell>{formatMoney(Number(order.totalAmount))}</AdminTableCell>
                    <AdminTableCell>{formatDateTime(order.createdAt)}</AdminTableCell>
                    <AdminTableCell>
                      <span className="flex flex-wrap gap-2">
                        {canAssignDemoCourier(order) ? (
                          <AdminButton
                            type="button"
                            variant="secondary"
                            disabled={assigningOrderId === order.id}
                            onClick={() => void assignDemoCourier(order.id)}
                          >
                            {assigningOrderId === order.id ? "Assigning..." : "Assign demo courier"}
                          </AdminButton>
                        ) : null}
                        <AdminViewAction
                          disabled={detailLoading}
                          onClick={() => void viewOrder(order.id)}
                        />
                      </span>
                    </AdminTableCell>
                  </>
                )}
              />
            ) : null}
          </AdminSectionCard>
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
            Creates an order using the fixed demo customer and merchant. Use Assign demo courier if the order is not assigned automatically.
          </div>
          {createError ? <ErrorState message={createError} /> : null}
          <ModalSection>
            <Field label="Customer Reference" value={customerId} onChange={setCustomerId} />
            <Field label="Merchant Reference" value={merchantId} onChange={setMerchantId} />
            <Field label="Total Amount" value={totalAmount} onChange={setTotalAmount} />
          </ModalSection>
        </form>
      </AdminModal>

      <AdminModal
        open={detailModalOpen}
        title="Order Detail"
        subtitle={selectedOrder ? formatDisplayId(selectedOrder.id, "Order") : "Loading order details"}
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
                <DetailField label="Order ID" value={maskTechnicalId(selectedOrder.id)} mono />
                <DetailField label="Customer" value={maskTechnicalId(selectedOrder.customerId)} mono />
                <DetailField label="Merchant" value={selectedOrder.merchantName} />
                <DetailField label="Courier" value={selectedOrder.driverName ?? "Awaiting courier assignment"} />
                <DetailField label="Courier email" value={selectedOrder.driverEmail} />
                <DetailField
                  label="Status"
                  value={
                    <AdminStatusBadge
                      status={selectedOrder.status}
                      label={formatOrderStatus(selectedOrder.status)}
                    />
                  }
                />
                <DetailField label="Amount" value={formatMoney(Number(selectedOrder.totalAmount))} />
                <DetailField label="Created at" value={formatDateTime(selectedOrder.createdAt)} />
                <DetailField label="Updated at" value={selectedOrder.version ? `Version ${selectedOrder.version}` : null} />
                <DetailField label="Cancellation reason" value={selectedOrder.cancellationReason} />
                <DetailField label="Picked up at" value={formatOptionalDateTime(selectedOrder.pickedUpAt)} />
                <DetailField label="On the way at" value={formatOptionalDateTime(selectedOrder.onTheWayAt)} />
                <DetailField label="Delivered at" value={formatOptionalDateTime(selectedOrder.deliveredAt)} />
                <DetailField label="Cancelled at" value={formatOptionalDateTime(selectedOrder.cancelledAt)} />
              </DetailGrid>
              {canAssignDemoCourier(selectedOrder) ? (
                <AdminButton
                  type="button"
                  variant="secondary"
                  disabled={assigningOrderId === selectedOrder.id}
                  onClick={() => void assignDemoCourier(selectedOrder.id)}
                >
                  {assigningOrderId === selectedOrder.id ? "Assigning..." : "Assign demo courier"}
                </AdminButton>
              ) : null}
            </>
          ) : null}
        </div>
      </AdminModal>
    </div>
  );
}

function displayValue(value?: string | null) {
  return value && value.trim() ? value : "Not available";
}

function formatOptionalDateTime(value?: string | null) {
  return value ? formatDateTime(value) : "Not available";
}

function canAssignDemoCourier(order: OrderResponse) {
  return order.status === "PLACED" && !order.driverName;
}
