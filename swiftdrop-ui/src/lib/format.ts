export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function prettyJson(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  return JSON.stringify(value, null, 2);
}

export function statusBadgeClass(status?: string) {
  const normalized = status?.toUpperCase() ?? "";

  if (["UP", "SENT", "AVAILABLE", "DELIVERED"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "PLACED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (["PENDING", "PREPARING"].includes(normalized)) {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (normalized === "UNKNOWN") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["FAILED", "DOWN"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "OFFLINE") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  if (["DRIVER_ASSIGNED", "ASSIGNED", "BUSY"].includes(normalized)) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (normalized === "ON_THE_WAY") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}
