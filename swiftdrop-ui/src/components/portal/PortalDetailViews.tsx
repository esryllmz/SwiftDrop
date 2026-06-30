"use client";

import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CourierAssignmentsTable } from "@/components/portal/CourierAssignmentsTable";
import { MerchantOrdersTable } from "@/components/portal/MerchantOrdersTable";
import {
  OrdersTable,
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import { formatCurrencyTRY, formatDateTime, formatDisplayId, formatStatusLabel } from "@/lib/format";
import { formatOrderStatus } from "@/lib/order-status";
import {
  cancelCustomerOrder,
  cancelMerchantOrder,
  getCourierAssignmentDetail,
  getCourierAssignments,
  getCourierProfile,
  getCustomerOrderDetail,
  getCustomerOrders,
  getCustomerProfile,
  getMerchantOrderDetail,
  getMerchantOrders,
  getMerchantProfile,
  markCourierOrderDelivered,
  markCourierOrderOnTheWay,
  markCourierOrderPickedUp,
  markMerchantOrderPreparing,
  markMerchantOrderReadyForPickup,
} from "@/lib/portal";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type {
  CourierProfileResponse,
  CustomerProfileResponse,
  MerchantProfileResponse,
  OrderResponse,
  OrderStatus,
  UserRole,
} from "@/types/api";

type PortalKind = "customer" | "merchant" | "courier";
type LoadState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

const activeCustomerStatuses: OrderStatus[] = [
  "PLACED",
  "DRIVER_ASSIGNED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
];
const activeCourierStatuses: OrderStatus[] = [
  "DRIVER_ASSIGNED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
];

export function CustomerOrdersPage() {
  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "delivered" | "cancelled">("all");
  const { loading, error, reload } = usePortalLoad(async () => {
    const nextOrders = await getCustomerOrders(accessToken);
    setOrders(nextOrders);
  }, accessToken, "Customer orders could not be loaded.");

  const filteredOrders = useMemo(() => {
    if (filter === "active") {
      return orders.filter((order) => activeCustomerStatuses.includes(order.status));
    }
    if (filter === "delivered") {
      return orders.filter((order) => order.status === "DELIVERED");
    }
    if (filter === "cancelled") {
      return orders.filter((order) => order.status === "CANCELLED");
    }
    return orders;
  }, [filter, orders]);
  const handleCancel = useCancelOrderAction(
    accessToken,
    "customer",
    setActionOrderId,
    reload,
  );

  return (
    <PortalShell
      portalType="customer"
      email={user?.email ?? ""}
      title="Orders"
      subtitle="Review your active and completed SwiftDrop orders."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <PortalSection
        title="Order List"
        description="Client-side filters are computed from the available order data."
        action={<FilterTabs value={filter} onChange={setFilter} options={["all", "active", "delivered", "cancelled"]} />}
      >
        <OrdersTable
          orders={filteredOrders}
          emptyMessage="No orders found."
          columns={["order", "merchant", "driver", "status", "amount", "created", "actions"]}
          renderActions={(order) => (
            <span className="flex flex-wrap items-center gap-2">
              {["PLACED", "DRIVER_ASSIGNED"].includes(order.status) ? (
                <Button
                  className="min-h-9 px-3 py-1.5 text-xs"
                  disabled={actionOrderId === order.id}
                  onClick={() => setCancelOrder(order)}
                >
                  Cancel order
                </Button>
              ) : null}
              <DetailLink href={`/customer/orders/${order.id}`} label="Details" />
            </span>
          )}
        />
      </PortalSection>
      <CancelOrderModal
        order={cancelOrder}
        loading={Boolean(cancelOrder && actionOrderId === cancelOrder.id)}
        onClose={() => setCancelOrder(null)}
        onSubmit={async (reason) => {
          if (!cancelOrder) {
            return;
          }
          await handleCancel(cancelOrder.id, reason);
          setCancelOrder(null);
        }}
      />
    </PortalShell>
  );
}

export function CustomerOrderDetailPage({ orderId }: { orderId: string }) {
  const { accessToken } = useAuth();
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleCancel = useCancelOrderAction(accessToken, "customer", setActionOrderId, () => setRefreshKey((value) => value + 1));

  return (
    <>
      <OrderDetailPage
        key={refreshKey}
        portalType="customer"
        title="Order Detail"
        subtitle="Review the order summary and current delivery progress."
        loadOrder={(token) => getCustomerOrderDetail(token, orderId)}
        backHref="/customer/orders"
        actionRenderer={(order) => (
          ["PLACED", "DRIVER_ASSIGNED"].includes(order.status) ? (
            <Button className="w-fit" disabled={actionOrderId === order.id} onClick={() => setCancelOrder(order)}>
              Cancel order
            </Button>
          ) : null
        )}
      />
      <CancelOrderModal
        order={cancelOrder}
        loading={Boolean(cancelOrder && actionOrderId === cancelOrder.id)}
        onClose={() => setCancelOrder(null)}
        onSubmit={async (reason) => {
          if (!cancelOrder) {
            return;
          }
          await handleCancel(cancelOrder.id, reason);
          setCancelOrder(null);
        }}
      />
    </>
  );
}

export function CustomerAddressesPage() {
  const { user } = useAuth();
  return (
    <PortalShell
      portalType="customer"
      email={user?.email ?? ""}
      title="Addresses"
      subtitle="Manage delivery address information for future order flows."
    >
      <PortalSection
        title="Address Management"
        description="Address storage is not exposed by the current backend contract."
        action={<span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Coming soon</span>}
      >
        <div className="grid gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6">
          <EmptyState message="Address management is not available yet." />
          <Button disabled className="w-fit">Add Address</Button>
        </div>
      </PortalSection>
    </PortalShell>
  );
}

export function CustomerProfilePage() {
  return (
    <ProfilePage<CustomerProfileResponse>
      portalType="customer"
      title="Profile"
      subtitle="Review your customer account details."
      loadProfile={getCustomerProfile}
      render={(profile) => (
        <DetailGrid
          fields={[
            ["Customer Name", "Not available"],
            ["Email", profile.email],
            ["Role", formatRole(profile.role)],
            ["Account Status", "Active"],
            ["Total Orders", formatCount(profile.totalOrders)],
            ["Delivered Orders", formatCount(profile.deliveredOrders)],
          ]}
        />
      )}
    />
  );
}

export function MerchantOrdersPage() {
  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);
  const [filter, setFilter] = useState<"new" | "preparing" | "ready" | "courier" | "completed" | "cancelled">("new");
  const { loading, error, reload } = usePortalLoad(async () => {
    setOrders(await getMerchantOrders(accessToken));
  }, accessToken, "Merchant orders could not be loaded.");
  const filteredOrders = useMemo(() => filterMerchantOrders(orders, filter), [filter, orders]);
  const handleAction = useMerchantOrderAction(accessToken, setActionOrderId, reload);
  const handleCancel = useCancelOrderAction(accessToken, "merchant", setActionOrderId, reload);

  return (
    <PortalShell
      portalType="merchant"
      email={user?.email ?? ""}
      title="Orders"
      subtitle="Prepare orders and mark them ready for courier pickup."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <PortalSection
        title="Order Workflow"
        description="Actions use the current merchant order endpoints."
        action={<FilterTabs value={filter} onChange={setFilter} options={["new", "preparing", "ready", "courier", "completed", "cancelled"]} />}
      >
        <MerchantOrdersTable
          orders={filteredOrders}
          actionOrderId={actionOrderId}
          detailHrefFor={(order) => `/merchant/orders/${order.id}`}
          onPreparing={(id) => void handleAction(id, "preparing")}
          onReadyForPickup={(id) => void handleAction(id, "ready-for-pickup")}
          onCancel={setCancelOrder}
        />
      </PortalSection>
      <CancelOrderModal
        order={cancelOrder}
        loading={Boolean(cancelOrder && actionOrderId === cancelOrder.id)}
        onClose={() => setCancelOrder(null)}
        onSubmit={async (reason) => {
          if (!cancelOrder) {
            return;
          }
          await handleCancel(cancelOrder.id, reason);
          setCancelOrder(null);
        }}
      />
    </PortalShell>
  );
}

