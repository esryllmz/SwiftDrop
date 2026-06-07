import type React from "react";

type DetailGridProps = {
  children: React.ReactNode;
  columns?: 1 | 2;
};

export function DetailGrid({ children, columns = 2 }: DetailGridProps) {
  return (
    <div
      className={`grid gap-3 ${
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"
      }`}
    >
      {children}
    </div>
  );
}
