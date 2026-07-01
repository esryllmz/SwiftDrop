"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentPropsWithoutRef } from "react";

type PasswordInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "value" | "onChange"
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  focusRingClassName?: string;
};

export function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  disabled,
  error,
  className = "",
  focusRingClassName = "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20",
  ...props
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="relative mt-1 block">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId}
          className={`w-full rounded-lg border bg-white px-3 py-2 pr-11 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
              : focusRingClassName
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>
      {error ? (
        <span id={errorId} className="mt-1 block text-xs font-medium text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
