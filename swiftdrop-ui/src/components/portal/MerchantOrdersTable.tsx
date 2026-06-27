import Link from "next/link";
import { OrdersTable } from "@/components/portal/PortalDashboard";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import type { OrderResponse } from "@/types/api";

export function MerchantOrdersTable({
  orders,
  actionOrderId,
  onPreparing,
  onReadyForPickup,
  onCancel,
  detailHrefFor,
}: {
  orders: OrderResponse[];
  actionOrderId: string | null;
  onPreparing: (orderId: string) => void;
  onReadyForPickup: (orderId: string) => void;
  onCancel?: (order: OrderResponse) => void;
  detailHrefFor?: (order: OrderResponse) => string;
}) {
  return (
    <OrdersTable
      orders={orders}
      emptyMessage="No merchant orders found."
      columns={["order", "customer", "driver", "status", "amount", "created", "actions"]}
      renderActions={(order) => (
        <MerchantOrderAction
          order={order}
          loading={actionOrderId === order.id}
          disabled={Boolean(actionOrderId && actionOrderId !== order.id)}
          onPreparing={onPreparing}
          onReadyForPickup={onReadyForPickup}
          onCancel={onCancel}
          detailHref={detailHrefFor?.(order)}
        />
      )}
    />
  );
}

function MerchantOrderAction({
  order,
  loading,
  disabled,
  onPreparing,
  onReadyForPickup,
  onCancel,
  detailHref,
}: {
  order: OrderResponse;
  loading: boolean;
  disabled: boolean;
  onPreparing: (orderId: string) => void;
  onReadyForPickup: (orderId: string) => void;
  onCancel?: (order: OrderResponse) => void;
  detailHref?: string;
}) {
  const action = renderMerchantAction(order, loading, disabled, onPreparing, onReadyForPickup);
  const canCancel = ["PLACED", "DRIVER_ASSIGNED", "PREPARING"].includes(order.status);

  return (
    <span className="flex flex-wrap items-center gap-2">
      {action}
      {canCancel && onCancel ? (
        <PortalActionButton
          label="Cancel order"
          tone="warning"
          loading={loading}
          disabled={disabled}
          onClick={() => onCancel(order)}
        />
      ) : null}
      {detailHref ? (
        <Link className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline" href={detailHref}>
          Details
        </Link>
      ) : null}
    </span>
  );
}

function renderMerchantAction(
  order: OrderResponse,
  loading: boolean,
  disabled: boolean,
  onPreparing: (orderId: string) => void,
  onReadyForPickup: (orderId: string) => void,
) {
  if (order.status === "PLACED" || order.status === "DRIVER_ASSIGNED") {
    return (
      <PortalActionButton
        label="Start preparing"
        tone="warning"
        loading={loading}
        disabled={disabled}
        onClick={() => onPreparing(order.id)}
      />
    );
  }

  if (order.status === "PREPARING") {
    return (
      <PortalActionButton
        label="Mark ready for pickup"
        tone="primary"
        loading={loading}
        disabled={disabled}
        onClick={() => onReadyForPickup(order.id)}
      />
    );
  }

  return (
    <span className="text-xs text-slate-400">
      {order.status === "READY_FOR_PICKUP"
        ? "Waiting for courier pickup"
        : formatMerchantTerminalMessage(order.status)}
    </span>
  );
}

function formatMerchantTerminalMessage(status: string) {
  if (status === "PICKED_UP" || status === "ON_THE_WAY") {
    return "With courier";
  }
  if (status === "DELIVERED") {
    return "Completed";
  }
  if (status === "CANCELLED") {
    return "Cancelled";
  }
  return "Status update unavailable";
}
