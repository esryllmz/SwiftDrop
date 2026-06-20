import { statusBadgeClass } from "@/lib/format";

export function AdminStatusBadge({ status }: { status?: string }) {
  const normalized = status || "UNKNOWN";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-current/10 px-2.5 py-1 text-xs font-medium ${statusBadgeClass(status)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
      {formatStatusLabel(normalized)}
    </span>
  );
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusDotClass(status?: string) {
  const normalized = status?.toUpperCase() ?? "";

  if (["UP", "SENT", "AVAILABLE", "DELIVERED", "APPROVED"].includes(normalized)) {
    return "bg-emerald-500";
  }
  if (["PLACED"].includes(normalized)) {
    return "bg-blue-500";
  }
  if (["PENDING", "PREPARING"].includes(normalized)) {
    return "bg-amber-500";
  }
  if (["FAILED", "DOWN", "REJECTED"].includes(normalized)) {
    return "bg-red-500";
  }
  if (["DRIVER_ASSIGNED", "ASSIGNED", "BUSY"].includes(normalized)) {
    return "bg-violet-500";
  }
  if (normalized === "ON_THE_WAY") {
    return "bg-sky-500";
  }
  return "bg-slate-400";
}
