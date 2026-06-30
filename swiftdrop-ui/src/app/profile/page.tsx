"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState } from "@/components/ui";
import {
  AdvancedDetails,
  DetailField,
  DetailGrid,
} from "@/components/admin/modal";
import {
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/ui";
import { maskTechnicalId } from "@/lib/format";

const adminAccess = [
  { href: "/event-stream", label: "Event Stream" },
  { href: "/system-monitoring", label: "System Monitoring" },
  { href: "/users-approvals", label: "Users & Approvals" },
];

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl p-6 space-y-5">
      <AdminPageHeader
        icon="PR"
        title="Profile"
        description="Account and access details."
        action={
          user ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/profile/change-password"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Change Password
              </Link>
              <AdminStatusBadge status={user.role} />
            </div>
          ) : undefined
        }
      />

      {!user ? <EmptyState message="No authenticated user context is available." /> : null}

      {user ? (
        <div className="grid gap-5">
          <AdminSectionCard title="Account Details">
            <div className="mb-6 flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-100 bg-blue-50 text-lg font-semibold text-blue-600">
                {user.email.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{user.email}</div>
                <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {user.role}
                </div>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Role" value={user.role} />
              <DetailRow label="Enabled" value={user.enabled ? "Yes" : "No"} />
              <DetailRow
                label="Account Status"
                value={user.enabled ? "Active" : "Disabled"}
              />
              <DetailRow
                label="Password Change Required"
                value={user.passwordChangeRequired ? "Yes" : "No"}
              />
            </dl>
            {user.role === "ADMIN" ? (
              <div className="mt-4">
                <AdvancedDetails title="Advanced details">
                  <DetailGrid>
                    <DetailField label="User ID" value={maskTechnicalId(user.userId)} mono />
                  </DetailGrid>
                </AdvancedDetails>
              </div>
            ) : null}
          </AdminSectionCard>

          <AdminSectionCard title="System Access">
            {user.role === "ADMIN" ? (
              <div className="mt-4 grid gap-2">
                {adminAccess.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState message="No admin console access is assigned." />
            )}
          </AdminSectionCard>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="break-all text-slate-900">{value}</dd>
    </div>
  );
}
