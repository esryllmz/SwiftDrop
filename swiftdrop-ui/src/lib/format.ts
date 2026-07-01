export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
}

export function formatCurrencyTRY(value?: number | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatMoney(value: number) {
  return formatCurrencyTRY(value);
}

export function isUuidLike(value?: string | null) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function maskTechnicalId(id?: string | null) {
  if (!id) {
    return "-";
  }

  if (id.length <= 12) {
    return id;
  }

  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

export function formatDisplayId(id?: string | null, prefix = "Record") {
  if (!id) {
    return `${prefix} #----`;
  }

  const compact = id.replace(/-/g, "");
  const suffix = compact.slice(-4).toUpperCase();
  return `${prefix} #${suffix || "----"}`;
}

export function statusBadgeClass(status?: string) {
  const normalized = status?.toUpperCase() ?? "";

  if (["UP", "SENT", "AVAILABLE", "DELIVERED", "APPROVED"].includes(normalized)) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  if (normalized === "PLACED") {
    return "border-orange-300 bg-orange-100 text-orange-800";
  }

  if (["PENDING", "PREPARING", "DEGRADED", "UNKNOWN"].includes(normalized)) {
    return "border-amber-300 bg-amber-100 text-amber-800";
  }

  if (normalized === "READY_FOR_PICKUP") {
    return "border-yellow-300 bg-yellow-100 text-yellow-800";
  }

  if (["FAILED", "DOWN", "REJECTED"].includes(normalized)) {
    return "border-red-300 bg-red-100 text-red-800";
  }

  if (normalized === "OFFLINE") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  if (["DRIVER_ASSIGNED", "ASSIGNED", "BUSY"].includes(normalized)) {
    return "border-indigo-300 bg-indigo-100 text-indigo-800";
  }

  if (["PICKED_UP", "ON_THE_WAY"].includes(normalized)) {
    return "border-cyan-300 bg-cyan-100 text-cyan-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function formatStatusLabel(status?: string) {
  if (isOrderStatus(status)) {
    return formatOrderStatus(status);
  }

  if (["UP", "DOWN", "DEGRADED", "UNKNOWN"].includes(status?.toUpperCase() ?? "UNKNOWN")) {
    return formatHealthStatus(status);
  }

  if (status?.toUpperCase() === "DRIVER") {
    return "Courier";
  }

  return (status || "UNKNOWN")
    .toLowerCase()
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
import { formatOrderStatus, isOrderStatus } from "@/lib/order-status";
import { formatHealthStatus } from "@/lib/system-monitoring";
