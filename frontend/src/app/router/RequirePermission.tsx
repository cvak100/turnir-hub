import { Navigate, Outlet } from "react-router-dom";
import { StateMessage } from "@/shared/components";
import { useAuth } from "@/shared/auth";
import type { PermissionCode } from "@/shared/constants/permissions";

type Props = {
  code: PermissionCode;
  editionId?: number | null;
};

export function RequirePermission({ code, editionId }: Props) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return <StateMessage variant="loading" message="Checking permissions…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(code, editionId)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
