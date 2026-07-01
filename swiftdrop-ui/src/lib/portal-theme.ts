export type PortalThemeKey = "customer" | "merchant" | "courier" | "admin";

type PortalTheme = {
  label: string;
  accent: string;
  accentText: string;
  accentSoftText: string;
  border: string;
  borderStrong: string;
  surface: string;
  surfaceStrong: string;
  shell: string;
  sidebar: string;
  sidebarBorder: string;
  navActive: string;
  navHover: string;
  brandHover: string;
  header: string;
  button: string;
  buttonSoft: string;
  focus: string;
  card: string;
  metric: string;
  table: {
    wrapper: string;
    head: string;
    body: string;
    row: string;
    empty: string;
  };
  detail: string;
  timeline: string;
};

export const portalThemes: Record<PortalThemeKey, PortalTheme> = {
  customer: {
    label: "Customer",
    accent: "bg-blue-600",
    accentText: "text-blue-700",
    accentSoftText: "text-blue-900",
    border: "border-blue-100",
    borderStrong: "border-blue-200",
    surface: "bg-blue-50",
    surfaceStrong: "bg-blue-100",
    shell: "bg-blue-50",
    sidebar: "bg-white/95",
    sidebarBorder: "border-blue-100",
    navActive: "border-blue-200 bg-blue-50 text-blue-800",
    navHover: "border-transparent text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900",
    brandHover: "hover:bg-blue-50",
    header: "border-blue-100 bg-white/90 backdrop-blur",
    button: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    buttonSoft: "border-blue-200 bg-white text-blue-800 hover:bg-blue-50 focus:ring-blue-500",
    focus: "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
    card: "border-blue-100 bg-white/95 shadow-sm shadow-blue-100/70",
    metric: "border-blue-200 bg-blue-50 shadow-blue-100/80 text-blue-950",
    table: {
      wrapper: "border-blue-100 bg-white shadow-sm shadow-blue-100/70",
      head: "border-b border-blue-100 bg-blue-50/80",
      body: "divide-y divide-blue-50 bg-white",
      row: "hover:bg-blue-50/50",
      empty: "border-blue-200 bg-blue-50/60",
    },
    detail: "border-blue-100 bg-blue-50/70",
    timeline: "border-blue-200 bg-blue-50",
  },
  merchant: {
    label: "Merchant",
    accent: "bg-violet-600",
    accentText: "text-violet-700",
    accentSoftText: "text-violet-900",
    border: "border-violet-100",
    borderStrong: "border-violet-200",
    surface: "bg-violet-50",
    surfaceStrong: "bg-violet-100",
    shell: "bg-violet-50",
    sidebar: "bg-white/95",
    sidebarBorder: "border-violet-100",
    navActive: "border-violet-200 bg-violet-50 text-violet-800",
    navHover: "border-transparent text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-900",
    brandHover: "hover:bg-violet-50",
    header: "border-violet-100 bg-white/90 backdrop-blur",
    button: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500",
    buttonSoft: "border-violet-200 bg-white text-violet-800 hover:bg-violet-50 focus:ring-violet-500",
    focus: "focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20",
    card: "border-violet-100 bg-white/95 shadow-sm shadow-violet-100/70",
    metric: "border-violet-200 bg-violet-50 shadow-violet-100/80 text-violet-950",
    table: {
      wrapper: "border-violet-100 bg-white shadow-sm shadow-violet-100/70",
      head: "border-b border-violet-100 bg-violet-50/80",
      body: "divide-y divide-violet-50 bg-white",
      row: "hover:bg-violet-50/50",
      empty: "border-violet-200 bg-violet-50/60",
    },
    detail: "border-violet-100 bg-violet-50/70",
    timeline: "border-violet-200 bg-violet-50",
  },
  courier: {
    label: "Courier",
    accent: "bg-emerald-600",
    accentText: "text-emerald-700",
    accentSoftText: "text-emerald-900",
    border: "border-emerald-100",
    borderStrong: "border-emerald-200",
    surface: "bg-emerald-50",
    surfaceStrong: "bg-emerald-100",
    shell: "bg-emerald-50",
    sidebar: "bg-white/95",
    sidebarBorder: "border-emerald-100",
    navActive: "border-emerald-200 bg-emerald-50 text-emerald-800",
    navHover: "border-transparent text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900",
    brandHover: "hover:bg-emerald-50",
    header: "border-emerald-100 bg-white/90 backdrop-blur",
    button: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
    buttonSoft: "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 focus:ring-emerald-500",
    focus: "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
    card: "border-emerald-100 bg-white/95 shadow-sm shadow-emerald-100/70",
    metric: "border-emerald-200 bg-emerald-50 shadow-emerald-100/80 text-emerald-950",
    table: {
      wrapper: "border-emerald-100 bg-white shadow-sm shadow-emerald-100/70",
      head: "border-b border-emerald-100 bg-emerald-50/80",
      body: "divide-y divide-emerald-50 bg-white",
      row: "hover:bg-emerald-50/50",
      empty: "border-emerald-200 bg-emerald-50/60",
    },
    detail: "border-emerald-100 bg-emerald-50/70",
    timeline: "border-emerald-200 bg-emerald-50",
  },
  admin: {
    label: "Operations",
    accent: "bg-slate-900",
    accentText: "text-slate-800",
    accentSoftText: "text-slate-900",
    border: "border-slate-200",
    borderStrong: "border-slate-300",
    surface: "bg-slate-100",
    surfaceStrong: "bg-slate-200",
    shell: "bg-slate-50",
    sidebar: "bg-white",
    sidebarBorder: "border-slate-200",
    navActive: "border-slate-300 bg-slate-100 text-slate-950",
    navHover: "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950",
    brandHover: "hover:bg-slate-50",
    header: "border-slate-200 bg-white/95 backdrop-blur",
    button: "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500",
    buttonSoft: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500",
    focus: "focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20",
    card: "border-slate-200 bg-white shadow-sm shadow-slate-200/70",
    metric: "border-slate-200 bg-slate-50 shadow-slate-200/80 text-slate-950",
    table: {
      wrapper: "border-slate-200 bg-white shadow-sm",
      head: "border-b border-slate-200 bg-slate-100/80",
      body: "divide-y divide-slate-100 bg-white",
      row: "hover:bg-slate-50/80",
      empty: "border-slate-200 bg-slate-50/80",
    },
    detail: "border-slate-200 bg-slate-50",
    timeline: "border-slate-200 bg-slate-50",
  },
};

export function getPortalTheme(theme: PortalThemeKey) {
  return portalThemes[theme];
}
