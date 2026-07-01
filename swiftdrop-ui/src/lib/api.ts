export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type ApiFetchOptions = RequestInit & {
  baseUrl?: string;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function normalizeApiError(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof ApiError) {
    if (isSafeBackendMessage(error.message)) {
      return error.message;
    }

    if (error.status === 400) {
      return "Validation failed.";
    }
    if (error.status === 401) {
      return "Please sign in again.";
    }
    if (error.status === 403) {
      return "You are not authorized.";
    }
    if (error.status === 409) {
      return "This action conflicts with the current state.";
    }
    if (error.status >= 500) {
      return "Something went wrong.";
    }
  }

  if (error instanceof Error && error.message.toLowerCase().includes("failed to fetch")) {
    return "Service is unavailable. Please try again later.";
  }

  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
  accessToken?: string | null,
): Promise<T> {
  const { baseUrl = API_BASE_URL, headers, ...init } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export function getJson<T>(
  path: string,
  options?: ApiFetchOptions,
  accessToken?: string | null,
) {
  return apiFetch<T>(path, { ...options, method: "GET" }, accessToken);
}

export function postJson<T>(
  path: string,
  body?: unknown,
  options?: ApiFetchOptions,
  accessToken?: string | null,
) {
  return apiFetch<T>(path, {
    ...options,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  }, accessToken);
}

export function putJson<T>(
  path: string,
  body?: unknown,
  options?: ApiFetchOptions,
  accessToken?: string | null,
) {
  return apiFetch<T>(path, {
    ...options,
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  }, accessToken);
}

export function patchJson<T>(
  path: string,
  body?: unknown,
  options?: ApiFetchOptions,
  accessToken?: string | null,
) {
  return apiFetch<T>(path, {
    ...options,
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  }, accessToken);
}

export function deleteJson<T>(
  path: string,
  options?: ApiFetchOptions,
  accessToken?: string | null,
) {
  return apiFetch<T>(path, { ...options, method: "DELETE" }, accessToken);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isSafeBackendMessage(message: string) {
  const lower = message.toLowerCase();
  return Boolean(message)
    && !lower.includes("exception")
    && !lower.includes("stack")
    && !lower.includes("trace")
    && !lower.includes("org.")
    && !lower.includes("java.");
}
