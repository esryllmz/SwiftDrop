"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminModal,
  AdvancedDetails,
  DetailField,
  DetailGrid,
  JsonPreview,
  ModalFooter,
  ModalSection,
} from "@/components/admin/modal";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SecondaryButton,
} from "@/components/ui";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  approveCourierApplication,
  approveMerchantApplication,
  getCourierApplications,
  getMerchantApplications,
  rejectCourierApplication,
  rejectMerchantApplication,
} from "@/lib/adminApplications";
import { formatDateTime } from "@/lib/format";
import type {
  CourierApplicationResponse,
  MerchantApplicationResponse,
  ProvisionedAccountResponse,
  VehicleType,
} from "@/types/api";

const statusFilters = ["All", "PENDING", "APPROVED", "REJECTED"] as const;
type StatusFilter = (typeof statusFilters)[number];
type ActiveTab = "merchant" | "courier";
type ApplicationRecord = MerchantApplicationResponse | CourierApplicationResponse;
type ReviewAction = "approve" | "reject";

type DetailSelection =
  | { kind: "merchant"; application: MerchantApplicationResponse }
  | { kind: "courier"; application: CourierApplicationResponse }
  | null;

type ReviewSelection =
  | { kind: "merchant"; action: ReviewAction; application: MerchantApplicationResponse }
  | { kind: "courier"; action: ReviewAction; application: CourierApplicationResponse }
  | null;

type ApprovalSuccessSelection =
  | {
      kind: "merchant";
      application: MerchantApplicationResponse;
      provisionedAccount: ProvisionedAccountResponse | null;
    }
  | {
      kind: "courier";
      application: CourierApplicationResponse;
      provisionedAccount: ProvisionedAccountResponse | null;
    }
  | null;

