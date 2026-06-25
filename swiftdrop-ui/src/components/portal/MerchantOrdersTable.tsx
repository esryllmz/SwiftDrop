import { OrdersTable } from "@/components/portal/PortalDashboard";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import type { OrderResponse } from "@/types/api";

export function MerchantOrdersTable({
  orders,
  actionOrderId,
  onPreparing,
  onReadyForPickup,
}: {
  orders: OrderResponse[];
  actionOrderId: string | null;
  onPreparing: (orderId: string) => void;
  onReadyForPickup: (orderId: string) => void;
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
}: {
  order: OrderResponse;
  loading: boolean;
  disabled: boolean;
  onPreparing: (orderId: string) => void;
  onReadyForPickup: (orderId: string) => void;
}) {
  if (order.status === "PLACED" || order.status === "DRIVER_ASSIGNED") {
    return (
      <PortalActionButton
        label="Mark preparing"
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
        label="Ready for pickup"
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
        : "No action is available for this status"}
    </span>
  );
}
