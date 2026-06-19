import { getJson, postJson } from "@/lib/api";
import type {
  CourierProfileResponse,
  CreateCustomerOrderRequest,
  CustomerProfileResponse,
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

export function getCourierProfile(accessToken: string | null) {
  return getJson<CourierProfileResponse>("/api/v1/courier/profile", undefined, accessToken);
}

export function getCourierAssignments(accessToken: string | null) {
  return getJson<OrderResponse[]>("/api/v1/courier/assignments", undefined, accessToken);
}
