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
  return findOrderById(await getCustomerOrders(accessToken), orderId);
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

export function getMerchantProfile(accessToken: string | null) {
  return getJson<MerchantProfileResponse>("/api/v1/merchant/profile", undefined, accessToken);
}

export async function getMerchantOrders(accessToken: string | null) {
  return normalizeOrders(await getJson<unknown>("/api/v1/merchant/orders", undefined, accessToken));
}

export async function getMerchantOrderDetail(accessToken: string | null, orderId: string) {
  return findOrderById(await getMerchantOrders(accessToken), orderId);
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

export function getCourierProfile(accessToken: string | null) {
  return getJson<CourierProfileResponse>("/api/v1/courier/profile", undefined, accessToken);
}

export async function getCourierAssignments(accessToken: string | null) {
  return normalizeOrders(await getJson<unknown>("/api/v1/courier/assignments", undefined, accessToken));
}

export async function getCourierAssignmentDetail(accessToken: string | null, orderId: string) {
  return findOrderById(await getCourierAssignments(accessToken), orderId);
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

    return [{
      ...record,
      id: String(record.id),
      customerId: record.customerId ? String(record.customerId) : "",
      merchantName: nullableString(record.merchantName),
      driverName: nullableString(record.driverName),
      status: record.status,
      totalAmount: Number(record.totalAmount ?? 0),
      createdAt: String(record.createdAt ?? ""),
    } as OrderResponse];
  });
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

function findOrderById(orders: OrderResponse[], orderId: string) {
  return orders.find((order) => order.id === orderId) ?? null;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
