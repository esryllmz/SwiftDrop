"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CourierAssignmentsTable } from "@/components/portal/CourierAssignmentsTable";
import { MerchantOrdersTable } from "@/components/portal/MerchantOrdersTable";
import {
  OrdersTable,
  PortalMetricCard,
  PortalSection,
} from "@/components/portal/PortalDashboard";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SecondaryButton,
  StatusBadge,
} from "@/components/ui";
import { normalizeApiError } from "@/lib/api";
import { formatCurrencyTRY, formatDateTime, formatDisplayId, formatStatusLabel } from "@/lib/format";
import { formatOrderStatus } from "@/lib/order-status";
import { getPortalTheme } from "@/lib/portal-theme";
import {
  cancelCustomerOrder,
  cancelMerchantOrder,
  createCustomerAddress,
  deleteCustomerAddress,
  getCourierAssignmentDetail,
  getCourierAssignments,
  getCourierProfile,
  getCustomerAddresses,
  getCustomerOrderDetail,
  getCustomerOrders,
  getCustomerProfile,
  getMerchantOrderDetail,
  getMerchantOrders,
  getMerchantProfile,
  markCourierOrderDelivered,
  markCourierOrderOnTheWay,
  markCourierOrderPickedUp,
  markMerchantOrderPreparing,
  markMerchantOrderReadyForPickup,
  setDefaultCustomerAddress,
  updateCourierProfile,
  updateCustomerAddress,
  updateCustomerProfile,
  updateMerchantProfile,
} from "@/lib/portal";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type {
  AddressLabel,
  CourierProfileResponse,
  CustomerAddressResponse,
  CustomerProfileResponse,
  MerchantProfileResponse,
  OrderResponse,
  OrderStatus,
  UserRole,
  VehicleType,
} from "@/types/api";

type PortalKind = "customer" | "merchant" | "courier";
type LoadState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

const activeCustomerStatuses: OrderStatus[] = [
  "PLACED",
  "DRIVER_ASSIGNED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
];
const activeCourierStatuses: OrderStatus[] = [
  "DRIVER_ASSIGNED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
];

