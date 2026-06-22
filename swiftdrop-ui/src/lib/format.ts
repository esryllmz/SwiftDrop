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
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "PLACED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (["PENDING", "PREPARING"].includes(normalized)) {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (normalized === "READY_FOR_PICKUP") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "UNKNOWN") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["FAILED", "DOWN", "REJECTED"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "OFFLINE") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  if (["DRIVER_ASSIGNED", "ASSIGNED", "BUSY"].includes(normalized)) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (["PICKED_UP", "ON_THE_WAY"].includes(normalized)) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function formatStatusLabel(status?: string) {
  return (status || "UNKNOWN")
    .toLowerCase()
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
