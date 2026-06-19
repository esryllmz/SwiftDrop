"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  type ApplicationStatus,
  type ApplicationSubmitError,
  type CourierApplicationResponse,
  type VehicleType,
  type MerchantApplicationResponse,
  submitCourierApplication,
  submitMerchantApplication,
} from "@/lib/applications";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

type ModalKind = "merchant" | "courier";

type PublicApplicationModalProps = {
  kind: ModalKind;
  onClose: () => void;
};

const vehicleTypes: Array<{ value: VehicleType; label: string }> = [
  { value: "MOTORBIKE", label: "Motorbike" },
  { value: "CAR", label: "Car" },
  { value: "BICYCLE", label: "Bicycle" },
  { value: "WALKING", label: "Walking" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MerchantForm = {
  businessName: string;
  contactEmail: string;
  message: string;
};

type CourierForm = {
  fullName: string;
  contactEmail: string;
  vehicleType: VehicleType;
  message: string;
};

type SubmitResult =
  | {
      status: ApplicationStatus;
      message: string;
    }
  | null;

export function PublicApplicationModal({ kind, onClose }: PublicApplicationModalProps) {
  const [merchantForm, setMerchantForm] = useState<MerchantForm>({
    businessName: "",
    contactEmail: "",
    message: "",
  });
  const [courierForm, setCourierForm] = useState<CourierForm>({
    fullName: "",
    contactEmail: "",
    vehicleType: "MOTORBIKE",
    message: "",
  });
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMerchant = kind === "merchant";
  const theme = isMerchant ? merchantTheme : courierTheme;
  const title = isMerchant ? "Request Merchant Access" : "Apply as Courier";
  const description = isMerchant
    ? "Share your store details for operations review."
    : "Send your courier application for operations review.";

  const canSubmit = useMemo(() => {
    if (isMerchant) {
      return Boolean(
        merchantForm.businessName.trim() &&
          emailPattern.test(merchantForm.contactEmail.trim()),
      );
    }

    return Boolean(
      courierForm.fullName.trim() &&
        emailPattern.test(courierForm.contactEmail.trim()) &&
        courierForm.vehicleType,
    );
  }, [courierForm, isMerchant, merchantForm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setSubmitError(null);

    const validationError = validateForm(kind, merchantForm, courierForm);
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isMerchant) {
        const response = await submitMerchantApplication({
          businessName: merchantForm.businessName.trim(),
          contactEmail: merchantForm.contactEmail.trim(),
          message: optionalText(merchantForm.message),
        });
        setResult(toMerchantResult(response));
        showSuccessToast("Merchant access request submitted.");
      } else {
        const response = await submitCourierApplication({
          fullName: courierForm.fullName.trim(),
          contactEmail: courierForm.contactEmail.trim(),
          vehicleType: courierForm.vehicleType,
          message: optionalText(courierForm.message),
        });
        setResult(toCourierResult(response));
        showSuccessToast("Courier application submitted.");
      }
    } catch (error) {
      const message = resolveSubmitError(error);
      setSubmitError(message);
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-application-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className={`h-1 ${theme.rule}`} aria-hidden="true" />
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>
                {isMerchant ? "MERCHANT" : "COURIER"}
              </span>
              <h2
                id="public-application-title"
                className="mt-3 text-lg font-semibold text-slate-950"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-label="Close modal"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {result ? (
          <div className="px-6 py-6">
            <div className={`rounded-lg border px-4 py-4 ${theme.successBox}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">{result.message}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>
                  {result.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                We will review your request.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`mt-5 flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition ${theme.primary}`}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6">
            <div className="space-y-4">
              {isMerchant ? (
                <>
                  <TextField
                    label="Business name"
                    value={merchantForm.businessName}
                    onChange={(value) =>
                      setMerchantForm((current) => ({ ...current, businessName: value }))
                    }
                    autoComplete="organization"
                  />
                  <TextField
                    label="Contact email"
                    value={merchantForm.contactEmail}
                    onChange={(value) =>
                      setMerchantForm((current) => ({ ...current, contactEmail: value }))
                    }
                    autoComplete="email"
                    inputMode="email"
                  />
                  <TextArea
                    label="Message"
                    value={merchantForm.message}
                    onChange={(value) =>
                      setMerchantForm((current) => ({ ...current, message: value }))
                    }
                    placeholder="Tell us about your store and delivery needs."
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Full name"
                    value={courierForm.fullName}
                    onChange={(value) =>
                      setCourierForm((current) => ({ ...current, fullName: value }))
                    }
                    autoComplete="name"
                  />
                  <TextField
                    label="Contact email"
                    value={courierForm.contactEmail}
                    onChange={(value) =>
                      setCourierForm((current) => ({ ...current, contactEmail: value }))
                    }
                    autoComplete="email"
                    inputMode="email"
                  />
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Vehicle type</span>
                    <select
                      value={courierForm.vehicleType}
                      onChange={(event) =>
                        setCourierForm((current) => ({
                          ...current,
                          vehicleType: event.target.value as VehicleType,
                        }))
                      }
                      className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      {vehicleTypes.map((vehicleType) => (
                        <option key={vehicleType.value} value={vehicleType.value}>
                          {vehicleType.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextArea
                    label="Message"
                    value={courierForm.message}
                    onChange={(value) =>
                      setCourierForm((current) => ({ ...current, message: value }))
                    }
                    placeholder="Tell us about your delivery experience."
                  />
                </>
              )}
            </div>

            {(fieldError || submitError) && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {fieldError ?? submitError}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !canSubmit}
                className={`flex h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${theme.primary}`}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  inputMode?: "email";
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function validateForm(kind: ModalKind, merchantForm: MerchantForm, courierForm: CourierForm) {
  const email = kind === "merchant" ? merchantForm.contactEmail : courierForm.contactEmail;
  if (kind === "merchant" && !merchantForm.businessName.trim()) {
    return "Business name is required.";
  }
  if (kind === "courier" && !courierForm.fullName.trim()) {
    return "Full name is required.";
  }
  if (!email.trim()) {
    return "Contact email is required.";
  }
  if (!emailPattern.test(email.trim())) {
    return "Enter a valid contact email.";
  }
  if (kind === "courier" && !courierForm.vehicleType) {
    return "Vehicle type is required.";
  }
  return null;
}

function optionalText(value: string) {
  const next = value.trim();
  return next ? next : undefined;
}

function toMerchantResult(response: MerchantApplicationResponse): SubmitResult {
  return {
    status: response.status,
    message: "Your merchant access request was submitted. Our operations team will review it.",
  };
}

function toCourierResult(response: CourierApplicationResponse): SubmitResult {
  return {
    status: response.status,
    message: "Your courier application was submitted. Operations will review it.",
  };
}

function resolveSubmitError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return (error as ApplicationSubmitError).message;
  }

  return "Application service is not reachable.";
}

const merchantTheme = {
  primary: "bg-violet-600 hover:bg-violet-700 focus:ring-violet-500",
  badge: "bg-violet-100 text-violet-700",
  successBox: "border-violet-200 bg-violet-50",
  rule: "bg-violet-600",
};

const courierTheme = {
  primary: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
  badge: "bg-emerald-100 text-emerald-700",
  successBox: "border-emerald-200 bg-emerald-50",
  rule: "bg-emerald-600",
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
