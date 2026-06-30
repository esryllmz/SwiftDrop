import { NextResponse } from "next/server";

const gatewayHealthUrl =
  process.env.GATEWAY_HEALTH_URL ||
  `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/health`;

export async function GET() {
  const startedAt = performance.now();

  try {
    const response = await fetch(gatewayHealthUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const text = await response.text();
    const raw = text ? safeJsonParse(text) : {};
    const status = extractStatus(raw, response.ok);

    return NextResponse.json({
      overallStatus: status,
      checkedAt: new Date().toISOString(),
      services: [
        {
          key: "gateway",
          name: "API Gateway",
          status,
          details: response.ok ? null : `Gateway health returned ${response.status}`,
          responseTimeMs: elapsedMilliseconds(startedAt),
        },
      ],
      infrastructure: [],
    });
  } catch (err) {
    return NextResponse.json({
      overallStatus: "DOWN",
      checkedAt: new Date().toISOString(),
      services: [
        {
          key: "gateway",
          name: "API Gateway",
          status: "DOWN",
          details: err instanceof Error ? err.message : "Gateway health endpoint unreachable",
          responseTimeMs: elapsedMilliseconds(startedAt),
        },
      ],
      infrastructure: [],
    });
  }
}

function extractStatus(raw: unknown, ok: boolean) {
  if (raw && typeof raw === "object" && "status" in raw) {
    return String(raw.status).toUpperCase();
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

function elapsedMilliseconds(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}
