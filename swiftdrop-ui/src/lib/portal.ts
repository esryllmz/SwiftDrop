import { getJson, postJson } from "@/lib/api";
import type {
  CourierProfileResponse,
  CreateCustomerOrderRequest,
  CustomerMerchantOption,
  CustomerProfileResponse,
  DriverStatus,
  MerchantProfileResponse,
  OrderResponse,
} from "@/types/api";

export function getCustomerProfile(accessToken: string | null) {
  return getJson<CustomerProfileResponse>("/api/v1/customer/profile", undefined, accessToken);
}

export async function getCustomerOrders(accessToken: string | null) {
  return normalizeOrders(await getJson<unknown>("/api/v1/customer/orders", undefined, accessToken));
}

export async function getCustomerOrderDetail(accessToken: string | null, orderId: string) {
  return normalizeOrder(await getJson<unknown>(`/api/v1/customer/orders/${orderId}`, undefined, accessToken));
}

export async function getCustomerMerchants(accessToken: string | null) {
  return normalizeCustomerMerchants(await getJson<unknown>(
    "/api/v1/customer/merchants",
    undefined,
    accessToken,
  ));
}

export function createCustomerOrder(
  accessToken: string | null,
  request: CreateCustomerOrderRequest,
) {
  return postJson<OrderResponse>("/api/v1/customer/orders", request, undefined, accessToken);
}

export function cancelCustomerOrder(accessToken: string, orderId: string, reason: string) {
  return postJson<OrderResponse>(
    `/api/v1/customer/orders/${orderId}/cancel`,
    { reason },
    undefined,
    accessToken,
  );
}

export function getMerchantProfile(accessToken: string | null) {
  return getJson<MerchantProfileResponse>("/api/v1/merchant/profile", undefined, accessToken);
}

export async function getMerchantOrders(accessToken: string | null) {
  return normalizeOrders(await getJson<unknown>("/api/v1/merchant/orders", undefined, accessToken));
}

export async function getMerchantOrderDetail(accessToken: string | null, orderId: string) {
  return normalizeOrder(await getJson<unknown>(`/api/v1/merchant/orders/${orderId}`, undefined, accessToken));
}

export function markMerchantOrderPreparing(accessToken: string, orderId: string) {
  return postJson<OrderResponse>(
    `/api/v1/merchant/orders/${orderId}/preparing`,
    undefined,
    undefined,
    accessToken,
  );
}

export function markMerchantOrderReadyForPickup(accessToken: string, orderId: string) {
  return postJson<OrderResponse>(
    `/api/v1/merchant/orders/${orderId}/ready-for-pickup`,
    undefined,
    undefined,
    accessToken,
  );
}

export function cancelMerchantOrder(accessToken: string, orderId: string, reason: string) {
  return postJson<OrderResponse>(
    `/api/v1/merchant/orders/${orderId}/cancel`,
    { reason },
    undefined,
    accessToken,
  );
}

export function getCourierProfile(accessToken: string | null) {
  return getJson<CourierProfileResponse>("/api/v1/courier/profile", undefined, accessToken);
}

export async function getCourierAssignments(accessToken: string | null) {
  return normalizeOrders(await getJson<unknown>("/api/v1/courier/assignments", undefined, accessToken));
}

export async function getCourierAssignmentDetail(accessToken: string | null, orderId: string) {
  return normalizeOrder(await getJson<unknown>(`/api/v1/courier/assignments/${orderId}`, undefined, accessToken));
}

export function updateCourierAvailability(
  accessToken: string,
  status: Extract<DriverStatus, "AVAILABLE" | "OFFLINE">,
) {
  return postJson<CourierProfileResponse>(
    "/api/v1/courier/availability",
    { status },
    undefined,
    accessToken,
  );
}

export function markCourierOrderPickedUp(accessToken: string, orderId: string) {
  return postJson<OrderResponse>(
    `/api/v1/courier/orders/${orderId}/picked-up`,
    undefined,
    undefined,
    accessToken,
  );
}

export function markCourierOrderOnTheWay(accessToken: string, orderId: string) {
  return postJson<OrderResponse>(
    `/api/v1/courier/assignments/${orderId}/on-the-way`,
    undefined,
    undefined,
    accessToken,
  );
}

export function markCourierOrderDelivered(accessToken: string, orderId: string) {
  return postJson<OrderResponse>(
    `/api/v1/courier/orders/${orderId}/delivered`,
    undefined,
    undefined,
    accessToken,
  );
}

function normalizeOrders(value: unknown): OrderResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Partial<OrderResponse>;
    if (!record.id || !record.status) {
      return [];
    }

    const normalizedOrder = normalizeOrder(record);
    return normalizedOrder ? [normalizedOrder] : [];
  });
}

function normalizeOrder(value: unknown): OrderResponse | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<OrderResponse>;
  if (!record.id || !record.status) {
    return null;
  }

  return {
      ...record,
      id: String(record.id),
      customerId: record.customerId ? String(record.customerId) : "",
      merchantName: nullableString(record.merchantName),
      driverName: nullableString(record.driverName),
      status: record.status,
      totalAmount: Number(record.totalAmount ?? 0),
      createdAt: String(record.createdAt ?? ""),
      version: typeof record.version === "number" ? record.version : null,
      cancelledAt: nullableString(record.cancelledAt),
      cancelledByActorType: nullableString(record.cancelledByActorType),
      cancelledByActorId: nullableString(record.cancelledByActorId),
      cancellationReason: nullableString(record.cancellationReason),
      pickedUpAt: nullableString(record.pickedUpAt),
      onTheWayAt: nullableString(record.onTheWayAt),
      deliveredAt: nullableString(record.deliveredAt),
      history: Array.isArray(record.history) ? record.history.flatMap(normalizeHistory) : [],
    } as OrderResponse;
}

function normalizeCustomerMerchants(value: unknown): CustomerMerchantOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Partial<CustomerMerchantOption>;
    if (!record.id || !record.name) {
      return [];
    }

    return [{
      id: String(record.id),
      name: String(record.name),
      locationLabel: nullableString(record.locationLabel),
    }];
  });
}

function normalizeHistory(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as {
    id?: unknown;
    fromStatus?: unknown;
    toStatus?: unknown;
    actorType?: unknown;
    actorId?: unknown;
    reason?: unknown;
    createdAt?: unknown;
  };

  if (!record.toStatus || !record.actorType || !record.createdAt) {
    return [];
  }

  return [{
    id: record.id ? String(record.id) : `${record.toStatus}-${record.createdAt}`,
    fromStatus: typeof record.fromStatus === "string" ? record.fromStatus : null,
    toStatus: String(record.toStatus),
    actorType: String(record.actorType),
    actorId: nullableString(record.actorId),
    reason: nullableString(record.reason),
    createdAt: String(record.createdAt),
  }];
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
