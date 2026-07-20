import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  clearTokens,
  getAccessToken,
  setUnauthorizedHandler,
  setTokens,
} from "@/shared/api";
import type { PermissionCode } from "@/shared/constants/permissions";
import type { AuthUser } from "@/shared/types";
import { authService } from "@/modules/auth/services/authService";
import { AuthContext } from "./AuthContext";

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const refreshMe = useCallback(async () => {
    const me = await authService.me();
    setUser(me.user);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearTokens();
      setUser(null);
      navigate("/login", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const me = await authService.me();
        if (!cancelled) setUser(me.user);
      } catch {
        clearTokens();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const tokens = await authService.login(username, password);
      setTokens(tokens.access, tokens.refresh);
      const me = await authService.me();
      setUser(me.user);
    },
    [],
  );

  const hasPermission = useCallback(
    (code: PermissionCode, editionId?: number | null) => {
      if (!user) return false;
      if (user.is_superuser) return true;

      // No / unknown edition → allow if any role grants the permission.
      if (editionId == null) {
        return user.roles.some((role) => role.permissions.includes(code));
      }

      return user.roles.some((role) => {
        const editionOk =
          role.tournament_edition_id === null ||
          role.tournament_edition_id === editionId;
        return editionOk && role.permissions.includes(code);
      });
    },
    [user],
  );

  const isAdmin = Boolean(
    user && (user.is_superuser || hasPermission("admin.full_access")),
  );

  const value = useMemo(
    () => ({
      user,
      roles: user?.roles ?? [],
      loading,
      isAdmin,
      login,
      logout,
      hasPermission,
      refreshMe,
    }),
    [user, loading, isAdmin, login, logout, hasPermission, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
