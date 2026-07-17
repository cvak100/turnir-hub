import { Navigate, Outlet } from "react-router-dom";
import { StateMessage } from "@/shared/components";
import { useAuth } from "@/shared/auth";

/** Requires superuser or admin.full_access */
export function RequireAdmin() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <StateMessage variant="loading" message="Checking permissions…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
