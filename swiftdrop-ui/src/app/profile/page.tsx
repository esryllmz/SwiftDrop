"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

const adminAccess = [
  { href: "/event-stream", label: "Event Stream" },
  { href: "/system-monitoring", label: "System Monitoring" },
  { href: "/users-approvals", label: "Users & Approvals" },
];

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Account and access details."
        action={user ? <StatusBadge status={user.role} /> : undefined}
      />

      {!user ? <EmptyState message="No authenticated user context is available." /> : null}

      {user ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <h3 className="text-lg font-semibold text-slate-950">
              Account Details
            </h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Role" value={user.role} />
              <DetailRow label="User ID" value={user.userId} />
              <DetailRow label="Enabled" value={user.enabled ? "Yes" : "No"} />
              <DetailRow
                label="Account Status"
                value={user.enabled ? "Active" : "Disabled"}
              />
            </dl>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-slate-950">
              System Access
            </h3>
            {user.role === "ADMIN" ? (
              <div className="mt-4 grid gap-2">
                {adminAccess.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState message="No admin console access is assigned." />
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="break-all text-slate-900">{value}</dd>
    </div>
  );
}
