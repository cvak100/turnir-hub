import { Navigate } from "react-router-dom";
import { useAuth } from "@/shared/auth";
import { StateMessage } from "@/shared/components";

export function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <StateMessage variant="loading" />;
  }

  return <Navigate to={user ? "/dashboard" : "/tournaments"} replace />;
}
