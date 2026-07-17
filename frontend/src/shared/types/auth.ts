import type { PermissionCode } from "@/shared/constants/permissions";

export interface UserRole {
  role: string;
  tournament_edition_id: number | null;
  permissions: PermissionCode[];
}

export interface AuthUser {
  id: number;
  username: string;
  is_superuser: boolean;
  roles: UserRole[];
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}
