import { getJson, postJson } from "./api";
import type {
  ApplicationReviewRequest,
  ApplicationStatus,
  CourierApplicationReviewResponse,
  CourierApplicationResponse,
  MerchantApplicationReviewResponse,
  MerchantApplicationResponse,
} from "@/types/api";

export function getMerchantApplications(
  accessToken: string | null,
  status?: ApplicationStatus | "All",
) {
  return getJson<MerchantApplicationResponse[]>(
    `/api/v1/admin/applications/merchants${statusQuery(status)}`,
    undefined,
    accessToken,
  );
}

export function getCourierApplications(
  accessToken: string | null,
  status?: ApplicationStatus | "All",
) {
  return getJson<CourierApplicationResponse[]>(
    `/api/v1/admin/applications/couriers${statusQuery(status)}`,
    undefined,
    accessToken,
  );
}

export function approveMerchantApplication(
  accessToken: string | null,
  id: string,
  reviewNote?: string,
) {
  return postJson<MerchantApplicationReviewResponse>(
    `/api/v1/admin/applications/merchants/${id}/approve`,
    reviewBody(reviewNote),
    undefined,
    accessToken,
  );
}

export function rejectMerchantApplication(
  accessToken: string | null,
  id: string,
  reviewNote?: string,
) {
  return postJson<MerchantApplicationResponse>(
    `/api/v1/admin/applications/merchants/${id}/reject`,
    reviewBody(reviewNote),
    undefined,
    accessToken,
  );
}

export function approveCourierApplication(
  accessToken: string | null,
  id: string,
  reviewNote?: string,
) {
  return postJson<CourierApplicationReviewResponse>(
    `/api/v1/admin/applications/couriers/${id}/approve`,
    reviewBody(reviewNote),
    undefined,
    accessToken,
  );
}

export function rejectCourierApplication(
  accessToken: string | null,
  id: string,
  reviewNote?: string,
) {
  return postJson<CourierApplicationResponse>(
    `/api/v1/admin/applications/couriers/${id}/reject`,
    reviewBody(reviewNote),
    undefined,
    accessToken,
  );
}

function statusQuery(status?: ApplicationStatus | "All") {
  if (!status || status === "All") {
    return "";
  }

  return `?status=${encodeURIComponent(status)}`;
}

function reviewBody(reviewNote?: string): ApplicationReviewRequest {
  const note = reviewNote?.trim();
  return note ? { reviewNote: note } : {};
}