export function MerchantOrderDetailPage({ orderId }: { orderId: string }) {
  const { accessToken } = useAuth();
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleAction = useMerchantOrderAction(accessToken, setActionOrderId, () => setRefreshKey((value) => value + 1));
  const handleCancel = useCancelOrderAction(accessToken, "merchant", setActionOrderId, () => setRefreshKey((value) => value + 1));

  return (
    <>
      <OrderDetailPage
        key={refreshKey}
        portalType="merchant"
        title="Order Detail"
        subtitle="Review order details and available merchant action."
        loadOrder={(token) => getMerchantOrderDetail(token, orderId)}
        backHref="/merchant/orders"
        actionRenderer={(order) => (
          <MerchantOrdersTable
            orders={[order]}
            actionOrderId={actionOrderId}
            onPreparing={(id) => void handleAction(id, "preparing")}
            onReadyForPickup={(id) => void handleAction(id, "ready-for-pickup")}
            onCancel={setCancelOrder}
          />
        )}
      />
      <CancelOrderModal
        order={cancelOrder}
        loading={Boolean(cancelOrder && actionOrderId === cancelOrder.id)}
        onClose={() => setCancelOrder(null)}
        onSubmit={async (reason) => {
          if (!cancelOrder) {
            return;
          }
          await handleCancel(cancelOrder.id, reason);
          setCancelOrder(null);
        }}
      />
    </>
  );
}

