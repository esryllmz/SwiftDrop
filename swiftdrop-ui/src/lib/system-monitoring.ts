export type HealthStatus = "UP" | "DOWN" | "DEGRADED" | "UNKNOWN";

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  details?: string | null;
  responseTimeMs?: number | null;
}

export interface InfrastructureHealth {
  name: string;
  status: HealthStatus;
  details?: string | null;
}

export interface SystemMonitoringResponse {
  overallStatus: HealthStatus;
  checkedAt: string | null;
  services: ServiceHealth[];
  infrastructure: InfrastructureHealth[];
}

export function normalizeSystemMonitoringResponse(
  value: unknown,
): SystemMonitoringResponse {
  if (Array.isArray(value)) {
    return buildResponse({ services: value });
  }

  if (!isRecord(value) || isErrorPayload(value)) {
    throw new Error("System health response has an invalid format.");
  }

  return buildResponse(value);
}

function buildResponse(value: Record<string, unknown>): SystemMonitoringResponse {
  const servicesSource = Array.isArray(value.services)
    ? value.services
    : Array.isArray(value.serviceHealth)
      ? value.serviceHealth
      : [];
  const infrastructureSource = Array.isArray(value.infrastructure)
    ? value.infrastructure
    : Array.isArray(value.infrastructureHealth)
      ? value.infrastructureHealth
      : [];

  const services = servicesSource
    .map(normalizeService)
    .filter((entry): entry is ServiceHealth => entry !== null);
  const infrastructure = infrastructureSource
    .map(normalizeInfrastructure)
    .filter((entry): entry is InfrastructureHealth => entry !== null);

  return {
    overallStatus: normalizeHealthStatus(
      value.overallStatus ?? value.status ?? deriveOverallStatus([...services, ...infrastructure]),
    ),
    checkedAt: normalizeDate(value.checkedAt ?? value.timestamp),
    services,
    infrastructure,
  };
}

export function formatHealthStatus(status?: string | null): string {
  const labels: Record<HealthStatus, string> = {
    UP: "Healthy",
    DOWN: "Unavailable",
    DEGRADED: "Degraded",
    UNKNOWN: "Unknown",
  };

  return labels[normalizeHealthStatus(status)];
}

export function normalizeHealthStatus(value: unknown): HealthStatus {
  const status = typeof value === "string" ? value.toUpperCase() : "UNKNOWN";
  return status === "UP" || status === "DOWN" || status === "DEGRADED"
    ? status
    : "UNKNOWN";
}

function normalizeService(value: unknown): ServiceHealth | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = normalizeName(value.name ?? value.service ?? value.serviceName);
  if (!name) {
    return null;
  }

  return {
    name,
    status: normalizeHealthStatus(value.status),
    details: normalizeDetails(value.details ?? value.error ?? value.url),
    responseTimeMs: normalizeNumber(value.responseTimeMs ?? value.responseTime),
  };
}

function normalizeInfrastructure(value: unknown): InfrastructureHealth | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = normalizeName(value.name ?? value.component ?? value.componentName);
  if (!name) {
    return null;
  }

  return {
    name,
    status: normalizeHealthStatus(value.status),
    details: normalizeDetails(value.details ?? value.error),
  };
}

function deriveOverallStatus(
  entries: Array<ServiceHealth | InfrastructureHealth>,
): HealthStatus {
  if (entries.length === 0) {
    return "UNKNOWN";
  }
  if (entries.some((entry) => entry.status === "DOWN")) {
    return "DOWN";
  }
  if (entries.some((entry) => entry.status === "DEGRADED" || entry.status === "UNKNOWN")) {
    return "DEGRADED";
  }
  return "UP";
}

function isErrorPayload(value: Record<string, unknown>) {
  const hasMonitoringData =
    Array.isArray(value.services)
    || Array.isArray(value.serviceHealth)
    || Array.isArray(value.infrastructure)
    || Array.isArray(value.infrastructureHealth);

  return (
    !hasMonitoringData
    && (
      typeof value.error === "string"
      || (typeof value.statusCode === "number" && value.statusCode >= 400)
      || (typeof value.message === "string" && !("overallStatus" in value) && !("checkedAt" in value))
    )
  );
}

function normalizeName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeDetails(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([, detail]) => ["string", "number", "boolean"].includes(typeof detail))
      .map(([key, detail]) => `${key}: ${String(detail)}`);
    return entries.length > 0 ? entries.join(", ") : null;
  }
  return null;
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return null;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
