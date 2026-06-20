import { getJson, postJson } from "@/lib/api";
import type {
  CourierProfileResponse,
  CreateCustomerOrderRequest,
  CustomerProfileResponse,
  DriverStatus,
  MerchantProfileResponse,
  OrderResponse,
} from "@/types/api";

export function getCustomerProfile(accessToken: string | null) {
  return getJson<CustomerProfileResponse>("/api/v1/customer/profile", undefined, accessToken);
}

export function getCustomerOrders(accessToken: string | null) {
  return getJson<OrderResponse[]>("/api/v1/customer/orders", undefined, accessToken);
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

export function getMerchantOrders(accessToken: string | null) {
  return getJson<OrderResponse[]>("/api/v1/merchant/orders", undefined, accessToken);
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

export function getCourierAssignments(accessToken: string | null) {
  return getJson<OrderResponse[]>("/api/v1/courier/assignments", undefined, accessToken);
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
