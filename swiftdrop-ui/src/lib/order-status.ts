const orderStatusLabels: Record<string, string> = {
  PLACED: "Order placed",
  DRIVER_ASSIGNED: "Courier assigned",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  PICKED_UP: "Picked up",
  ON_THE_WAY: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function formatOrderStatus(status?: string | null): string {
  if (!status) {
    return "Unknown status";
  }

  return orderStatusLabels[status.toUpperCase()] ?? "Unknown status";
}

export function isOrderStatus(status?: string | null): boolean {
  return Boolean(status && status.toUpperCase() in orderStatusLabels);
}
