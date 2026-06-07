"use client";

import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default function UsersApprovalsPage() {
  return (
    <div>
      <PageHeader
        title="Users & Approvals"
        description="Merchant and courier access workflow."
        action={<StatusBadge status="ADMIN_ONLY" />}
      />

      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        Public registration creates CUSTOMER accounts only. Merchant and courier
        access requires admin approval. Backend approval endpoints are planned.
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-slate-950">
            Pending Merchant Applications
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Store operators will appear here after the onboarding API is connected.
          </p>
          <div className="mt-4">
            <EmptyState message="No pending merchant applications." />
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-950">
            Pending Courier Applications
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Driver applicants will appear here after the approval workflow is available.
          </p>
          <div className="mt-4">
            <EmptyState message="No pending courier applications." />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="text-lg font-semibold text-slate-950">Active Users</h3>
        <p className="mt-2 text-sm text-slate-600">
          User management remains read-only in this demo console until admin user
          listing endpoints are added.
        </p>
        <div className="mt-4">
          <EmptyState message="No user directory endpoint is connected yet." />
        </div>
      </Card>
    </div>
  );
}
