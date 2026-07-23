import type { AuthUser } from "@/shared/types";
import type { PermissionCode } from "@/shared/constants/permissions";
import { MENU_CONFIG, type MenuItemConfig } from "./menuConfig";

export type MenuVisibilityContext = {
  user: AuthUser | null;
  hasPermission: (code: PermissionCode, editionId?: number | null) => boolean;
  isAdmin: boolean;
};

function matchesAccess(
  access: MenuItemConfig["access"],
  ctx: MenuVisibilityContext,
): boolean {
  const isAuthenticated = Boolean(ctx.user);

  if (access === "public") return true;
  if (access === "guest") return !isAuthenticated;
  if (access === "auth") return isAuthenticated;
  if (access === "admin") return ctx.isAdmin;

  if (access.startsWith("permission:")) {
    if (!isAuthenticated) return false;
    const code = access.slice("permission:".length) as PermissionCode;
    return ctx.hasPermission(code);
  }

  return false;
}

/** Returns menu items visible for the current auth/permission state. */
export function getVisibleMenuItems(
  ctx: MenuVisibilityContext,
  config: MenuItemConfig[] = MENU_CONFIG,
): MenuItemConfig[] {
  return config.filter((item) => {
    if (item.id === "manage" && ctx.isAdmin) return false;
    return matchesAccess(item.access, ctx);
  });
}
