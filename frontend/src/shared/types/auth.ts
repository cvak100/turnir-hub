import type { PermissionCode } from "@/shared/constants/permissions";

export interface UserRole {
  role: string;
  tournament_edition_id: number | null;
  permissions: PermissionCode[];
}

export interface AuthPerson {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
}

export interface AuthUser {
  id: number;
  username: string;
  is_superuser: boolean;
  roles: UserRole[];
  person: AuthPerson | null;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}
