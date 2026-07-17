import type { PermissionCode } from "@/shared/constants/permissions";

export type MenuAccess =
  | "public"
  | "guest"
  | "auth"
  | "admin"
  | `permission:${PermissionCode}`;

export type MenuItemConfig = {
  id: string;
  label: string;
  access: MenuAccess;
  /** Route path for navigation items */
  path?: string;
  /** Special actions that are not routes */
  action?: "logout";
};

/**
 * Single source of truth for primary site navigation.
 * Visibility is decided by access rules, not role names.
 */
export const MENU_CONFIG: MenuItemConfig[] = [
  { id: "home", label: "Home", path: "/", access: "public" },
  { id: "tournaments", label: "Turnirji", path: "/tournaments", access: "public" },
  { id: "live", label: "Live", path: "/live", access: "public" },
  { id: "stats", label: "Statistika", path: "/stats", access: "public" },
  {
    id: "manage",
    label: "Upravljanje",
    path: "/manage",
    access: "permission:edition.manage",
  },
  {
    id: "dashboard_admin",
    label: "Dashboard Admin",
    path: "/dashboard_admin",
    access: "admin",
  },
  { id: "login", label: "Prijava", path: "/login", access: "guest" },
  { id: "account", label: "Moj račun", path: "/account", access: "auth" },
  { id: "logout", label: "Odjava", action: "logout", access: "auth" },
];
