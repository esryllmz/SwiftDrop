export type UserRole = "CUSTOMER" | "MERCHANT" | "DRIVER" | "ADMIN";

export type OrderStatus =
  | "PLACED"
  | "DRIVER_ASSIGNED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED";

export type DriverStatus = "AVAILABLE" | "BUSY" | "OFFLINE";

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  userId: string;
  email: string;
  role: UserRole;
  passwordChangeRequired: boolean;
};

export type CurrentUserResponse = {
  userId: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  passwordChangeRequired: boolean;
};

export type ChangePasswordResponse = AuthResponse & {
  message: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordResponse = {
  message: string;
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
  driverEmail?: string | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  version?: number | null;
  cancelledAt?: string | null;
  cancelledByActorType?: string | null;
  cancelledByActorId?: string | null;
  cancellationReason?: string | null;
  pickedUpAt?: string | null;
  onTheWayAt?: string | null;
  deliveredAt?: string | null;
  deliveryAddressSummary?: string | null;
  deliveryDistrict?: string | null;
  deliveryCity?: string | null;
  history?: OrderStatusHistoryResponse[];
};

export type OrderStatusHistoryResponse = {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: "CUSTOMER" | "MERCHANT" | "COURIER" | "ADMIN" | "SYSTEM";
  actorId?: string | null;
  reason?: string | null;
  createdAt: string;
};

export type CustomerProfileResponse = {
  userId: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  profileComplete: boolean;
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
};

export type UpdateCustomerProfileRequest = {
  phone: string;
};

export type AddressLabel = "HOME" | "WORK" | "OTHER";

export type CustomerAddressResponse = {
  id: string;
  label: AddressLabel;
  recipientName: string;
  phone?: string | null;
  addressLine: string;
  district: string;
  city: string;
  postalCode?: string | null;
  deliveryNotes?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCustomerAddressRequest = {
  label: AddressLabel;
  recipientName: string;
  phone?: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode?: string;
  deliveryNotes?: string;
};

export type UpdateCustomerAddressRequest = CreateCustomerAddressRequest;

export type CustomerMerchantOption = {
  id: string;
  name: string;
  locationLabel?: string | null;
};

export type MerchantProfileResponse = {
  userId: string;
  email: string;
  role: UserRole;
  merchantId: string;
  businessName?: string | null;
  name?: string | null;
  latitude: number;
  longitude: number;
  phone?: string | null;
  addressLine?: string | null;
  district?: string | null;
  city?: string | null;
  description?: string | null;
  acceptingOrders: boolean;
  averagePreparationMinutes?: number | null;
  profileComplete: boolean;
  totalOrders: number;
  activeOrders: number;
};

export type UpdateMerchantProfileRequest = {
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  description?: string;
  acceptingOrders: boolean;
  averagePreparationMinutes: number;
};

export type CourierProfileResponse = {
  userId: string;
  email: string;
  role: UserRole;
  driverId: string;
  fullName: string;
  status: DriverStatus;
  phone?: string | null;
  vehicleType?: VehicleType | null;
  serviceZone?: string | null;
  maxActiveAssignments: number;
  profileComplete: boolean;
  assignedOrders: number;
  deliveredOrders: number;
};

export type UpdateCourierProfileRequest = {
  phone: string;
  vehicleType: VehicleType;
  serviceZone: string;
  maxActiveAssignments: number;
};

export type CreateCustomerOrderRequest = {
  merchantId: string;
  totalAmount: number;
  deliveryAddressId?: string;
};

export type DriverResponse = {
  id: string;
  userId: string;
  fullName: string;
  email?: string | null;
  status: DriverStatus;
  serviceZone?: string | null;
  activeAssignmentCount: number;
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
  passwordChangeRequired?: boolean;
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