export function MerchantStorePage() {
  return (
    <ProfilePage<MerchantProfileResponse>
      portalType="merchant"
      title="Store"
      subtitle="Review the store profile available from the merchant backend."
      loadProfile={getMerchantProfile}
      render={(profile) => (
        <DetailGrid
          fields={[
            ["Business Name", profile.businessName ?? profile.name ?? "Not available"],
            ["Description", "Not available"],
            ["Address", "Not available"],
            ["Phone", "Not available"],
            ["Location", formatLocation(profile.latitude, profile.longitude)],
            ["Accepting Orders", "Not available"],
            ["Average Preparation Time", "Not available"],
            ["Edit Store", "Store editing is not available yet."],
          ]}
        />
      )}
    />
  );
}

export function MerchantAnalyticsPage() {
  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const { loading, error, reload } = usePortalLoad(async () => {
    setOrders(await getMerchantOrders(accessToken));
  }, accessToken, "Merchant analytics could not be loaded.");
  const analytics = useMemo(() => computeAnalytics(orders), [orders]);

  return (
    <PortalShell
      portalType="merchant"
      email={user?.email ?? ""}
      title="Analytics"
      subtitle="Metrics computed from available order data."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <div className="grid gap-4 md:grid-cols-3">
        <PortalMetricCard label="Total Orders" value={formatCount(analytics.totalOrders)} />
        <PortalMetricCard label="Active Orders" value={formatCount(analytics.activeOrders)} />
        <PortalMetricCard label="Delivered Orders" value={formatCount(analytics.deliveredOrders)} />
        <PortalMetricCard label="Revenue Total" value={formatCurrencyTRY(analytics.revenueTotal)} />
        <PortalMetricCard label="Average Order Value" value={formatCurrencyTRY(analytics.averageOrderValue)} />
      </div>
      <div className="mt-5">
        <PortalSection title="Status Distribution" description="Computed from the merchant order list.">
          {analytics.totalOrders === 0 ? (
            <EmptyState message="No orders found." />
          ) : (
            <div className="grid gap-2">
              {analytics.statusDistribution.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <StatusBadge status={status} label={formatOrderStatus(status)} />
                  <span className="text-sm font-medium text-slate-700">{formatCount(count)}</span>
                </div>
              ))}
            </div>
          )}
        </PortalSection>
      </div>
    </PortalShell>
  );
}

