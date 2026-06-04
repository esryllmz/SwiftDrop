import { NextResponse } from "next/server";

const services = [
  {
    name: "Gateway",
    url: process.env.GATEWAY_HEALTH_URL || "http://localhost:8080/actuator/health",
  },
  {
    name: "Auth",
    url: process.env.AUTH_HEALTH_URL || "http://localhost:8081/actuator/health",
  },
  {
    name: "Logistics",
    url:
      process.env.LOGISTICS_HEALTH_URL ||
      "http://localhost:8082/actuator/health",
  },
  {
    name: "Notification",
    url:
      process.env.NOTIFICATION_HEALTH_URL ||
      "http://localhost:8083/actuator/health",
  },
];

type HealthServiceResult = {
  name: string;
  url: string;
  status: string;
  raw?: unknown;
  error?: string;
};

export async function GET() {
  const results = await Promise.all(services.map(checkService));

  return NextResponse.json({
    services: results,
  });
}

async function checkService({
  name,
  url,
}: {
  name: string;
  url: string;
}): Promise<HealthServiceResult> {
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
        url,
        status,
        raw,
        error: `Health endpoint returned ${response.status}`,
      };
    }

    return {
      name,
      url,
      status,
      raw,
    };
  } catch (err) {
    return {
      name,
      url,
      status: "DOWN",
      error: err instanceof Error ? err.message : "Health endpoint unreachable",
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
