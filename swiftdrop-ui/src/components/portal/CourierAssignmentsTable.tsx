import { OrdersTable } from "@/components/portal/PortalDashboard";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import type { OrderResponse } from "@/types/api";

export function CourierAssignmentsTable({
  assignments,
  actionOrderId,
  onPickedUp,
  onDelivered,
}: {
  assignments: OrderResponse[];
  actionOrderId: string | null;
  onPickedUp: (orderId: string) => void;
  onDelivered: (orderId: string) => void;
}) {
  return (
    <OrdersTable
      orders={assignments}
      emptyMessage="No courier assignments found."
      columns={["order", "merchant", "status", "amount", "created", "actions"]}
      renderActions={(order) => (
        <CourierAssignmentAction
          order={order}
          loading={actionOrderId === order.id}
          disabled={Boolean(actionOrderId && actionOrderId !== order.id)}
          onPickedUp={onPickedUp}
          onDelivered={onDelivered}
        />
      )}
    />
  );
}

function CourierAssignmentAction({
  order,
  loading,
  disabled,
  onPickedUp,
  onDelivered,
}: {
  order: OrderResponse;
  loading: boolean;
  disabled: boolean;
  onPickedUp: (orderId: string) => void;
  onDelivered: (orderId: string) => void;
}) {
  if (order.status === "READY_FOR_PICKUP" || order.status === "DRIVER_ASSIGNED") {
    return (
      <PortalActionButton
        label="Picked up"
        tone="primary"
        loading={loading}
        disabled={disabled}
        onClick={() => onPickedUp(order.id)}
      />
    );
  }

  if (order.status === "PICKED_UP" || order.status === "ON_THE_WAY") {
    return (
      <PortalActionButton
        label="Delivered"
        tone="success"
        loading={loading}
        disabled={disabled}
        onClick={() => onDelivered(order.id)}
      />
    );
  }

  return <span className="text-xs text-slate-400">No action is available for this status</span>;
}
