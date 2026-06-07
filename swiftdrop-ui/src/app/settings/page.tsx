"use client";

import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

const settings = [
  { label: "API Gateway URL", value: "http://localhost:8080" },
  { label: "Kafka UI URL", value: "http://localhost:8090" },
  { label: "Frontend Origin", value: "http://localhost:3001" },
  { label: "Environment", value: "Docker Local" },
  { label: "OneSignal Mode", value: "Mock" },
  { label: "Theme Preference", value: "Light" },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Local demo configuration."
        action={<StatusBadge status="ENV_MANAGED" />}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <h3 className="text-lg font-semibold text-slate-950">
            Runtime Configuration
          </h3>
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <tbody className="divide-y divide-slate-200 bg-white">
                {settings.map((item) => (
                  <tr key={item.label}>
                    <th className="w-56 bg-slate-50 px-3 py-3 text-left font-medium text-slate-600">
                      {item.label}
                    </th>
                    <td className="px-3 py-3 font-medium text-slate-950">
                      {item.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-950">
            Configuration
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Settings are managed by environment variables and Docker Compose for
            the local demo stack.
          </p>
          <div className="mt-4">
            <EmptyState message="Configuration is environment-managed." />
          </div>
        </Card>
      </div>
    </div>
  );
}
