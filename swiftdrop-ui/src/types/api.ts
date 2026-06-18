export type UserRole = "CUSTOMER" | "MERCHANT" | "DRIVER" | "ADMIN";

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  userId: string;
  email: string;
  role: UserRole;
};

export type CurrentUserResponse = {
  userId: string;
  email: string;
  role: UserRole;
  enabled: boolean;
};

export type DashboardSummaryResponse = {
  totalOrders: number;
  placedOrders: number;
  assignedOrders: number;
  deliveredOrders: number;
  availableDrivers: number;
  busyDrivers: number;
  offlineDrivers: number;
  totalMerchants: number;
  pendingOutboxEvents: number;
  sentOutboxEvents: number;
  failedOutboxEvents: number;
};

export type OrderResponse = {
  id: string;
  customerId: string;
  merchantId?: string;
  merchantName?: string;
  driverId?: string;
  driverName?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
};

export type DriverResponse = {
  id: string;
  userId: string;
  fullName: string;
  status: string;
};

export type MerchantResponse = {
  id: string;
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type OutboxEventResponse = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  topic: string;
  eventKey: string;
  payload: string;
  status: string;
  retryCount: number;
  lastError?: string | null;
  createdAt: string;
  sentAt?: string | null;
  correlationId?: string | null;
  version: number;
};

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type VehicleType = "MOTORBIKE" | "CAR" | "BICYCLE" | "WALKING";

export type MerchantApplicationResponse = {
  id: string;
  businessName: string;
  contactEmail: string;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  provisionedUserId?: string | null;
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
  provisionedUserId?: string | null;
};

export type ApplicationReviewRequest = {
  reviewNote?: string;
};

export type ProvisionedAccountResponse = {
  userId: string;
  email: string;
  role: "MERCHANT" | "DRIVER";
  enabled?: boolean;
  created: boolean;
  temporaryPassword?: string | null;
};

export type MerchantApplicationReviewResponse = {
  application: MerchantApplicationResponse;
  provisionedAccount?: ProvisionedAccountResponse | null;
};

export type CourierApplicationReviewResponse = {
  application: CourierApplicationResponse;
  provisionedAccount?: ProvisionedAccountResponse | null;
};

export type HealthResponse = {
  status?: string;
  [key: string]: unknown;
};
