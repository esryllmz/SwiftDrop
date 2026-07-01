import { getPortalTheme } from "@/lib/portal-theme";

export function AdminFilterPills<T extends string>({
  items,
  selected,
  getLabel,
  onSelect,
  tone = "slate",
}: {
  items: readonly T[];
  selected: T;
  getLabel?: (item: T) => string;
  onSelect: (item: T) => void;
  tone?: "blue" | "violet" | "emerald" | "amber" | "slate";
}) {
  const theme = getPortalTheme("admin");
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected === item;

        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? activeToneClass[tone]
                : `${theme.buttonSoft} text-slate-600`
            }`}
          >
            {getLabel ? getLabel(item) : item}
          </button>
        );
      })}
    </div>
  );
}

const activeToneClass = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  slate: "border-slate-300 bg-slate-100 text-slate-950",
};
