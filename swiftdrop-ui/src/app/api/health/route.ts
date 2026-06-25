import { NextResponse } from "next/server";

const services = [
  {
    name: "API Gateway",
    url: process.env.GATEWAY_HEALTH_URL || "http://localhost:8080/actuator/health",
  },
  {
    name: "Auth Service",
    url: process.env.AUTH_HEALTH_URL || "http://localhost:8081/actuator/health",
  },
  {
    name: "Logistics Service",
    url:
      process.env.LOGISTICS_HEALTH_URL ||
      "http://localhost:8082/actuator/health",
  },
  {
    name: "Notification Service",
    url:
      process.env.NOTIFICATION_HEALTH_URL ||
      "http://localhost:8083/actuator/health",
  },
];

type HealthServiceResult = {
  name: string;
  status: string;
  details?: string | null;
  responseTimeMs?: number | null;
  components: InfrastructureResult[];
};

type InfrastructureResult = {
  name: string;
  status: string;
  details?: string | null;
};

export async function GET() {
  const results = await Promise.all(services.map(checkService));
  const infrastructure = mergeInfrastructure(results.flatMap((result) => result.components));

  return NextResponse.json({
    overallStatus: deriveOverallStatus(results),
    checkedAt: new Date().toISOString(),
    services: results.map((result) => ({
      name: result.name,
      status: result.status,
      details: result.details,
      responseTimeMs: result.responseTimeMs,
    })),
    infrastructure,
  });
}

async function checkService({
  name,
  url,
}: {
  name: string;
  url: string;
}): Promise<HealthServiceResult> {
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const text = await response.text();
    const raw = text ? safeJsonParse(text) : {};
    const status = extractStatus(raw, response.ok);

    if (!response.ok) {
      return {
        name,
        status,
        details: `Health endpoint returned ${response.status}`,
        responseTimeMs: elapsedMilliseconds(startedAt),
        components: extractInfrastructure(raw),
      };
    }

    return {
      name,
      status,
      details: null,
      responseTimeMs: elapsedMilliseconds(startedAt),
      components: extractInfrastructure(raw),
    };
  } catch (err) {
    return {
      name,
      status: "DOWN",
      details: err instanceof Error ? err.message : "Health endpoint unreachable",
      responseTimeMs: elapsedMilliseconds(startedAt),
      components: [],
    };
  }
}

function extractStatus(raw: unknown, ok: boolean) {
  if (raw && typeof raw === "object" && "status" in raw) {
    return String(raw.status);
  }

  return ok ? "UP" : "DOWN";
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractInfrastructure(raw: unknown): InfrastructureResult[] {
  if (!isRecord(raw) || !isRecord(raw.components)) {
    return [];
  }

  const displayNames: Record<string, string> = {
    db: "PostgreSQL",
    postgres: "PostgreSQL",
    postgresql: "PostgreSQL",
    redis: "Redis",
    kafka: "Kafka",
  };

  return Object.entries(raw.components)
    .filter(([key]) => key.toLowerCase() in displayNames)
    .map(([key, value]) => ({
      name: displayNames[key.toLowerCase()],
      status: isRecord(value) && typeof value.status === "string" ? value.status : "UNKNOWN",
      details: isRecord(value) ? summarizeDetails(value.details) : null,
    }));
}

function mergeInfrastructure(entries: InfrastructureResult[]) {
  const merged = new Map<string, InfrastructureResult>();
  for (const entry of entries) {
    const current = merged.get(entry.name);
    if (!current || healthSeverity(entry.status) > healthSeverity(current.status)) {
      merged.set(entry.name, entry);
    }
  }
  return Array.from(merged.values());
}

function deriveOverallStatus(results: HealthServiceResult[]) {
  if (results.some((result) => result.status.toUpperCase() === "DOWN")) {
    return "DOWN";
  }
  if (results.some((result) => !["UP"].includes(result.status.toUpperCase()))) {
    return "DEGRADED";
  }
  return "UP";
}

function healthSeverity(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "DOWN") return 3;
  if (normalized === "DEGRADED") return 2;
  if (normalized === "UNKNOWN") return 1;
  return 0;
}

function summarizeDetails(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value)
    .filter(([, detail]) => ["string", "number", "boolean"].includes(typeof detail))
    .map(([key, detail]) => `${key}: ${String(detail)}`);
  return entries.length > 0 ? entries.join(", ") : null;
}

function elapsedMilliseconds(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
