import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";

export type PermissionItem = {
  id: number;
  name: string;
  code: string;
  description: string;
};

export type RoleItem = {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  permissions: PermissionItem[];
  permission_ids: number[];
};

export type RoleWriteInput = {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  permission_ids?: number[];
};

export type AuthUserBrief = {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
};

export type UserRoleItem = {
  id: number;
  user: number;
  user_username: string;
  role: number;
  role_name: string;
  role_slug: string;
  tournament_edition: number | null;
  tournament_edition_name?: string | null;
  created_at: string;
};

export type UserRoleCreateInput = {
  user: number;
  role: number;
  tournament_edition?: number | null;
};

export const rbacService = {
  listPermissions() {
    return api.get<PermissionItem[]>("/permissions/");
  },

  listRoles() {
    return api.get<RoleItem[]>("/roles/");
  },

  updateRole(id: number, data: Partial<RoleWriteInput>) {
    return api.patch<RoleItem>(`/roles/${id}/`, data);
  },

  listUsers() {
    return api.get<AuthUserBrief[]>("/auth-users/");
  },

  listUserRoles(params?: QueryParams) {
    return api.get<PaginatedResponse<UserRoleItem> | UserRoleItem[]>(
      "/user-roles/",
      { params: { page_size: 200, ...params } },
    );
  },

  createUserRole(data: UserRoleCreateInput) {
    return api.post<UserRoleItem>("/user-roles/", data);
  },

  deleteUserRole(id: number) {
    return api.delete<void>(`/user-roles/${id}/`);
  },
};