export function MerchantProfilePage() {
  return (
    <ProfilePage<MerchantProfileResponse>
      portalType="merchant"
      title="Profile"
      subtitle="Review your merchant account details."
      loadProfile={getMerchantProfile}
      render={(profile) => (
        <DetailGrid
          fields={[
            ["Business Name", profile.businessName ?? profile.name ?? "Not available"],
            ["Email", profile.email],
            ["Role", formatRole(profile.role)],
            ["Store Association", profile.merchantId ? formatDisplayId(profile.merchantId, "Store") : "Not available"],
            ["Account Status", "Active"],
          ]}
        />
      )}
    />
  );
}

export function CourierAssignmentsPage() {
  const { accessToken, user } = useAuth();
  const [assignments, setAssignments] = useState<OrderResponse[]>([]);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const { loading, error, reload } = usePortalLoad(async () => {
    const nextAssignments = await getCourierAssignments(accessToken);
    setAssignments(nextAssignments.filter((assignment) => activeCourierStatuses.includes(assignment.status)));
  }, accessToken, "Courier assignments could not be loaded.");
  const handleAction = useCourierOrderAction(accessToken, setActionOrderId, reload);

  return (
    <PortalShell
      portalType="courier"
      email={user?.email ?? ""}
      title="Assignments"
      subtitle="Active delivery work assigned to this courier account."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <PortalSection title="Active Assignments" description="Delivered assignments are shown in history.">
        <CourierAssignmentsTable
          assignments={assignments}
          actionOrderId={actionOrderId}
          detailHrefFor={(order) => `/courier/assignments/${order.id}`}
          onPickedUp={(id) => void handleAction(id, "picked-up")}
          onOnTheWay={(id) => void handleAction(id, "on-the-way")}
          onDelivered={(id) => void handleAction(id, "delivered")}
        />
      </PortalSection>
    </PortalShell>
  );
}

export function CourierAssignmentDetailPage({ orderId }: { orderId: string }) {
  const { accessToken } = useAuth();
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleAction = useCourierOrderAction(accessToken, setActionOrderId, () => setRefreshKey((value) => value + 1));

  return (
    <OrderDetailPage
      key={refreshKey}
      portalType="courier"
      title="Assignment Detail"
      subtitle="Review pickup and delivery information available for this assignment."
      loadOrder={(token) => getCourierAssignmentDetail(token, orderId)}
      backHref="/courier/assignments"
      actionRenderer={(order) => (
        <CourierAssignmentsTable
          assignments={[order]}
          actionOrderId={actionOrderId}
          onPickedUp={(id) => void handleAction(id, "picked-up")}
          onOnTheWay={(id) => void handleAction(id, "on-the-way")}
          onDelivered={(id) => void handleAction(id, "delivered")}
        />
      )}
    />
  );
}

export function CourierHistoryPage() {
  const { accessToken, user } = useAuth();
  const [assignments, setAssignments] = useState<OrderResponse[]>([]);
  const { loading, error, reload } = usePortalLoad(async () => {
    const nextAssignments = await getCourierAssignments(accessToken);
    setAssignments(nextAssignments.filter((assignment) => assignment.status === "DELIVERED" || assignment.status === "CANCELLED"));
  }, accessToken, "Courier history could not be loaded.");

  return (
    <PortalShell
      portalType="courier"
      email={user?.email ?? ""}
      title="History"
      subtitle="Completed delivery assignments."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <OrdersTable
        orders={assignments}
        emptyMessage="No completed deliveries yet."
        columns={["order", "merchant", "status", "amount", "created", "actions"]}
        renderActions={(order) => <DetailLink href={`/courier/assignments/${order.id}`} label="Details" />}
      />
    </PortalShell>
  );
}

