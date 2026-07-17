import { Navigate, Outlet, useLocation } from "react-router-dom";
import { StateMessage } from "@/shared/components";
import { useAuth } from "@/shared/auth";

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <StateMessage variant="loading" message="Checking session…" />;
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
