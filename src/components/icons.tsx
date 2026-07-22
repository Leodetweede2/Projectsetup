import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/** Shared wrapper for a consistent (lucide-style) stroke icon set. */
function I({ children, ...p }: P & { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: P) => (
  <I {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </I>
);
export const IconMap = (p: P) => (
  <I {...p}>
    <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
    <circle cx="12" cy="11" r="2" />
  </I>
);
export const IconList = (p: P) => (
  <I {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </I>
);
export const IconFloorplan = (p: P) => (
  <I {...p}>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M3 10h7V3M14 3v7h7M10 21v-6h4" />
  </I>
);
export const IconImport = (p: P) => (
  <I {...p}>
    <path d="M12 3v12M8 11l4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </I>
);
export const IconUsers = (p: P) => (
  <I {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" />
  </I>
);
export const IconRoles = (p: P) => (
  <I {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
  </I>
);
export const IconAudit = (p: P) => (
  <I {...p}>
    <path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
    <path d="M14 2v6h6M9 13h6M9 17h4" />
  </I>
);
export const IconAccount = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </I>
);
export const IconSearch = (p: P) => (
  <I {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </I>
);
export const IconFilter = (p: P) => (
  <I {...p}>
    <path d="M3 5h18l-7 8v6l-4-2v-4z" />
  </I>
);
export const IconClose = (p: P) => (
  <I {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </I>
);
export const IconChevronRight = (p: P) => (
  <I {...p}>
    <path d="M9 6l6 6-6 6" />
  </I>
);
export const IconMenu = (p: P) => (
  <I {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </I>
);
export const IconBuilding = (p: P) => (
  <I {...p}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" />
  </I>
);
export const IconCpu = (p: P) => (
  <I {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1" />
    <path d="M9 9h6v6H9zM9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
  </I>
);
export const IconCheck = (p: P) => (
  <I {...p}>
    <path d="M20 6L9 17l-5-5" />
  </I>
);
export const IconClock = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </I>
);
export const IconInbox = (p: P) => (
  <I {...p}>
    <path d="M4 13h4l2 3h4l2-3h4" />
    <path d="M5 13l2-8h10l2 8v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
  </I>
);
export const IconCornerDownLeft = (p: P) => (
  <I {...p}>
    <path d="M9 10l-5 5 5 5" />
    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
  </I>
);

/** Icon for a nav destination, chosen by its href. */
export function navIcon(href: string): ReactNode {
  if (href === "/dashboard") return <IconDashboard />;
  if (href.startsWith("/map")) return <IconMap />;
  if (href.startsWith("/list")) return <IconList />;
  if (href.startsWith("/admin/floorplans")) return <IconFloorplan />;
  if (href.startsWith("/admin/assets")) return <IconImport />;
  if (href.startsWith("/admin/users")) return <IconUsers />;
  if (href.startsWith("/admin/roles")) return <IconRoles />;
  if (href.startsWith("/admin/audit")) return <IconAudit />;
  if (href.startsWith("/account")) return <IconAccount />;
  return <IconChevronRight />;
}
