export function AdminIdChip({ value }: { value?: string }) {
  return (
    <span className="inline-flex rounded border border-slate-100 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-500">
      {value || "-"}
    </span>
  );
}
