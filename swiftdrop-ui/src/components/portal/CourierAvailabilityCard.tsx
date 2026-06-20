import { PortalActionButton } from "@/components/portal/PortalActionButton";
import { StatusBadge } from "@/components/ui";
import type { DriverStatus } from "@/types/api";

export function CourierAvailabilityCard({
  status,
  loading,
  onChange,
}: {
  status?: DriverStatus;
  loading: boolean;
  onChange: (status: Extract<DriverStatus, "AVAILABLE" | "OFFLINE">) => void;
}) {
  const action = getAvailabilityAction(status);

  return (
    <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="text-xs font-medium uppercase text-slate-500">Current availability</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {status ? <StatusBadge status={status} /> : <span className="text-sm text-slate-500">Unknown</span>}
          {status === "BUSY" ? (
            <span className="text-sm text-slate-500">You are busy with an active assignment.</span>
          ) : null}
        </div>
      </div>

      {action ? (
        <PortalActionButton
          label={action.label}
          tone={action.tone}
          loading={loading}
          onClick={() => onChange(action.status)}
        />
      ) : (
        <PortalActionButton
          label="Availability locked"
          tone="neutral"
          disabled
          onClick={() => undefined}
        />
      )}
    </div>
  );
}

function getAvailabilityAction(status?: DriverStatus) {
  if (status === "AVAILABLE") {
    return { label: "Go offline", status: "OFFLINE" as const, tone: "neutral" as const };
  }

  if (status === "OFFLINE") {
    return { label: "Go available", status: "AVAILABLE" as const, tone: "success" as const };
  }

  return null;
}