export function CourierProfilePage() {
  return (
    <ProfilePage<CourierProfileResponse>
      portalType="courier"
      title="Profile"
      subtitle="Review your courier account and availability details."
      loadProfile={getCourierProfile}
      render={(profile) => (
        <DetailGrid
          fields={[
            ["Courier Name", profile.fullName],
            ["Email", profile.email],
            ["Phone", "Not available"],
            ["Role", "Courier"],
            ["Availability Status", formatStatusLabel(profile.status)],
            ["Vehicle / Plate", "Not available"],
            ["Current Location Status", "Not available"],
          ]}
        />
      )}
    />
  );
}

function OrderDetailPage({
  portalType,
  title,
  subtitle,
  loadOrder,
  backHref,
  actionRenderer,
}: {
  portalType: PortalKind;
  title: string;
  subtitle: string;
  loadOrder: (token: string | null) => Promise<OrderResponse | null>;
  backHref: string;
  actionRenderer: (order: OrderResponse) => React.ReactNode;
}) {
  const { accessToken, user } = useAuth();
  const [state, setState] = useState<LoadState<OrderResponse>>({ loading: true, error: null, data: null });
  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, data: await loadOrder(accessToken) });
    } catch (err) {
      const message = normalizeApiError(err, `${title} could not be loaded.`);
      setState({ loading: false, error: message, data: null });
      showErrorToast(message);
    }
  }, [accessToken, loadOrder, title]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const order = state.data;

  return (
    <PortalShell portalType={portalType} email={user?.email ?? ""} title={title} subtitle={subtitle}>
      <PageState loading={state.loading} error={state.error} onRetry={reload} />
      {!state.loading && !state.error && !order ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6">
          <EmptyState message="Order was not found for this portal." />
          <DetailLink href={backHref} label="Back to list" />
        </div>
      ) : null}
      {order ? (
        <div className="grid gap-5">
          <PortalSection
            title={formatDisplayId(order.id, portalType === "courier" ? "Assignment" : "Order")}
            description="Information shown here comes from the current portal order data."
            action={<DetailLink href={backHref} label="Back to list" />}
          >
            <DetailGrid
              fields={[
                ["Status", formatOrderStatus(order.status)],
                ["Merchant", order.merchantName ?? "Not available"],
                ["Courier", order.driverName ?? "Not available"],
                ["Total Amount", formatCurrencyTRY(order.totalAmount)],
                ["Created Time", formatDateTimeOrNA(order.createdAt)],
                ["Updated Time", "Not available"],
                ["Delivery Address", "Not available"],
                ["Notes", "Not available"],
              ]}
            />
          </PortalSection>
          <PortalSection title="Progress" description="Timeline is derived from the current order status.">
            <OrderProgress status={order.status} />
          </PortalSection>
          <PortalSection title="Status History" description="Chronological lifecycle events for this order.">
            <StatusHistory history={Array.isArray(order.history) ? order.history : []} />
          </PortalSection>
          {actionRenderer(order)}
        </div>
      ) : null}
    </PortalShell>
  );
}

function ProfilePage<TProfile extends { email: string; role: UserRole }>({
  portalType,
  title,
  subtitle,
  loadProfile,
  render,
}: {
  portalType: PortalKind;
  title: string;
  subtitle: string;
  loadProfile: (token: string | null) => Promise<TProfile>;
  render: (profile: TProfile) => React.ReactNode;
}) {
  const { accessToken, user } = useAuth();
  const [state, setState] = useState<LoadState<TProfile>>({ loading: true, error: null, data: null });
  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, data: await loadProfile(accessToken) });
    } catch (err) {
      const message = normalizeApiError(err, `${title} could not be loaded.`);
      setState({ loading: false, error: message, data: null });
      showErrorToast(message);
    }
  }, [accessToken, loadProfile, title]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return (
    <PortalShell
      portalType={portalType}
      email={state.data?.email ?? user?.email ?? ""}
      title={title}
      subtitle={subtitle}
    >
      <PageState loading={state.loading} error={state.error} onRetry={reload} />
      {state.data ? (
        <PortalSection
          title="Account Summary"
          description="Read-only details from the current account and portal profile."
          action={<DetailLink href={`/${portalType}/profile/change-password`} label="Change Password" />}
        >
          {render(state.data)}
        </PortalSection>
      ) : null}
    </PortalShell>
  );
}

