export function UserIdentity({
  email,
  label = "Admin",
}: {
  email: string;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-3 text-xs text-slate-600">
      <span className="grid text-right">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        <span className="text-xs text-slate-400">{email}</span>
      </span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-[10px] font-semibold text-blue-600">
        {email.slice(0, 1).toUpperCase()}
      </span>
    </span>
  );
}