export function CustomerOrdersPage() {
  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "delivered" | "cancelled">("all");
  const [query, setQuery] = useState("");
  const { loading, error, reload } = usePortalLoad(async () => {
    const nextOrders = await getCustomerOrders(accessToken);
    setOrders(nextOrders);
  }, accessToken, "Customer orders could not be loaded.");

  const filteredOrders = useMemo(() => {
    const byStatus = orders.filter((order) => {
      if (filter === "active") {
        return activeCustomerStatuses.includes(order.status);
      }
      if (filter === "delivered") {
        return order.status === "DELIVERED";
      }
      if (filter === "cancelled") {
        return order.status === "CANCELLED";
      }
      return true;
    });
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return byStatus;
    }
    return byStatus.filter((order) =>
      [
        order.id,
        formatDisplayId(order.id, "Order"),
        order.merchantName,
        order.driverName,
        order.driverEmail,
        formatOrderStatus(order.status),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [filter, orders, query]);
  const handleCancel = useCancelOrderAction(
    accessToken,
    "customer",
    setActionOrderId,
    reload,
  );

  return (
    <PortalShell
      portalType="customer"
      email={user?.email ?? ""}
      title="Orders"
      subtitle="Review your active and completed SwiftDrop orders."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <PortalSection
        tone="customer"
        title="Order list"
        description="Filter and review orders returned by the customer orders endpoint."
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label className="block w-full lg:max-w-md">
            <span className="text-sm font-semibold text-slate-800">Search orders</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search orders by merchant, status or order ID"
              className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <FilterTabs tone="customer" value={filter} onChange={setFilter} options={["all", "active", "delivered", "cancelled"]} />
        </div>
        <OrdersTable
          variant="customer"
          orders={filteredOrders}
          emptyMessage="No orders match the current filters."
          columns={["order", "merchant", "driver", "status", "amount", "created", "actions"]}
          renderActions={(order) => (
            <span className="flex flex-wrap items-center gap-2">
              {["PLACED", "DRIVER_ASSIGNED"].includes(order.status) ? (
                <Button
                  className="min-h-9 border-rose-600 bg-rose-600 px-3 py-1.5 text-xs hover:bg-rose-700 focus:ring-rose-500"
                  disabled={actionOrderId === order.id}
                  onClick={() => setCancelOrder(order)}
                >
                  Cancel order
                </Button>
              ) : null}
              <DetailLink tone="customer" href={`/customer/orders/${order.id}`} label="Details" />
            </span>
          )}
        />
      </PortalSection>
      <CancelOrderModal
        order={cancelOrder}
        theme="customer"
        loading={Boolean(cancelOrder && actionOrderId === cancelOrder.id)}
        onClose={() => setCancelOrder(null)}
        onSubmit={async (reason) => {
          if (!cancelOrder) {
            return;
          }
          await handleCancel(cancelOrder.id, reason);
          setCancelOrder(null);
        }}
      />
    </PortalShell>
  );
}

export function CustomerOrderDetailPage({ orderId }: { orderId: string }) {
  const { accessToken } = useAuth();
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleCancel = useCancelOrderAction(accessToken, "customer", setActionOrderId, () => setRefreshKey((value) => value + 1));

  return (
    <>
      <OrderDetailPage
        key={refreshKey}
        portalType="customer"
        title="Order Detail"
        subtitle="Review the order summary and current delivery progress."
        loadOrder={(token) => getCustomerOrderDetail(token, orderId)}
        backHref="/customer/orders"
        actionRenderer={(order) => (
          ["PLACED", "DRIVER_ASSIGNED"].includes(order.status) ? (
            <Button className="w-fit border-rose-600 bg-rose-600 hover:bg-rose-700 focus:ring-rose-500" disabled={actionOrderId === order.id} onClick={() => setCancelOrder(order)}>
              Cancel order
            </Button>
          ) : null
        )}
      />
      <CancelOrderModal
        order={cancelOrder}
        theme="customer"
        loading={Boolean(cancelOrder && actionOrderId === cancelOrder.id)}
        onClose={() => setCancelOrder(null)}
        onSubmit={async (reason) => {
          if (!cancelOrder) {
            return;
          }
          await handleCancel(cancelOrder.id, reason);
          setCancelOrder(null);
        }}
      />
    </>
  );
}

const ADDRESS_LABELS: AddressLabel[] = ["HOME", "WORK", "OTHER"];

export function CustomerAddressesPage() {
  const { accessToken, user } = useAuth();
  const [addresses, setAddresses] = useState<CustomerAddressResponse[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddressResponse | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const { loading, error, reload } = usePortalLoad(async () => {
    setAddresses(await getCustomerAddresses(accessToken));
  }, accessToken, "Delivery addresses could not be loaded.");

  async function handleDelete(addressId: string) {
    if (!accessToken || actionId) {
      return;
    }
    setActionId(addressId);
    try {
      await deleteCustomerAddress(accessToken, addressId);
      showSuccessToast("Address removed.");
      await reload();
    } catch (err) {
      showErrorToast(normalizeApiError(err, "Could not remove address."));
    } finally {
      setActionId(null);
    }
  }

  async function handleSetDefault(addressId: string) {
    if (!accessToken || actionId) {
      return;
    }
    setActionId(addressId);
    try {
      await setDefaultCustomerAddress(accessToken, addressId);
      showSuccessToast("Default address updated.");
      await reload();
    } catch (err) {
      showErrorToast(normalizeApiError(err, "Could not set default address."));
    } finally {
      setActionId(null);
    }
  }

  return (
    <PortalShell
      portalType="customer"
      email={user?.email ?? ""}
      title="Delivery addresses"
      subtitle="Manage where your orders should be delivered."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <PortalSection
        tone="customer"
        title="Your addresses"
        description="Add, edit, or remove delivery addresses. One address must be set as default."
        action={
          <Button
            className="border-blue-600 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            onClick={() => {
              setEditingAddress(null);
              setFormOpen(true);
            }}
          >
            Add address
          </Button>
        }
      >
        {addresses.length === 0 ? (
          <EmptyState message="No delivery addresses yet. Add one to start placing orders." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`rounded-lg border p-4 ${address.isDefault ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase text-blue-700">{formatAddressLabel(address.label)}</span>
                  {address.isDefault ? (
                    <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">Default</span>
                  ) : null}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-950">{address.recipientName}</div>
                <div className="text-sm text-slate-700">{address.addressLine}</div>
                <div className="text-sm text-slate-700">
                  {address.district}, {address.city}
                  {address.postalCode ? ` ${address.postalCode}` : ""}
                </div>
                {address.phone ? <div className="mt-1 text-xs text-slate-500">{address.phone}</div> : null}
                {address.deliveryNotes ? <div className="mt-1 text-xs text-slate-500">Note: {address.deliveryNotes}</div> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      setEditingAddress(address);
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </SecondaryButton>
                  {!address.isDefault ? (
                    <SecondaryButton
                      type="button"
                      disabled={actionId === address.id}
                      onClick={() => void handleSetDefault(address.id)}
                    >
                      Set default
                    </SecondaryButton>
                  ) : null}
                  <Button
                    className="min-h-9 border-rose-600 bg-rose-600 px-3 py-1.5 text-xs hover:bg-rose-700 focus:ring-rose-500"
                    disabled={actionId === address.id}
                    onClick={() => void handleDelete(address.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <DetailLink tone="customer" href="/customer" label="Back to dashboard" />
          <DetailLink tone="customer" href="/customer/orders" label="View orders" />
        </div>
      </PortalSection>
      <CustomerAddressFormModal
        key={editingAddress?.id ?? "new"}
        open={formOpen}
        address={editingAddress}
        onClose={() => setFormOpen(false)}
        onSaved={async () => {
          setFormOpen(false);
          await reload();
        }}
      />
    </PortalShell>
  );
}

function formatAddressLabel(label: AddressLabel) {
  if (label === "HOME") return "Home";
  if (label === "WORK") return "Work";
  return "Other";
}

function CustomerAddressFormModal({
  open,
  address,
  onClose,
  onSaved,
}: {
  open: boolean;
  address: CustomerAddressResponse | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { accessToken } = useAuth();
  const [label, setLabel] = useState<AddressLabel>(address?.label ?? "HOME");
  const [recipientName, setRecipientName] = useState(address?.recipientName ?? "");
  const [phone, setPhone] = useState(address?.phone ?? "");
  const [addressLine, setAddressLine] = useState(address?.addressLine ?? "");
  const [district, setDistrict] = useState(address?.district ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [postalCode, setPostalCode] = useState(address?.postalCode ?? "");
  const [deliveryNotes, setDeliveryNotes] = useState(address?.deliveryNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setSaving(true);
    setError(null);
    const request = {
      label,
      recipientName: recipientName.trim(),
      phone: phone.trim() || undefined,
      addressLine: addressLine.trim(),
      district: district.trim(),
      city: city.trim(),
      postalCode: postalCode.trim() || undefined,
      deliveryNotes: deliveryNotes.trim() || undefined,
    };
    try {
      if (address) {
        await updateCustomerAddress(accessToken, address.id, request);
      } else {
        await createCustomerAddress(accessToken, request);
      }
      showSuccessToast(address ? "Address updated." : "Address added.");
      await onSaved();
    } catch (err) {
      const message = normalizeApiError(err, "Could not save address.");
      setError(message);
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <section className="w-full max-w-lg overflow-hidden rounded-lg border border-blue-100 bg-white shadow-2xl shadow-slate-950/20">
        <div className="border-b border-blue-100 bg-blue-50 px-5 py-4">
          <div className="text-xs font-semibold uppercase text-blue-700">Delivery address</div>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{address ? "Edit address" : "Add address"}</h2>
        </div>
        <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Label</span>
            <select
              value={label}
              onChange={(event) => setLabel(event.target.value as AddressLabel)}
              className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {ADDRESS_LABELS.map((value) => (
                <option key={value} value={value}>{formatAddressLabel(value)}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Recipient name" value={recipientName} onChange={setRecipientName} placeholder="Full name" />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="+90 555 000 00 00" />
          </div>
          <Field label="Address line" value={addressLine} onChange={setAddressLine} placeholder="Street, building, apartment" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="District" value={district} onChange={setDistrict} placeholder="District" />
            <Field label="City" value={city} onChange={setCity} placeholder="City" />
          </div>
          <Field label="Postal code (optional)" value={postalCode} onChange={setPostalCode} placeholder="Postal code" />
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Delivery notes (optional)</span>
            <textarea
              value={deliveryNotes}
              onChange={(event) => setDeliveryNotes(event.target.value)}
              rows={3}
              maxLength={500}
              className="mt-1 w-full resize-none rounded-lg border border-blue-200 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. Ring the bell twice"
            />
          </label>
          {error ? <ErrorState message={error} /> : null}
          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
            <Button
              type="submit"
              className="border-blue-600 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              disabled={saving || !recipientName.trim() || !addressLine.trim() || !district.trim() || !city.trim()}
            >
              {saving ? "Saving..." : "Save address"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function CustomerProfilePage() {
  return (
    <ProfilePage<CustomerProfileResponse>
      portalType="customer"
      title="Profile"
      subtitle="Review your customer account details."
      loadProfile={getCustomerProfile}
      render={(profile, reload) => (
        <div className="grid gap-4">
          <DetailGrid
            tone="customer"
            fields={[
              ["Name", formatCustomerDisplayName(profile.email)],
              ["Email", profile.email],
              ["Role", formatRole(profile.role)],
              ["Account Status", "Active"],
              [
                "Profile Status",
                profile.profileComplete ? (
                  <span key="status" className="text-emerald-700">Complete</span>
                ) : (
                  <span key="status" className="text-amber-700">Incomplete — add a phone number and delivery address</span>
                ),
              ],
              ["Total Orders", formatCount(profile.totalOrders)],
              ["Delivered Orders", formatCount(profile.deliveredOrders)],
            ]}
          />
          <CustomerPhoneForm phone={profile.phone} onSaved={reload} />
        </div>
      )}
    />
  );
}

function CustomerPhoneForm({ phone, onSaved }: { phone?: string | null; onSaved: () => void }) {
  const { accessToken } = useAuth();
  const [value, setValue] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !value.trim()) {
      return;
    }
    setSaving(true);
    try {
      await updateCustomerProfile(accessToken, { phone: value.trim() });
      showSuccessToast("Profile updated.");
      onSaved();
    } catch (err) {
      showErrorToast(normalizeApiError(err, "Could not update profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rounded-lg border border-blue-100 bg-blue-50 p-4" onSubmit={handleSubmit}>
      <h3 className="text-sm font-semibold text-blue-950">Contact phone</h3>
      <p className="mt-1 text-sm leading-6 text-blue-900">
        Required before you can place an order. Email stays read-only.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Phone" value={value} onChange={setValue} placeholder="+90 555 000 00 00" />
        <Button
          type="submit"
          className="h-10 border-blue-600 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 sm:w-fit"
          disabled={saving || !value.trim()}
        >
          {saving ? "Saving..." : "Save phone"}
        </Button>
      </div>
    </form>
  );
}

export function MerchantOrdersPage() {
  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [profileComplete, setProfileComplete] = useState(true);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);
  const [filter, setFilter] = useState<"new" | "preparing" | "ready" | "courier" | "completed" | "cancelled">("new");
  const [query, setQuery] = useState("");
  const { loading, error, reload } = usePortalLoad(async () => {
    const [nextOrders, profile] = await Promise.all([
      getMerchantOrders(accessToken),
      getMerchantProfile(accessToken),
    ]);
    setOrders(nextOrders);
    setProfileComplete(profile.profileComplete);
  }, accessToken, "Merchant orders could not be loaded.");
  const filteredOrders = useMemo(() => {
    const byStatus = filterMerchantOrders(orders, filter);
    return searchOrders(byStatus, query);
  }, [filter, orders, query]);
  const handleAction = useMerchantOrderAction(accessToken, setActionOrderId, reload);
  const handleCancel = useCancelOrderAction(accessToken, "merchant", setActionOrderId, reload);

  return (
    <PortalShell
      portalType="merchant"
      email={user?.email ?? ""}
      title="Orders"
      subtitle="Prepare orders and mark them ready for courier pickup."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      {!loading && !profileComplete ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">Complete your store profile before processing orders.</h3>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Order actions are disabled until your store profile is complete.
          </p>
          <Link href="/merchant/store" className="mt-3 inline-flex w-fit rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100">
            Complete store profile
          </Link>
        </div>
      ) : null}
      <PortalSection
        theme="merchant"
        title="Order Workflow"
        description="Actions use the current merchant order endpoints."
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SearchField
            tone="merchant"
            value={query}
            onChange={setQuery}
            placeholder="Search orders by customer, courier, status or order ID"
          />
          <FilterTabs tone="merchant" value={filter} onChange={setFilter} options={["new", "preparing", "ready", "courier", "completed", "cancelled"]} />
        </div>
        <MerchantOrdersTable
          orders={filteredOrders}
          actionOrderId={actionOrderId}
          actionsDisabled={!profileComplete}
          detailHrefFor={(order) => `/merchant/orders/${order.id}`}
          onPreparing={(id) => void handleAction(id, "preparing")}
          onReadyForPickup={(id) => void handleAction(id, "ready-for-pickup")}
          onCancel={setCancelOrder}
        />
      </PortalSection>
      <CancelOrderModal
        order={cancelOrder}
        theme="merchant"
        loading={Boolean(cancelOrder && actionOrderId === cancelOrder.id)}
        onClose={() => setCancelOrder(null)}
        onSubmit={async (reason) => {
          if (!cancelOrder) {
            return;
          }
          await handleCancel(cancelOrder.id, reason);
          setCancelOrder(null);
        }}
      />
    </PortalShell>
  );
}

export function MerchantOrderDetailPage({ orderId }: { orderId: string }) {
  const { accessToken } = useAuth();
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleAction = useMerchantOrderAction(accessToken, setActionOrderId, () => setRefreshKey((value) => value + 1));
  const handleCancel = useCancelOrderAction(accessToken, "merchant", setActionOrderId, () => setRefreshKey((value) => value + 1));

  return (
    <>
      <OrderDetailPage
        key={refreshKey}
        portalType="merchant"
        title="Order Detail"
        subtitle="Review order details and available merchant action."
        loadOrder={(token) => getMerchantOrderDetail(token, orderId)}
        backHref="/merchant/orders"
        actionRenderer={(order) => (
          <MerchantOrdersTable
            orders={[order]}
            actionOrderId={actionOrderId}
            onPreparing={(id) => void handleAction(id, "preparing")}
            onReadyForPickup={(id) => void handleAction(id, "ready-for-pickup")}
            onCancel={setCancelOrder}
          />
        )}
      />
      <CancelOrderModal
        order={cancelOrder}
        theme="merchant"
        loading={Boolean(cancelOrder && actionOrderId === cancelOrder.id)}
        onClose={() => setCancelOrder(null)}
        onSubmit={async (reason) => {
          if (!cancelOrder) {
            return;
          }
          await handleCancel(cancelOrder.id, reason);
          setCancelOrder(null);
        }}
      />
    </>
  );
}

export function MerchantStorePage() {
  return (
    <ProfilePage<MerchantProfileResponse>
      portalType="merchant"
      title="Store"
      subtitle="Review and complete your store's operational profile."
      loadProfile={getMerchantProfile}
      render={(profile, reload) => (
        <div className="grid gap-4">
          <DetailGrid
            tone="merchant"
            fields={[
              ["Business Name", profile.businessName ?? profile.name ?? "Not available"],
              ["Location", formatLocation(profile.latitude, profile.longitude)],
              [
                "Profile Status",
                profile.profileComplete ? (
                  <span key="status" className="text-emerald-700">Complete</span>
                ) : (
                  <span key="status" className="text-amber-700">Incomplete — fill in the form below</span>
                ),
              ],
              [
                "Accepting Orders",
                profile.acceptingOrders ? (
                  <span key="accepting" className="text-emerald-700">Yes</span>
                ) : (
                  <span key="accepting" className="text-slate-500">No</span>
                ),
              ],
            ]}
          />
          <MerchantStoreForm profile={profile} onSaved={reload} />
        </div>
      )}
    />
  );
}

function MerchantStoreForm({ profile, onSaved }: { profile: MerchantProfileResponse; onSaved: () => void }) {
  const { accessToken } = useAuth();
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [addressLine, setAddressLine] = useState(profile.addressLine ?? "");
  const [district, setDistrict] = useState(profile.district ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [description, setDescription] = useState(profile.description ?? "");
  const [averagePreparationMinutes, setAveragePreparationMinutes] = useState(
    profile.averagePreparationMinutes ? String(profile.averagePreparationMinutes) : "",
  );
  const [acceptingOrders, setAcceptingOrders] = useState(profile.acceptingOrders);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedPrepTime = Number(averagePreparationMinutes);
  const canSubmit =
    phone.trim() && addressLine.trim() && district.trim() && city.trim()
    && Number.isFinite(parsedPrepTime) && parsedPrepTime > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !canSubmit) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateMerchantProfile(accessToken, {
        phone: phone.trim(),
        addressLine: addressLine.trim(),
        district: district.trim(),
        city: city.trim(),
        description: description.trim() || undefined,
        acceptingOrders,
        averagePreparationMinutes: parsedPrepTime,
      });
      showSuccessToast("Store profile updated.");
      onSaved();
    } catch (err) {
      const message = normalizeApiError(err, "Could not update store profile.");
      setError(message);
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-lg border border-violet-100 bg-violet-50 p-4" onSubmit={handleSubmit}>
      <h3 className="text-sm font-semibold text-violet-950">Store details</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="+90 555 000 00 00" />
        <Field label="Average preparation time (minutes)" value={averagePreparationMinutes} onChange={setAveragePreparationMinutes} placeholder="20" />
      </div>
      <Field label="Address line" value={addressLine} onChange={setAddressLine} placeholder="Street, building" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="District" value={district} onChange={setDistrict} placeholder="District" />
        <Field label="City" value={city} onChange={setCity} placeholder="City" />
      </div>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Description (optional)</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={500}
          className="mt-1 w-full resize-none rounded-lg border border-violet-200 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          placeholder="Tell customers about your store"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={acceptingOrders}
          onChange={(event) => setAcceptingOrders(event.target.checked)}
          className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
        />
        <span className="text-sm font-medium text-slate-700">Accepting new orders</span>
      </label>
      {error ? <ErrorState message={error} /> : null}
      <Button
        type="submit"
        className="h-10 w-fit border-violet-600 bg-violet-600 hover:bg-violet-700 focus:ring-violet-500"
        disabled={saving || !canSubmit}
      >
        {saving ? "Saving..." : "Save store profile"}
      </Button>
    </form>
  );
}

export function MerchantAnalyticsPage() {
  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const { loading, error, reload } = usePortalLoad(async () => {
    setOrders(await getMerchantOrders(accessToken));
  }, accessToken, "Merchant analytics could not be loaded.");
  const analytics = useMemo(() => computeAnalytics(orders), [orders]);

  return (
    <PortalShell
      portalType="merchant"
      email={user?.email ?? ""}
      title="Analytics"
      subtitle="Metrics computed from available order data."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <div className="grid gap-4 md:grid-cols-3">
        <PortalMetricCard theme="merchant" label="Total Orders" value={formatCount(analytics.totalOrders)} />
        <PortalMetricCard theme="merchant" label="Active Orders" value={formatCount(analytics.activeOrders)} />
        <PortalMetricCard theme="merchant" label="Delivered Orders" value={formatCount(analytics.deliveredOrders)} />
        <PortalMetricCard theme="merchant" label="Revenue Total" value={formatCurrencyTRY(analytics.revenueTotal)} />
        <PortalMetricCard theme="merchant" label="Average Order Value" value={formatCurrencyTRY(analytics.averageOrderValue)} />
      </div>
      <div className="mt-5">
        <PortalSection theme="merchant" title="Status Distribution" description="Computed from the merchant order list.">
          {analytics.totalOrders === 0 ? (
            <EmptyState message="No orders found." />
          ) : (
            <div className="grid gap-2">
              {analytics.statusDistribution.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
                  <StatusBadge status={status} label={formatOrderStatus(status)} />
                  <span className="text-sm font-medium text-slate-700">{formatCount(count)}</span>
                </div>
              ))}
            </div>
          )}
        </PortalSection>
      </div>
    </PortalShell>
  );
}

export function MerchantProfilePage() {
  return (
    <ProfilePage<MerchantProfileResponse>
      portalType="merchant"
      title="Profile"
      subtitle="Review your merchant account details."
      loadProfile={getMerchantProfile}
      render={(profile) => (
        <DetailGrid
          tone="merchant"
          fields={[
            ["Business Name", profile.businessName ?? profile.name ?? "Not available"],
            ["Email", profile.email],
            ["Role", formatRole(profile.role)],
            ["Store Association", profile.merchantId ? formatDisplayId(profile.merchantId, "Store") : "Not available"],
            ["Account Status", "Active"],
          ]}
        />
      )}
    />
  );
}

type CourierAssignmentFilter = "all" | "active" | "ready" | "picked-up" | "on-the-way" | "delivered";

export function CourierAssignmentsPage() {
  const { accessToken, user } = useAuth();
  const [assignments, setAssignments] = useState<OrderResponse[]>([]);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CourierAssignmentFilter>("active");
  const [query, setQuery] = useState("");
  const { loading, error, reload } = usePortalLoad(async () => {
    const nextAssignments = await getCourierAssignments(accessToken);
    setAssignments(nextAssignments.filter((assignment) => assignment.status !== "CANCELLED"));
  }, accessToken, "Courier assignments could not be loaded.");
  const filteredAssignments = useMemo(() => {
    const byStatus = filterCourierAssignments(assignments, filter);
    return searchOrders(byStatus, query);
  }, [assignments, filter, query]);
  const handleAction = useCourierOrderAction(accessToken, setActionOrderId, reload);

  return (
    <PortalShell
      portalType="courier"
      email={user?.email ?? ""}
      title="Assignments"
      subtitle="Active delivery work assigned to this courier account."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <PortalSection theme="courier" title="Active Assignments" description="Completed deliveries also live in history.">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SearchField
            tone="courier"
            value={query}
            onChange={setQuery}
            placeholder="Search assignments by merchant, status or order ID"
          />
          <FilterTabs
            tone="courier"
            value={filter}
            onChange={setFilter}
            options={["all", "active", "ready", "picked-up", "on-the-way", "delivered"]}
          />
        </div>
        <CourierAssignmentsTable
          assignments={filteredAssignments}
          actionOrderId={actionOrderId}
          detailHrefFor={(order) => `/courier/assignments/${order.id}`}
          onPickedUp={(id) => void handleAction(id, "picked-up")}
          onOnTheWay={(id) => void handleAction(id, "on-the-way")}
          onDelivered={(id) => void handleAction(id, "delivered")}
          emptyMessage="No active assignments assigned to this courier."
        />
      </PortalSection>
    </PortalShell>
  );
}

export function CourierAssignmentDetailPage({ orderId }: { orderId: string }) {
  const { accessToken } = useAuth();
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const handleAction = useCourierOrderAction(accessToken, setActionOrderId, () => setRefreshKey((value) => value + 1));

  return (
    <OrderDetailPage
      key={refreshKey}
      portalType="courier"
      title="Assignment Detail"
      subtitle="Review pickup and delivery information available for this assignment."
      loadOrder={(token) => getCourierAssignmentDetail(token, orderId)}
      backHref="/courier/assignments"
      actionRenderer={(order) => (
        <CourierAssignmentsTable
          assignments={[order]}
          actionOrderId={actionOrderId}
          onPickedUp={(id) => void handleAction(id, "picked-up")}
          onOnTheWay={(id) => void handleAction(id, "on-the-way")}
          onDelivered={(id) => void handleAction(id, "delivered")}
        />
      )}
    />
  );
}

export function CourierHistoryPage() {
  const { accessToken, user } = useAuth();
  const [assignments, setAssignments] = useState<OrderResponse[]>([]);
  const [filter, setFilter] = useState<"all" | "delivered" | "cancelled">("all");
  const [query, setQuery] = useState("");
  const { loading, error, reload } = usePortalLoad(async () => {
    const nextAssignments = await getCourierAssignments(accessToken);
    setAssignments(nextAssignments.filter((assignment) => assignment.status === "DELIVERED" || assignment.status === "CANCELLED"));
  }, accessToken, "Courier history could not be loaded.");
  const filteredAssignments = useMemo(() => {
    const byStatus = assignments.filter((assignment) => {
      if (filter === "delivered") {
        return assignment.status === "DELIVERED";
      }
      if (filter === "cancelled") {
        return assignment.status === "CANCELLED";
      }
      return true;
    });
    return searchOrders(byStatus, query);
  }, [assignments, filter, query]);

  return (
    <PortalShell
      portalType="courier"
      email={user?.email ?? ""}
      title="History"
      subtitle="Completed delivery assignments."
    >
      <PageState loading={loading} error={error} onRetry={reload} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SearchField
          tone="courier"
          value={query}
          onChange={setQuery}
          placeholder="Search assignments by merchant, status or order ID"
        />
        <FilterTabs tone="courier" value={filter} onChange={setFilter} options={["all", "delivered", "cancelled"]} />
      </div>
      <OrdersTable
        theme="courier"
        orders={filteredAssignments}
        emptyMessage="No completed deliveries yet."
        columns={["order", "merchant", "status", "amount", "created", "actions"]}
        renderActions={(order) => <DetailLink tone="courier" href={`/courier/assignments/${order.id}`} label="Details" />}
      />
    </PortalShell>
  );
}

export function CourierProfilePage() {
  return (
    <ProfilePage<CourierProfileResponse>
      portalType="courier"
      title="Profile"
      subtitle="Review and complete your courier operational profile."
      loadProfile={getCourierProfile}
      render={(profile, reload) => (
        <div className="grid gap-4">
          <DetailGrid
            tone="courier"
            fields={[
              ["Courier Name", profile.fullName],
              ["Email", profile.email],
              ["Role", "Courier"],
              ["Availability Status", formatStatusLabel(profile.status)],
              [
                "Profile Status",
                profile.profileComplete ? (
                  <span key="status" className="text-emerald-700">Complete</span>
                ) : (
                  <span key="status" className="text-amber-700">Incomplete — fill in the form below</span>
                ),
              ],
            ]}
          />
          <CourierProfileForm profile={profile} onSaved={reload} />
        </div>
      )}
    />
  );
}

const VEHICLE_TYPES: VehicleType[] = ["MOTORBIKE", "CAR", "BICYCLE", "WALKING"];

function formatVehicleType(vehicleType: VehicleType) {
  if (vehicleType === "MOTORBIKE") return "Motorbike";
  if (vehicleType === "CAR") return "Car";
  if (vehicleType === "BICYCLE") return "Bicycle";
  return "Walking";
}

function CourierProfileForm({ profile, onSaved }: { profile: CourierProfileResponse; onSaved: () => void }) {
  const { accessToken } = useAuth();
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [vehicleType, setVehicleType] = useState<VehicleType>(profile.vehicleType ?? "MOTORBIKE");
  const [serviceZone, setServiceZone] = useState(profile.serviceZone ?? "");
  const [maxActiveAssignments, setMaxActiveAssignments] = useState(String(profile.maxActiveAssignments || 3));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMax = Number(maxActiveAssignments);
  const canSubmit = phone.trim() && serviceZone.trim() && Number.isFinite(parsedMax) && parsedMax > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !canSubmit) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateCourierProfile(accessToken, {
        phone: phone.trim(),
        vehicleType,
        serviceZone: serviceZone.trim(),
        maxActiveAssignments: parsedMax,
      });
      showSuccessToast("Courier profile updated.");
      onSaved();
    } catch (err) {
      const message = normalizeApiError(err, "Could not update courier profile.");
      setError(message);
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4" onSubmit={handleSubmit}>
      <h3 className="text-sm font-semibold text-emerald-950">Courier details</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="+90 555 000 00 00" />
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Vehicle type</span>
          <select
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value as VehicleType)}
            className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            {VEHICLE_TYPES.map((value) => (
              <option key={value} value={value}>{formatVehicleType(value)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service zone (district)" value={serviceZone} onChange={setServiceZone} placeholder="District" />
        <Field label="Max active assignments" value={maxActiveAssignments} onChange={setMaxActiveAssignments} placeholder="3" />
      </div>
      {error ? <ErrorState message={error} /> : null}
      <Button
        type="submit"
        className="h-10 w-fit border-emerald-600 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
        disabled={saving || !canSubmit}
      >
        {saving ? "Saving..." : "Save courier profile"}
      </Button>
    </form>
  );
}

function OrderDetailPage({
  portalType,
  title,
  subtitle,
  loadOrder,
  backHref,
  actionRenderer,
}: {
  portalType: PortalKind;
  title: string;
  subtitle: string;
  loadOrder: (token: string | null) => Promise<OrderResponse | null>;
  backHref: string;
  actionRenderer: (order: OrderResponse) => React.ReactNode;
}) {
  const { accessToken, user } = useAuth();
  const [state, setState] = useState<LoadState<OrderResponse>>({ loading: true, error: null, data: null });
  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, data: await loadOrder(accessToken) });
    } catch (err) {
      const message = normalizeApiError(err, `${title} could not be loaded.`);
      setState({ loading: false, error: message, data: null });
      showErrorToast(message);
    }
  }, [accessToken, loadOrder, title]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const order = state.data;

  return (
    <PortalShell portalType={portalType} email={user?.email ?? ""} title={title} subtitle={subtitle}>
      <PageState loading={state.loading} error={state.error} onRetry={reload} />
      {!state.loading && !state.error && !order ? (
        <div className={`rounded-lg border border-dashed p-6 ${getPortalTheme(portalType).table.empty}`}>
          <EmptyState message="Order was not found for this portal." />
          <DetailLink tone={portalType} href={backHref} label="Back to list" />
        </div>
      ) : null}
      {order ? (
        <div className="grid gap-5">
          <PortalSection
            theme={portalType}
            title={formatDisplayId(order.id, portalType === "courier" ? "Assignment" : "Order")}
            description="Summary from the current order data."
            action={<DetailLink tone={portalType} href={backHref} label="Back to list" />}
          >
            <DetailGrid
              tone={portalType}
              fields={[
                ["Current status", <StatusBadge key="status" status={order.status} label={formatOrderStatus(order.status)} />],
                ["Total Amount", formatCurrencyTRY(order.totalAmount)],
                ["Created Time", formatDateTimeOrNA(order.createdAt)],
              ]}
            />
          </PortalSection>
          <PortalSection theme={portalType} title="Timeline" description="Status history when available, otherwise a current-status fallback.">
            <OrderTimeline order={order} tone={portalType} />
          </PortalSection>
          <div className="grid gap-5 md:grid-cols-2">
            <PortalSection theme={portalType} title="Merchant" description="Pickup information returned by the backend.">
              <DetailGrid
                tone={portalType}
                fields={[
                  ["Name", order.merchantName ?? "Not available"],
                  ["Pickup details", "Pickup details are not available yet"],
                ]}
              />
            </PortalSection>
            <PortalSection theme={portalType} title="Courier" description="Assignment information returned by the backend.">
              {order.driverName || order.driverEmail ? (
                <DetailGrid
                  tone={portalType}
                  fields={[
                    ["Name", order.driverName ?? "Not available"],
                    ["Email", order.driverEmail ?? "Not available"],
                  ]}
                />
              ) : (
                <EmptyState message="Awaiting courier assignment." />
              )}
            </PortalSection>
          </div>
          {order.cancellationReason ? (
            <PortalSection theme={portalType} title="Cancellation" description="Cancellation details for this order.">
              <DetailGrid
                tone={portalType}
                fields={[
                  ["Reason", order.cancellationReason],
                  ["Cancelled at", formatDateTimeOrNA(order.cancelledAt)],
                  ["Cancelled by", formatStatusLabel(order.cancelledByActorType ?? undefined)],
                ]}
              />
            </PortalSection>
          ) : null}
          <PortalSection theme={portalType} title="Actions" description="Available actions depend on the current order status.">
            {actionRenderer(order) ?? <EmptyState message="No actions are available for this status." />}
          </PortalSection>
        </div>
      ) : null}
    </PortalShell>
  );
}

function ProfilePage<TProfile extends { email: string; role: UserRole }>({
  portalType,
  title,
  subtitle,
  loadProfile,
  render,
}: {
  portalType: PortalKind;
  title: string;
  subtitle: string;
  loadProfile: (token: string | null) => Promise<TProfile>;
  render: (profile: TProfile, reload: () => void) => React.ReactNode;
}) {
  const { accessToken, user, logout } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<LoadState<TProfile>>({ loading: true, error: null, data: null });
  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, data: await loadProfile(accessToken) });
    } catch (err) {
      const message = normalizeApiError(err, `${title} could not be loaded.`);
      setState({ loading: false, error: message, data: null });
      showErrorToast(message);
    }
  }, [accessToken, loadProfile, title]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return (
    <PortalShell
      portalType={portalType}
      email={state.data?.email ?? user?.email ?? ""}
      title={title}
      subtitle={subtitle}
    >
      <PageState loading={state.loading} error={state.error} onRetry={reload} />
      {state.data ? (
        <PortalSection
          theme={portalType}
          title="Account Summary"
          description="Read-only details from the current account and portal profile."
          action={portalType === "customer" ? undefined : <DetailLink tone={portalType} href={`/${portalType}/profile/change-password`} label="Change password" />}
        >
          {render(state.data, () => void reload())}
          {portalType === "customer" ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <DetailLink tone="customer" href="/customer/profile/change-password" label="Change password" />
              <DetailLink tone="customer" href="/customer" label="Back to dashboard" />
              <SecondaryButton type="button" onClick={() => void logout().finally(() => router.replace("/"))}>
                Logout
              </SecondaryButton>
            </div>
          ) : null}
        </PortalSection>
      ) : null}
    </PortalShell>
  );
}

function usePortalLoad(load: () => Promise<void>, accessToken: string | null, fallback: string) {
  const loadRef = useRef(load);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const reload = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await loadRef.current();
    } catch (err) {
      const message = normalizeApiError(err, fallback);
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, fallback]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  return { loading, error, reload };
}

function useMerchantOrderAction(
  accessToken: string | null,
  setActionOrderId: (orderId: string | null) => void,
  reload: () => void | Promise<void>,
) {
  return async (orderId: string, action: "preparing" | "ready-for-pickup") => {
    if (!accessToken) {
      return;
    }

    setActionOrderId(orderId);
    try {
      if (action === "preparing") {
        await markMerchantOrderPreparing(accessToken, orderId);
        showSuccessToast("Order marked as preparing.");
      } else {
        await markMerchantOrderReadyForPickup(accessToken, orderId);
        showSuccessToast("Order marked ready for pickup.");
      }
      await reload();
    } catch (err) {
      showErrorToast(normalizeApiError(err, "Order action failed."));
    } finally {
      setActionOrderId(null);
    }
  };
}

function useCancelOrderAction(
  accessToken: string | null,
  portalType: "customer" | "merchant",
  setActionOrderId: (orderId: string | null) => void,
  reload: () => void | Promise<void>,
) {
  return async (orderId: string, reason: string) => {
    if (!accessToken) {
      return;
    }

    setActionOrderId(orderId);
    try {
      if (portalType === "customer") {
        await cancelCustomerOrder(accessToken, orderId, reason);
      } else {
        await cancelMerchantOrder(accessToken, orderId, reason);
      }
      showSuccessToast("Order cancelled.");
      await reload();
    } catch (err) {
      showErrorToast(normalizeApiError(err, "Order cancellation failed."));
    } finally {
      setActionOrderId(null);
    }
  };
}

function useCourierOrderAction(
  accessToken: string | null,
  setActionOrderId: (orderId: string | null) => void,
  reload: () => void | Promise<void>,
) {
  return async (orderId: string, action: "picked-up" | "on-the-way" | "delivered") => {
    if (!accessToken) {
      return;
    }

    setActionOrderId(orderId);
    try {
      if (action === "picked-up") {
        await markCourierOrderPickedUp(accessToken, orderId);
        showSuccessToast("Order marked as picked up.");
      } else if (action === "on-the-way") {
        await markCourierOrderOnTheWay(accessToken, orderId);
        showSuccessToast("Order marked on the way.");
      } else {
        await markCourierOrderDelivered(accessToken, orderId);
        showSuccessToast("Order marked as delivered.");
      }
      await reload();
    } catch (err) {
      showErrorToast(normalizeApiError(err, "Assignment action failed."));
    } finally {
      setActionOrderId(null);
    }
  };
}

function PageState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="mb-5 grid gap-3">
        <ErrorState message={error} />
        <SecondaryButton className="w-fit" onClick={onRetry}>Retry</SecondaryButton>
      </div>
    );
  }

  return null;
}

function SearchField({
  tone,
  value,
  onChange,
  placeholder,
}: {
  tone: PortalKind;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const theme = getPortalTheme(tone);
  return (
    <label className="block w-full lg:max-w-md">
      <span className="text-sm font-semibold text-slate-800">Search</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 ${theme.borderStrong} ${theme.focus}`}
      />
    </label>
  );
}

function searchOrders(orders: OrderResponse[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return orders;
  }
  return orders.filter((order) =>
    [
      order.id,
      order.customerId,
      formatDisplayId(order.id, "Order"),
      order.merchantName,
      order.driverName,
      order.driverEmail,
      formatOrderStatus(order.status),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
  );
}

function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  tone = "neutral",
}: {
  value: T;
  onChange: (value: T) => void;
  options: T[];
  tone?: "neutral" | PortalKind;
}) {
  const theme = resolvePortalTone(tone);
  return (
    <div className={`flex flex-wrap gap-1 rounded-lg border p-1 ${
      theme ? `${theme.borderStrong} ${theme.surface}` : "border-slate-200 bg-slate-50"
    }`}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            option === value
              ? "bg-white text-slate-950 shadow-sm"
              : theme
                ? `${theme.accentText} hover:${theme.accentSoftText}`
                : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {formatFilterLabel(option)}
        </button>
      ))}
    </div>
  );
}

