import { createContext } from "react";
import type { AuthUser } from "@/shared/types";
import type { PermissionCode } from "@/shared/constants/permissions";

export type AuthContextValue = {
  user: AuthUser | null;
  roles: AuthUser["roles"];
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (code: PermissionCode, editionId?: number | null) => boolean;
  refreshMe: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
