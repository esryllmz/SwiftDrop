import type React from "react";
import { formatStatusLabel, statusBadgeClass } from "@/lib/format";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 ${className}`}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-1 text-xs font-medium ${statusBadgeClass(status)}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export function LoadingState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 shadow-sm">
      Loading...
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
      {message}
    </div>
  );
}

export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}
