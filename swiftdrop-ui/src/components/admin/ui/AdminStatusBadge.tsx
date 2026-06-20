import { statusBadgeClass } from "@/lib/format";

export function AdminStatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}
    >
      {status || "UNKNOWN"}
    </span>
  );
}
