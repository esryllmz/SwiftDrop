import { ApiError, postJson } from "./api";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type VehicleType = "MOTORBIKE" | "CAR" | "BICYCLE" | "WALKING";

export type MerchantApplicationRequest = {
  businessName: string;
  contactEmail: string;
  message?: string;
};

export type MerchantApplicationResponse = {
  id: string;
  businessName: string;
  contactEmail: string;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type CourierApplicationRequest = {
  fullName: string;
  contactEmail: string;
  vehicleType: VehicleType;
  message?: string;
};

export type CourierApplicationResponse = {
  id: string;
  fullName: string;
  contactEmail: string;
  vehicleType: VehicleType;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type ApplicationSubmitErrorKind = "duplicate" | "validation" | "network" | "unknown";

export class ApplicationSubmitError extends Error {
  kind: ApplicationSubmitErrorKind;

  constructor(kind: ApplicationSubmitErrorKind, message: string) {
    super(message);
    this.name = "ApplicationSubmitError";
    this.kind = kind;
  }
}

export function submitMerchantApplication(request: MerchantApplicationRequest) {
  return submitApplication<MerchantApplicationResponse>(
    "/api/v1/applications/merchant",
    request,
  );
}

export function submitCourierApplication(request: CourierApplicationRequest) {
  return submitApplication<CourierApplicationResponse>(
    "/api/v1/applications/courier",
    request,
  );
}

async function submitApplication<T>(path: string, body: unknown): Promise<T> {
  try {
    return await postJson<T>(path, body);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 409) {
        throw new ApplicationSubmitError(
          "duplicate",
          "There is already a pending or approved request for this email.",
        );
      }
      if (error.status === 400) {
        throw new ApplicationSubmitError("validation", "Please check the form fields.");
      }
      throw new ApplicationSubmitError("unknown", error.message);
    }

    throw new ApplicationSubmitError("network", "Application service is not reachable.");
  }
}
