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
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "PLACED") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  if (["PENDING", "PREPARING"].includes(normalized)) {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (normalized === "UNKNOWN") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (["FAILED", "DOWN"].includes(normalized)) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (normalized === "OFFLINE") {
    return "border-slate-600 bg-slate-800 text-slate-300";
  }

  if (["DRIVER_ASSIGNED", "ASSIGNED", "BUSY"].includes(normalized)) {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  if (normalized === "ON_THE_WAY") {
    return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
  }

  return "border-slate-700 bg-slate-800 text-slate-300";
}
