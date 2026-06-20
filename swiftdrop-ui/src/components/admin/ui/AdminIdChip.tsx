import { formatDisplayId } from "@/lib/format";

export function AdminIdChip({ value, prefix = "Record" }: { value?: string; prefix?: string }) {
  return (
    <span className="inline-flex rounded border border-slate-100 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
      {formatDisplayId(value, prefix)}
    </span>
  );
}
