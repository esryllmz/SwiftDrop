"use client";

import { EmptyState } from "@/components/ui";
import {
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/ui";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-5">
      <AdminPageHeader
        icon="ST"
        title="Settings"
        description="Environment-managed configuration."
        action={<AdminStatusBadge status="ENV_MANAGED" />}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {settingsGroups.map((group) => (
          <AdminSectionCard key={group.title} title={group.title}>
            <div className="space-y-4">
              {group.items.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 text-xs font-medium text-slate-500">{item.label}</div>
                  <div className={`rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 ${item.mono ? "font-mono" : "font-medium"}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </AdminSectionCard>
        ))}

        <AdminSectionCard title="Configuration">
          <p className="text-sm leading-6 text-slate-600">
            Settings are managed by environment variables for the local demo stack.
          </p>
          <div className="mt-4">
            <EmptyState message="Configuration is read-only in this console." />
          </div>
        </AdminSectionCard>
      </div>
    </div>
  );
}

type SettingsItem = {
  label: string;
  value: string;
  mono?: boolean;
};

const settingsGroups: Array<{ title: string; items: SettingsItem[] }> = [
  {
    title: "Connections",
    items: [
      { label: "Gateway URL", value: "http://localhost:8080", mono: true },
      { label: "Kafka Console URL", value: "http://localhost:8090", mono: true },
      { label: "Frontend Origin", value: "http://localhost:3001", mono: true },
    ],
  },
  {
    title: "Environment",
    items: [
      { label: "Environment", value: "Local demo stack" },
      { label: "Theme Preference", value: "Light" },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { label: "Health refresh", value: "Manual refresh" },
    ],
  },
  {
    title: "Notifications",
    items: [
      { label: "OneSignal Mode", value: "Mock" },
      { label: "Failed event alerts", value: "Environment managed" },
    ],
  },
];