function DetailGrid({ fields, tone = "neutral" }: { fields: Array<[string, React.ReactNode]>; tone?: "neutral" | PortalKind }) {
  const theme = resolvePortalTone(tone);
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className={`rounded-lg border p-3 ${theme ? theme.detail : "border-slate-200 bg-slate-50"}`}>
          <dt className={`text-xs font-semibold uppercase ${theme ? theme.accentText : "text-slate-500"}`}>{label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value || "Not available"}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailLink({ href, label, tone = "neutral" }: { href: string; label: string; tone?: "neutral" | PortalKind }) {
  const theme = resolvePortalTone(tone);
  return (
    <Link
      href={href}
      className={`inline-flex w-fit items-center justify-center rounded-lg border bg-white px-3 py-2 text-sm font-semibold transition ${
        theme
          ? `${theme.borderStrong} ${theme.accentSoftText} ${theme.brandHover}`
          : "border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function OrderTimeline({ order, tone = "neutral" }: { order: OrderResponse; tone?: "neutral" | PortalKind }) {
  const history = Array.isArray(order.history) ? order.history : [];
  const steps: OrderStatus[] =
    order.status === "CANCELLED"
      ? ["PLACED", "CANCELLED"]
      : ["PLACED", "DRIVER_ASSIGNED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "ON_THE_WAY", "DELIVERED"];
  const currentIndex = steps.indexOf(order.status);

  if (history.length > 0) {
    return (
      <div className="grid gap-3">
        {history.map((item) => (
          <TimelineItem
            key={item.id}
            status={item.toStatus}
            timestamp={item.createdAt}
            actor={formatStatusLabel(item.actorType)}
            reason={item.reason}
            completed
            tone={tone}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {steps.map((step, index) => {
        const completed = order.status === "CANCELLED" ? step === "PLACED" || step === "CANCELLED" : currentIndex >= index;
        return (
          <TimelineItem
            key={step}
            status={step}
            timestamp={completed && step === order.status ? order.createdAt : null}
            actor={completed ? "System" : undefined}
            completed={completed}
            tone={tone}
          />
        );
      })}
    </div>
  );
}

function TimelineItem({
  status,
  timestamp,
  actor,
  reason,
  completed,
  tone,
}: {
  status: OrderStatus;
  timestamp?: string | null;
  actor?: string;
  reason?: string | null;
  completed: boolean;
  tone: "neutral" | PortalKind;
}) {
  const theme = resolvePortalTone(tone);
  return (
    <div className={`rounded-lg border p-3 ${
      completed
        ? theme?.timeline ?? "border-blue-200 bg-blue-50"
        : "border-slate-200 bg-slate-50"
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={status} label={formatOrderStatus(status)} />
        <span className="text-xs text-slate-500">{timestamp ? formatDateTime(timestamp) : "Not available"}</span>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        Actor: <span className="font-medium text-slate-700">{actor ?? "Not available"}</span>
      </div>
      {reason ? <p className="mt-2 rounded-md bg-white px-2 py-1 text-sm text-slate-700">{reason}</p> : null}
    </div>
  );
}

function resolvePortalTone(tone: "neutral" | PortalKind) {
  return tone === "neutral" ? null : getPortalTheme(tone);
}

function CancelOrderModal({
  order,
  theme,
  loading,
  onClose,
  onSubmit,
}: {
  order: OrderResponse | null;
  theme: PortalKind;
  loading: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();
  const reasonValid = trimmedReason.length >= 5 && trimmedReason.length <= 500;

  useEffect(() => {
    if (order) {
      const timer = window.setTimeout(() => setReason(""), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [order]);

  if (!order) {
    return null;
  }
  const portalTheme = getPortalTheme(theme);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <section className={`w-full max-w-lg overflow-hidden rounded-lg border bg-white shadow-2xl shadow-slate-950/20 ${portalTheme.border}`}>
        <div className={`border-b px-5 py-4 ${portalTheme.border} ${portalTheme.surface}`}>
          <div className={`text-xs font-semibold uppercase ${portalTheme.accentText}`}>Order action</div>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Cancel order</h2>
          <p className={`mt-1 text-sm leading-6 ${portalTheme.accentSoftText}`}>
            Provide a cancellation reason before cancelling {formatDisplayId(order.id, "Order")}.
          </p>
        </div>
        <div className="p-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={loading}
              rows={4}
              maxLength={500}
              className="mt-1 w-full resize-none rounded-lg border border-rose-200 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>
          <div className="mt-1 text-xs text-slate-500">{trimmedReason.length}/500 characters</div>
          <div className="mt-5 flex justify-end gap-2">
            <SecondaryButton type="button" disabled={loading} onClick={onClose}>
              Close
            </SecondaryButton>
            <Button
              type="button"
              className="border-rose-600 bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
              disabled={loading || !reasonValid}
              onClick={() => void onSubmit(trimmedReason)}
            >
              {loading ? "Cancelling..." : "Cancel order"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function filterMerchantOrders(
  orders: OrderResponse[],
  filter: "new" | "preparing" | "ready" | "courier" | "completed" | "cancelled",
) {
  if (filter === "new") {
    return orders.filter((order) => order.status === "PLACED" || order.status === "DRIVER_ASSIGNED");
  }
  if (filter === "preparing") {
    return orders.filter((order) => order.status === "PREPARING");
  }
  if (filter === "ready") {
    return orders.filter((order) => order.status === "READY_FOR_PICKUP");
  }
  if (filter === "courier") {
    return orders.filter((order) => order.status === "PICKED_UP" || order.status === "ON_THE_WAY");
  }
  if (filter === "completed") {
    return orders.filter((order) => order.status === "DELIVERED");
  }
  return orders.filter((order) => order.status === "CANCELLED");
}

function filterCourierAssignments(assignments: OrderResponse[], filter: CourierAssignmentFilter) {
  if (filter === "active") {
    return assignments.filter((assignment) => activeCourierStatuses.includes(assignment.status));
  }
  if (filter === "ready") {
    return assignments.filter((assignment) => assignment.status === "READY_FOR_PICKUP");
  }
  if (filter === "picked-up") {
    return assignments.filter((assignment) => assignment.status === "PICKED_UP");
  }
  if (filter === "on-the-way") {
    return assignments.filter((assignment) => assignment.status === "ON_THE_WAY");
  }
  if (filter === "delivered") {
    return assignments.filter((assignment) => assignment.status === "DELIVERED");
  }
  return assignments;
}

function computeAnalytics(orders: OrderResponse[]) {
  const revenueTotal = orders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
  const statusCounts = orders.reduce<Record<string, number>>((counts, order) => {
    counts[order.status] = (counts[order.status] ?? 0) + 1;
    return counts;
  }, {});

  return {
    totalOrders: orders.length,
    activeOrders: orders.filter((order) => activeCustomerStatuses.includes(order.status)).length,
    deliveredOrders: orders.filter((order) => order.status === "DELIVERED").length,
    revenueTotal,
    averageOrderValue: orders.length > 0 ? revenueTotal / orders.length : 0,
    statusDistribution: Object.entries(statusCounts),
  };
}

function formatFilterLabel(value: string) {
  const labels: Record<string, string> = {
    all: "All",
    active: "Active",
    delivered: "Delivered",
    cancelled: "Cancelled",
    new: "New",
    preparing: "Preparing",
    ready: "Ready for pickup",
    courier: "With courier",
    completed: "Completed",
    "picked-up": "Picked up",
    "on-the-way": "On the way",
  };
  return labels[value] ?? value;
}

function formatRole(role: UserRole) {
  return role === "DRIVER" ? "Courier" : formatStatusLabel(role);
}

function formatCustomerDisplayName(email?: string | null) {
  if (!email) {
    return "Not available";
  }

  const localPart = email.split("@")[0]?.trim();
  if (!localPart) {
    return "Not available";
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ") || "Not available";
}

function formatDateTimeOrNA(value?: string | null) {
  return value ? formatDateTime(value) : "Not available";
}

function formatCount(value?: number | null) {
  return new Intl.NumberFormat().format(Number(value ?? 0));
}

function formatLocation(latitude?: number | null, longitude?: number | null) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return "Not available";
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
