import type React from "react";

type ModalFooterProps = {
  children: React.ReactNode;
};

export function ModalFooter({ children }: ModalFooterProps) {
  return <div className="flex flex-wrap justify-end gap-3">{children}</div>;
}
