"use client";

import type React from "react";
import { useEffect } from "react";
import { getPortalTheme } from "@/lib/portal-theme";

type AdminModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";
  closeOnOverlayClick?: boolean;
};

const maxWidthClass = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function AdminModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "md",
  closeOnOverlayClick = true,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }
  const theme = getPortalTheme("admin");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm"
      onMouseDown={() => {
        if (closeOnOverlayClick) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-modal="true"
        role="dialog"
        aria-labelledby="admin-modal-title"
        className={`max-h-[calc(100vh-3rem)] w-full ${maxWidthClass[maxWidth]} overflow-hidden rounded-xl border bg-white shadow-xl shadow-slate-950/20 ${theme.borderStrong}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 ${theme.border} ${theme.surface}`}>
          <div>
            <h2 id="admin-modal-title" className="text-lg font-semibold text-slate-950">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg leading-none text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
          >
            X
          </button>
        </header>

        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer ? <footer className="px-5 pb-5">{footer}</footer> : null}
      </section>
    </div>
  );
}
