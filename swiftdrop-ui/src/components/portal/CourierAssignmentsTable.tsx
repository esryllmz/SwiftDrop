import Link from "next/link";
import { OrdersTable } from "@/components/portal/PortalDashboard";
import { PortalActionButton } from "@/components/portal/PortalActionButton";
import type { PortalThemeKey } from "@/lib/portal-theme";
import type { OrderResponse } from "@/types/api";

export function CourierAssignmentsTable({
  assignments,
  actionOrderId,
  onPickedUp,
  onOnTheWay,
  onDelivered,
  detailHrefFor,
  theme = "courier",
}: {
  assignments: OrderResponse[];
  actionOrderId: string | null;
  onPickedUp: (orderId: string) => void;
  onOnTheWay: (orderId: string) => void;
  onDelivered: (orderId: string) => void;
  detailHrefFor?: (order: OrderResponse) => string;
  theme?: PortalThemeKey;
}) {
  return (
    <OrdersTable
      orders={assignments}
      emptyMessage="No active assignments assigned to this courier yet. New dispatch work will appear here when it is ready."
      theme={theme}
      columns={["order", "merchant", "status", "amount", "created", "actions"]}
      renderActions={(order) => (
        <CourierAssignmentAction
          order={order}
          loading={actionOrderId === order.id}
          disabled={Boolean(actionOrderId && actionOrderId !== order.id)}
          onPickedUp={onPickedUp}
          onOnTheWay={onOnTheWay}
          onDelivered={onDelivered}
          detailHref={detailHrefFor?.(order)}
          theme={theme}
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
  onOnTheWay,
  onDelivered,
  detailHref,
  theme,
}: {
  order: OrderResponse;
  loading: boolean;
  disabled: boolean;
  onPickedUp: (orderId: string) => void;
  onOnTheWay: (orderId: string) => void;
  onDelivered: (orderId: string) => void;
  detailHref?: string;
  theme: PortalThemeKey;
}) {
  const action = renderCourierAction(order, loading, disabled, onPickedUp, onOnTheWay, onDelivered, theme);

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
  onOnTheWay: (orderId: string) => void,
  onDelivered: (orderId: string) => void,
  theme: PortalThemeKey,
) {
  if (order.status === "READY_FOR_PICKUP") {
    return (
      <PortalActionButton
        label="Pick up order"
        tone="primary"
        theme={theme}
        loading={loading}
        disabled={disabled}
        onClick={() => onPickedUp(order.id)}
      />
    );
  }

  if (order.status === "PICKED_UP") {
    return (
      <PortalActionButton
        label="Mark on the way"
        tone="primary"
        theme={theme}
        loading={loading}
        disabled={disabled}
        onClick={() => onOnTheWay(order.id)}
      />
    );
  }

  if (order.status === "ON_THE_WAY") {
    return (
      <PortalActionButton
        label="Mark delivered"
        tone="primary"
        theme={theme}
        loading={loading}
        disabled={disabled}
        onClick={() => onDelivered(order.id)}
      />
    );
  }

  return <span className="text-xs text-slate-400">{order.status === "DELIVERED" ? "Delivered" : "Status update unavailable"}</span>;
}
