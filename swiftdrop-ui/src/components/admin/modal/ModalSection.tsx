import type React from "react";

type ModalSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export function ModalSection({ title, description, children }: ModalSectionProps) {
  return (
    <section className="grid gap-3">
      {title || description ? (
        <div>
          {title ? (
            <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          ) : null}
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