function usePortalLoad(load: () => Promise<void>, accessToken: string | null, fallback: string) {
  const loadRef = useRef(load);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await loadRef.current();
    } catch (err) {
      const message = normalizeApiError(err, fallback);
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, fallback]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return { loading, error, reload };
}

function useMerchantOrderAction(
  accessToken: string | null,
  setActionOrderId: (orderId: string | null) => void,
  reload: () => void | Promise<void>,
) {
  return async (orderId: string, action: "preparing" | "ready-for-pickup") => {
    if (!accessToken) {
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
      await reload();
    } catch (err) {
      showErrorToast(normalizeApiError(err, "Order action failed."));
    } finally {
      setActionOrderId(null);
    }
  };
}

function useCancelOrderAction(
  accessToken: string | null,
  portalType: "customer" | "merchant",
  setActionOrderId: (orderId: string | null) => void,
  reload: () => void | Promise<void>,
) {
  return async (orderId: string, reason: string) => {
    if (!accessToken) {
      return;
    }

    setActionOrderId(orderId);
    try {
      if (portalType === "customer") {
        await cancelCustomerOrder(accessToken, orderId, reason);
      } else {
        await cancelMerchantOrder(accessToken, orderId, reason);
      }
      showSuccessToast("Order cancelled.");
      await reload();
    } catch (err) {
      showErrorToast(normalizeApiError(err, "Order cancellation failed."));
    } finally {
      setActionOrderId(null);
    }
  };
}

function useCourierOrderAction(
  accessToken: string | null,
  setActionOrderId: (orderId: string | null) => void,
  reload: () => void | Promise<void>,
) {
  return async (orderId: string, action: "picked-up" | "on-the-way" | "delivered") => {
    if (!accessToken) {
      return;
    }

    setActionOrderId(orderId);
    try {
      if (action === "picked-up") {
        await markCourierOrderPickedUp(accessToken, orderId);
        showSuccessToast("Order marked as picked up.");
      } else if (action === "on-the-way") {
        await markCourierOrderOnTheWay(accessToken, orderId);
        showSuccessToast("Order marked on the way.");
      } else {
        await markCourierOrderDelivered(accessToken, orderId);
        showSuccessToast("Order marked as delivered.");
      }
      await reload();
    } catch (err) {
      showErrorToast(normalizeApiError(err, "Assignment action failed."));
    } finally {
      setActionOrderId(null);
    }
  };
}

function PageState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="mb-5 grid gap-3">
        <ErrorState message={error} />
        <SecondaryButton className="w-fit" onClick={onRetry}>Retry</SecondaryButton>
      </div>
    );
  }

  return null;
}

function FilterTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: T[];
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            option === value
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {formatFilterLabel(option)}
        </button>
      ))}
    </div>
  );
}