export default function UsersApprovalsPage() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("merchant");
  const [merchantStatus, setMerchantStatus] = useState<StatusFilter>("All");
  const [courierStatus, setCourierStatus] = useState<StatusFilter>("All");
  const [merchants, setMerchants] = useState<MerchantApplicationResponse[]>([]);
  const [couriers, setCouriers] = useState<CourierApplicationResponse[]>([]);
  const [allMerchants, setAllMerchants] = useState<MerchantApplicationResponse[]>([]);
  const [allCouriers, setAllCouriers] = useState<CourierApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [detailSelection, setDetailSelection] = useState<DetailSelection>(null);
  const [reviewSelection, setReviewSelection] = useState<ReviewSelection>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<ApprovalSuccessSelection>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allMerchantApplications, allCourierApplications, merchantApplications, courierApplications] = await Promise.all([
        getMerchantApplications(accessToken),
        getCourierApplications(accessToken),
        merchantStatus === "All"
          ? getMerchantApplications(accessToken)
          : getMerchantApplications(accessToken, merchantStatus),
        courierStatus === "All"
          ? getCourierApplications(accessToken)
          : getCourierApplications(accessToken, courierStatus),
      ]);
      setAllMerchants(allMerchantApplications);
      setAllCouriers(allCourierApplications);
      setMerchants(merchantApplications);
      setCouriers(courierApplications);
    } catch (err) {
      setError(resolveLoadError(err));
    } finally {
      setLoading(false);
    }
  }, [accessToken, courierStatus, merchantStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const summary = useMemo(() => {
    const applications: ApplicationRecord[] = [...allMerchants, ...allCouriers];
    return {
      pendingMerchants: allMerchants.filter((application) => application.status === "PENDING").length,
      pendingCouriers: allCouriers.filter((application) => application.status === "PENDING").length,
      approved: applications.filter((application) => application.status === "APPROVED").length,
      rejected: applications.filter((application) => application.status === "REJECTED").length,
    };
  }, [allCouriers, allMerchants]);

  const selectedStatus = activeTab === "merchant" ? merchantStatus : courierStatus;

  function updateSelectedStatus(status: StatusFilter) {
    if (activeTab === "merchant") {
      setMerchantStatus(status);
    } else {
      setCourierStatus(status);
    }
  }

  function openReview(selection: ReviewSelection) {
    setReviewSelection(selection);
    setReviewNote("");
    setReviewError(null);
  }

  function closeApprovalSuccess() {
    setApprovalSuccess(null);
    setPasswordCopied(false);
    setCopyError(null);
  }

  async function copyTemporaryPassword(password: string) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(password);
      setPasswordCopied(true);
      showSuccessToast("Temporary password copied.");
      window.setTimeout(() => setPasswordCopied(false), 1800);
    } catch {
      const message = "Unable to copy password.";
      setCopyError(message);
      showErrorToast(message);
    }
  }

  async function submitReview() {
    if (!reviewSelection) {
      return;
    }

    setReviewing(true);
    setReviewError(null);
    try {
      if (reviewSelection.kind === "merchant") {
        if (reviewSelection.action === "approve") {
          const response = await approveMerchantApplication(
            accessToken,
            reviewSelection.application.id,
            reviewNote,
          );
          updateMerchantApplication(response.application);
          setApprovalSuccess({
            kind: "merchant",
            application: response.application,
            provisionedAccount: response.provisionedAccount ?? null,
          });
        } else {
          const application = await rejectMerchantApplication(
            accessToken,
            reviewSelection.application.id,
            reviewNote,
          );
          updateMerchantApplication(application);
        }
      } else if (reviewSelection.action === "approve") {
        const response = await approveCourierApplication(
          accessToken,
          reviewSelection.application.id,
          reviewNote,
        );
        updateCourierApplication(response.application);
        setApprovalSuccess({
          kind: "courier",
          application: response.application,
          provisionedAccount: response.provisionedAccount ?? null,
        });
      } else {
        const application = await rejectCourierApplication(
          accessToken,
          reviewSelection.application.id,
          reviewNote,
        );
        updateCourierApplication(application);
      }

      setReviewSelection(null);
      setReviewNote("");
      showSuccessToast("Application review saved.");
      await load();
    } catch (err) {
      const message = resolveReviewError(err);
      setReviewError(message);
      showErrorToast(message);
    } finally {
      setReviewing(false);
    }
  }

  function updateMerchantApplication(application: MerchantApplicationResponse) {
    setAllMerchants((current) => replaceById(current, application));
    setMerchants((current) => replaceById(current, application));
  }

  function updateCourierApplication(application: CourierApplicationResponse) {
    setAllCouriers((current) => replaceById(current, application));
    setCouriers((current) => replaceById(current, application));
  }

  return (
    <div>
      <AdminPageHeader
        icon="UA"
        title="Users & Approvals"
        description="Merchant and courier onboarding."
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton disabled={loading} onClick={() => void load()}>
              Refresh
            </SecondaryButton>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Pending Merchant Applications" value={summary.pendingMerchants} tone="amber" icon="M" />
        <AdminMetricCard label="Pending Courier Applications" value={summary.pendingCouriers} tone="amber" icon="C" />
        <AdminMetricCard label="Approved Applications" value={summary.approved} tone="emerald" icon="A" />
        <AdminMetricCard label="Rejected Applications" value={summary.rejected} tone="red" icon="R" />
      </div>

      <AdminSectionCard
        className="mt-4"
        title="Application Review Queue"
        description="Review pending applications and inspect prior decisions."
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <TabButton
                active={activeTab === "merchant"}
                label="Merchant Applications"
                onClick={() => setActiveTab("merchant")}
              />
              <TabButton
                active={activeTab === "courier"}
                label="Courier Applications"
                onClick={() => setActiveTab("courier")}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => (
                <SecondaryButton
                  key={status}
                  onClick={() => updateSelectedStatus(status)}
                  className={
                    selectedStatus === status
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : ""
                  }
                >
                  {status}
                </SecondaryButton>
              ))}
            </div>
          </div>
        }
      >

        <div className="mt-4">
          {loading ? <LoadingState /> : null}
          {error ? <ErrorState message={error} /> : null}
          {!loading && !error && activeTab === "merchant" ? (
            <MerchantApplicationsTable
              applications={merchants}
              onView={(application) => setDetailSelection({ kind: "merchant", application })}
              onApprove={(application) =>
                openReview({ kind: "merchant", action: "approve", application })
              }
              onReject={(application) =>
                openReview({ kind: "merchant", action: "reject", application })
              }
            />
          ) : null}
          {!loading && !error && activeTab === "courier" ? (
            <CourierApplicationsTable
              applications={couriers}
              onView={(application) => setDetailSelection({ kind: "courier", application })}
              onApprove={(application) =>
                openReview({ kind: "courier", action: "approve", application })
              }
              onReject={(application) =>
                openReview({ kind: "courier", action: "reject", application })
              }
            />
          ) : null}
        </div>
      </AdminSectionCard>

      <ApplicationDetailModal
        selection={detailSelection}
        onClose={() => setDetailSelection(null)}
      />

      <ReviewModal
        selection={reviewSelection}
        note={reviewNote}
        error={reviewError}
        reviewing={reviewing}
        onNoteChange={setReviewNote}
        onClose={() => {
          if (!reviewing) {
            setReviewSelection(null);
            setReviewNote("");
            setReviewError(null);
          }
        }}
        onSubmit={() => void submitReview()}
      />

      <ApprovalSuccessModal
        selection={approvalSuccess}
        copied={passwordCopied}
        copyError={copyError}
        onCopy={(password) => void copyTemporaryPassword(password)}
        onClose={closeApprovalSuccess}
      />
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-950"
      }`}
    >
      {label}
    </button>
  );
}

function MerchantApplicationsTable({
  applications,
  onView,
  onApprove,
  onReject,
}: {
  applications: MerchantApplicationResponse[];
  onView: (application: MerchantApplicationResponse) => void;
  onApprove: (application: MerchantApplicationResponse) => void;
  onReject: (application: MerchantApplicationResponse) => void;
}) {
  if (applications.length === 0) {
    return <EmptyState message="No merchant applications found." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            {["Business Name", "Contact Email", "Status", "Created At", "Reviewed At", "Actions"].map(
              (heading) => (
                <th key={heading} className="px-3 py-2 font-medium">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {applications.map((application) => (
            <tr key={application.id} className="align-top transition hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-900">
                {application.businessName}
              </td>
              <td className="px-3 py-2 text-slate-700">{application.contactEmail}</td>
              <td className="px-3 py-2">
                <AdminStatusBadge status={application.status} />
              </td>
              <td className="px-3 py-2 text-slate-700">
                {formatDateTime(application.createdAt)}
              </td>
              <td className="px-3 py-2 text-slate-700">
                {formatDateTime(application.reviewedAt)}
              </td>
              <td className="px-3 py-2">
                <ActionButtons
                  pending={application.status === "PENDING"}
                  onView={() => onView(application)}
                  onApprove={() => onApprove(application)}
                  onReject={() => onReject(application)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CourierApplicationsTable({
  applications,
  onView,
  onApprove,
  onReject,
}: {
  applications: CourierApplicationResponse[];
  onView: (application: CourierApplicationResponse) => void;
  onApprove: (application: CourierApplicationResponse) => void;
  onReject: (application: CourierApplicationResponse) => void;
}) {
  if (applications.length === 0) {
    return <EmptyState message="No courier applications found." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            {[
              "Full Name",
              "Contact Email",
              "Vehicle Type",
              "Status",
              "Created At",
              "Reviewed At",
              "Actions",
            ].map((heading) => (
              <th key={heading} className="px-3 py-2 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {applications.map((application) => (
            <tr key={application.id} className="align-top transition hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-900">{application.fullName}</td>
              <td className="px-3 py-2 text-slate-700">{application.contactEmail}</td>
              <td className="px-3 py-2 text-slate-700">
                {vehicleTypeLabel(application.vehicleType)}
              </td>
              <td className="px-3 py-2">
                <AdminStatusBadge status={application.status} />
              </td>
              <td className="px-3 py-2 text-slate-700">
                {formatDateTime(application.createdAt)}
              </td>
              <td className="px-3 py-2 text-slate-700">
                {formatDateTime(application.reviewedAt)}
              </td>
              <td className="px-3 py-2">
                <ActionButtons
                  pending={application.status === "PENDING"}
                  onView={() => onView(application)}
                  onApprove={() => onApprove(application)}
                  onReject={() => onReject(application)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionButtons({
  pending,
  onView,
  onApprove,
  onReject,
}: {
  pending: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <AdminButton type="button" variant="secondary" onClick={onView}>
        View
      </AdminButton>
      <AdminButton type="button" variant="success" disabled={!pending} onClick={onApprove}>
        Approve
      </AdminButton>
      <AdminButton type="button" variant="danger" disabled={!pending} onClick={onReject}>
        Reject
      </AdminButton>
    </div>
  );
}

function ApplicationDetailModal({
  selection,
  onClose,
}: {
  selection: DetailSelection;
  onClose: () => void;
}) {
  const application = selection?.application;
  const title = selection?.kind === "courier" ? "Courier Application" : "Merchant Application";

  return (
    <AdminModal
      open={Boolean(selection)}
      title={title}
      subtitle={application ? shortId(application.id) : undefined}
      onClose={onClose}
      maxWidth="lg"
      footer={
        <ModalFooter>
          <AdminButton type="button" variant="secondary" className="w-full" onClick={onClose}>
            Close
          </AdminButton>
        </ModalFooter>
      }
    >
      {selection ? (
        <div className="grid gap-4">
          <DetailGrid>
            {selection.kind === "merchant" ? (
              <DetailField label="Business Name" value={selection.application.businessName} />
            ) : (
              <DetailField label="Full Name" value={selection.application.fullName} />
            )}
            <DetailField label="Contact Email" value={selection.application.contactEmail} />
            {selection.kind === "courier" ? (
              <DetailField
                label="Vehicle Type"
                value={vehicleTypeLabel(selection.application.vehicleType)}
              />
            ) : null}
            <DetailField label="Status" value={<AdminStatusBadge status={selection.application.status} />} />
            <DetailField
              label="Created At"
              value={formatDateTime(selection.application.createdAt)}
            />
            <DetailField
              label="Reviewed At"
              value={formatDateTime(selection.application.reviewedAt)}
            />
            <DetailField label="Review Note" value={selection.application.reviewNote} />
            <DetailField label="Message" value={selection.application.message} />
            <DetailField
              label="Provisioned User ID"
              value={selection.application.provisionedUserId}
              mono
            />
          </DetailGrid>
          <AdvancedDetails>
            <JsonPreview value={selection.application} />
          </AdvancedDetails>
        </div>
      ) : null}
    </AdminModal>
  );
}

function ApprovalSuccessModal({
  selection,
  copied,
  copyError,
  onCopy,
  onClose,
}: {
  selection: ApprovalSuccessSelection;
  copied: boolean;
  copyError: string | null;
  onCopy: (password: string) => void;
  onClose: () => void;
}) {
  const account = selection?.provisionedAccount ?? null;
  const temporaryPassword = account?.created ? account.temporaryPassword : null;
  const hasTemporaryPassword = Boolean(temporaryPassword);
  const title = selection?.kind === "courier" ? "Courier approved" : "Merchant approved";

  return (
    <AdminModal
      open={Boolean(selection)}
      title={title}
      subtitle={selection ? shortId(selection.application.id) : undefined}
      onClose={onClose}
      maxWidth="lg"
      footer={
        <ModalFooter>
          {temporaryPassword ? (
            <AdminButton
              type="button"
              variant="primary"
              onClick={() => onCopy(temporaryPassword)}
            >
              {copied ? "Copied" : "Copy password"}
            </AdminButton>
          ) : null}
          <AdminButton type="button" variant="secondary" onClick={onClose}>
            Close
          </AdminButton>
        </ModalFooter>
      }
    >
      {selection ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
            <div className="text-sm font-medium text-emerald-900">
              Application approved successfully.
            </div>
            <AdminStatusBadge status="APPROVED" />
          </div>

          {account ? (
            <ModalSection title="Provisioned account">
              <DetailGrid>
                <DetailField label="Email" value={account.email} />
                <DetailField label="Role" value={account.role} />
                <DetailField label="User ID" value={account.userId} mono />
                <DetailField label="Created" value={account.created ? "Yes" : "No"} />
              </DetailGrid>
            </ModalSection>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Application was approved.
            </div>
          )}

          {account && !account.created ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Account already existed for this role. No new temporary password was generated.
            </div>
          ) : null}

          {hasTemporaryPassword && temporaryPassword ? (
            <ModalSection
              title="Temporary password"
              description="Temporary password is shown only once. The user must change this password on first sign-in."
            >
              <div className="grid gap-2">
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="break-all font-mono text-sm font-semibold text-slate-950">
                    {temporaryPassword}
                  </div>
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={() => onCopy(temporaryPassword)}
                  >
                    {copied ? "Copied" : "Copy temporary password"}
                  </AdminButton>
                </div>
                {copyError ? <ErrorState message={copyError} /> : null}
              </div>
            </ModalSection>
          ) : null}
        </div>
      ) : null}
    </AdminModal>
  );
}

function ReviewModal({
  selection,
  note,
  error,
  reviewing,
  onNoteChange,
  onClose,
  onSubmit,
}: {
  selection: ReviewSelection;
  note: string;
  error: string | null;
  reviewing: boolean;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const isApprove = selection?.action === "approve";
  const actionLabel = isApprove ? "Approve" : "Reject";

  return (
    <AdminModal
      open={Boolean(selection)}
      title={`${actionLabel} Application`}
      subtitle={selection ? shortId(selection.application.id) : undefined}
      onClose={onClose}
      closeOnOverlayClick={!reviewing}
      footer={
        <ModalFooter>
          <AdminButton type="button" variant="secondary" disabled={reviewing} onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton
            type="button"
            variant={isApprove ? "success" : "danger"}
            disabled={reviewing}
            onClick={onSubmit}
          >
            {reviewing ? "Saving..." : actionLabel}
          </AdminButton>
        </ModalFooter>
      }
    >
      <div className="grid gap-4">
        {selection ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            {actionLabel}{" "}
            <span className="font-semibold text-slate-950">
              {applicationName(selection.application)}
            </span>
            . This updates the application review status.
          </div>
        ) : null}
        {error ? <ErrorState message={error} /> : null}
        <ModalSection>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Review note</span>
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Optional note for the review history."
            />
          </label>
        </ModalSection>
      </div>
    </AdminModal>
  );
}

function resolveLoadError(error: unknown) {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    return "You are not authorized to view applications.";
  }

  return error instanceof Error ? error.message : "Unable to load applications.";
}

function resolveReviewError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "This application has already been reviewed.";
    }
    if ([502, 503, 504].includes(error.status)) {
      return "User provisioning is currently unavailable. The application was not approved.";
    }
    if (error.status === 404) {
      return "Application not found.";
    }
    if ([401, 403].includes(error.status)) {
      return "You are not authorized to review applications.";
    }
  }

  return "Unable to update application.";
}

function vehicleTypeLabel(value: VehicleType) {
  const labels: Record<VehicleType, string> = {
    MOTORBIKE: "Motorbike",
    CAR: "Car",
    BICYCLE: "Bicycle",
    WALKING: "Walking",
  };
  return labels[value];
}

function applicationName(application: ApplicationRecord) {
  return "businessName" in application ? application.businessName : application.fullName;
}

function shortId(value?: string) {
  if (!value) {
    return "-";
  }

  return value.length > 13 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function replaceById<T extends { id: string }>(items: T[], updatedItem: T) {
  return items.map((item) => (item.id === updatedItem.id ? updatedItem : item));
}
