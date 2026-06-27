import Link from "next/link";
import { OrdersTable } from "@/components/portal/PortalDashboard";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import type { OrderResponse } from "@/types/api";

export function CourierAssignmentsTable({
  assignments,
  actionOrderId,
  onPickedUp,
  onDelivered,
  detailHrefFor,
}: {
  assignments: OrderResponse[];
  actionOrderId: string | null;
  onPickedUp: (orderId: string) => void;
  onDelivered: (orderId: string) => void;
  detailHrefFor?: (order: OrderResponse) => string;
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
          detailHref={detailHrefFor?.(order)}
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
  detailHref,
}: {
  order: OrderResponse;
  loading: boolean;
  disabled: boolean;
  onPickedUp: (orderId: string) => void;
  onDelivered: (orderId: string) => void;
  detailHref?: string;
}) {
  const action = renderCourierAction(order, loading, disabled, onPickedUp, onDelivered);

  return (
    <span className="flex flex-wrap items-center gap-2">
      {action}
      {detailHref ? (
        <Link className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline" href={detailHref}>
          Details
        </Link>
      ) : null}
    </span>
  );
}

function renderCourierAction(
  order: OrderResponse,
  loading: boolean,
  disabled: boolean,
  onPickedUp: (orderId: string) => void,
  onDelivered: (orderId: string) => void,
) {
  if (order.status === "READY_FOR_PICKUP" || order.status === "DRIVER_ASSIGNED") {
    return (
      <PortalActionButton
        label="Pick up order"
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
        label="Mark delivered"
        tone="success"
        loading={loading}
        disabled={disabled}
        onClick={() => onDelivered(order.id)}
      />
    );
  }

  return <span className="text-xs text-slate-400">{order.status === "DELIVERED" ? "Delivered" : "Status update unavailable"}</span>;
}