function DetailGrid({ fields }: { fields: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value || "Not available"}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

function OrderProgress({ status }: { status: OrderStatus }) {
  const steps: OrderStatus[] = ["PLACED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY", "DELIVERED"];
  const currentIndex = steps.indexOf(status);

  if (status === "CANCELLED") {
    return <StatusBadge status="CANCELLED" label="Cancelled" />;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {steps.map((step, index) => (
        <div
          key={step}
          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            currentIndex >= index
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          {formatOrderStatus(step)}
        </div>
      ))}
    </div>
  );
}

function StatusHistory({ history }: { history: NonNullable<OrderResponse["history"]> }) {
  if (history.length === 0) {
    return <EmptyState message="Status history is not available yet." />;
  }

  return (
    <div className="grid gap-2">
      {history.map((item) => (
        <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={item.toStatus} label={formatOrderStatus(item.toStatus)} />
            <span className="text-xs text-slate-500">{formatDateTimeOrNA(item.createdAt)}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Actor: <span className="font-medium text-slate-700">{formatStatusLabel(item.actorType)}</span>
            {item.fromStatus ? (
              <span> from {formatOrderStatus(item.fromStatus)}</span>
            ) : null}
          </div>
          {item.reason ? (
            <p className="mt-2 rounded-md bg-white px-2 py-1 text-sm text-slate-700">{item.reason}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CancelOrderModal({
  order,
  loading,
  onClose,
  onSubmit,
}: {
  order: OrderResponse | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();
  const reasonValid = trimmedReason.length >= 5 && trimmedReason.length <= 500;

  useEffect(() => {
    if (order) {
      const timer = window.setTimeout(() => setReason(""), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [order]);

  if (!order) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Cancel order</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Provide a cancellation reason before cancelling {formatDisplayId(order.id, "Order")}.
          </p>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={loading}
            rows={4}
            maxLength={500}
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </label>
        <div className="mt-1 text-xs text-slate-500">{trimmedReason.length}/500 characters</div>
        <div className="mt-5 flex justify-end gap-2">
          <SecondaryButton type="button" disabled={loading} onClick={onClose}>
            Close
          </SecondaryButton>
          <Button
            type="button"
            disabled={loading || !reasonValid}
            onClick={() => void onSubmit(trimmedReason)}
          >
            {loading ? "Cancelling..." : "Cancel order"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function filterMerchantOrders(
  orders: OrderResponse[],
  filter: "new" | "preparing" | "ready" | "courier" | "completed" | "cancelled",
) {
  if (filter === "new") {
    return orders.filter((order) => order.status === "PLACED" || order.status === "DRIVER_ASSIGNED");
  }
  if (filter === "preparing") {
    return orders.filter((order) => order.status === "PREPARING");
  }
  if (filter === "ready") {
    return orders.filter((order) => order.status === "READY_FOR_PICKUP");
  }
  if (filter === "courier") {
    return orders.filter((order) => order.status === "PICKED_UP" || order.status === "ON_THE_WAY");
  }
  if (filter === "completed") {
    return orders.filter((order) => order.status === "DELIVERED");
  }
  return orders.filter((order) => order.status === "CANCELLED");
}

function computeAnalytics(orders: OrderResponse[]) {
  const revenueTotal = orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
  const statusCounts = orders.reduce<Record<string, number>>((counts, order) => {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
    return counts;
  }, {});

  return {
    totalOrders: orders.length,
    activeOrders: orders.filter((order) => activeCustomerStatuses.includes(order.status)).length,
    deliveredOrders: orders.filter((order) => order.status === "DELIVERED").length,
    revenueTotal,
    averageOrderValue: orders.length > 0 ? revenueTotal / orders.length : 0,
    statusDistribution: Object.entries(statusCounts),
  };
}

function formatFilterLabel(value: string) {
  const labels: Record<string, string> = {
    all: "All",
    active: "Active",
    delivered: "Delivered",
    cancelled: "Cancelled",
    new: "New",
    preparing: "Preparing",
    ready: "Ready for pickup",
    courier: "With courier",
    completed: "Completed",
  };
  return labels[value] ?? value;
}

function formatRole(role: UserRole) {
  return role === "DRIVER" ? "Courier" : formatStatusLabel(role);
}

function formatDateTimeOrNA(value?: string | null) {
  return value ? formatDateTime(value) : "Not available";
}

function formatCount(value?: number | null) {
  return new Intl.NumberFormat().format(Number(value ?? 0));
}

function formatLocation(latitude?: number | null, longitude?: number | null) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return "Not available";
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
